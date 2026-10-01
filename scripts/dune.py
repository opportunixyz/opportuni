#!/usr/bin/env python3
"""Crea o actualiza en Dune las queries de analytics/dune y guarda sus IDs en
analytics/dune/queries.json. Lee API_DUNE de .env (solo local, nunca en el repo).
Uso: python3 scripts/dune.py"""
import json, os, sys, time, urllib.request
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(RAIZ, "analytics", "dune")
K = next(l.split("=", 1)[1].strip().strip('"').strip("'") for l in open(os.path.join(RAIZ, ".env")) if l.startswith("API_DUNE="))
def req(method, path, body=None):
    r = urllib.request.Request("https://api.dune.com/api/v1" + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"X-DUNE-API-KEY": K, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=60) as f: return json.load(f)
    except urllib.error.HTTPError as e: sys.exit(f"HTTP {e.code} en {path}: {e.read().decode()[:400]}")
QUERIES = [  # (archivo, nombre en Dune)
    ("cuentas", "Opportuni Passport · Stellar accounts"),
    ("credenciales", "Opportuni Passport · credentials"),
    ("resumen", "Opportuni Passport · summary"),
    ("cuentas_por_dia", "Opportuni Passport · accounts per day"),
    ("credenciales_por_semana", "Opportuni Passport · credentials per week"),
    ("comisiones", "Opportuni Passport · transactions and fees"),
]
ruta_ids = os.path.join(D, "queries.json")
ids = json.load(open(ruta_ids)) if os.path.exists(ruta_ids) else {}
for archivo, nombre in QUERIES:
    sql = open(os.path.join(D, archivo + ".sql")).read()
    for k, v in ids.items(): sql = sql.replace("{{" + k + "}}", str(v))
    if "{{" in sql: sys.exit(f"{archivo}: falta un ID")
    if archivo in ids:
        req("PATCH", f"/query/{ids[archivo]}", {"name": nombre, "query_sql": sql})
        print("actualizada", archivo, ids[archivo])
    else:
        ids[archivo] = req("POST", "/query", {"name": nombre, "query_sql": sql, "is_private": False})["query_id"]
        print("creada", archivo, ids[archivo])
    json.dump(ids, open(ruta_ids, "w"), indent=2)
# Correr cada una para que el dashboard tenga resultados y revisar que no falle.
for archivo, _ in QUERIES:
    eid = req("POST", f"/query/{ids[archivo]}/execute", {"performance": "medium"})["execution_id"]
    t0 = time.time()
    while True:
        s = req("GET", f"/execution/{eid}/status")
        if s.get("is_execution_finished") or time.time() - t0 > 280: break
        time.sleep(3)
    if s.get("state") != "QUERY_STATE_COMPLETED":
        print("FALLÓ", archivo, s.get("state"), json.dumps(s.get("error"))[:500]); continue
    r = req("GET", f"/execution/{eid}/results?limit=5")["result"]
    print(f"ok {archivo}: {r['metadata']['total_row_count']} filas", json.dumps(r["rows"][:2], ensure_ascii=False)[:300])
