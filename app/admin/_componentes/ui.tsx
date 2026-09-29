"use client";

import { useState } from "react";

// Piezas del dashboard, recuperadas del admin del commit c13f935.

export const fmtDate = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === "") return "—";
  try {
    return new Date(v).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
};

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (r.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Sesión vencida.");
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(d.error || "Error al consultar.");
  return d as T;
}

export function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "var(--cream)" }}>
      <div style={{ maxWidth: wide ? 1100 : 420, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

export function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-bold"
      style={{
        border: "2.5px solid var(--dark)",
        background: active ? "var(--rosa)" : "white",
        color: active ? "white" : "var(--dark)",
        boxShadow: active ? "2px 2px 0 var(--dark)" : "none",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Spinner() {
  return <div className="w-6 h-6 border-[3px] border-opportuni-rosa border-t-transparent rounded-full animate-spin" />;
}

export function SubTable<T>({
  rows,
  cols,
  render,
  empty,
}: {
  rows: T[];
  cols: string[];
  render: (s: T) => React.ReactNode[];
  empty: string;
}) {
  if (!rows.length) return <p className="text-sm text-gray-500 py-8 text-center">{empty}</p>;
  return (
    <div className="bento overflow-x-auto" style={{ background: "white", padding: 0 }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--cream2)" }}>
            {cols.map((c, i) => (
              <th key={`${c}-${i}`} className="text-left font-mono text-[11px] uppercase px-3 py-2" style={{ color: "var(--nar)" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={i} style={{ borderTop: "1px solid #eee" }}>
              {render(s).map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ onClose, width = 560, children }: { onClose: () => void; width?: number; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bento"
        style={{ background: "var(--cream)", width: `min(94vw, ${width}px)`, maxHeight: "90vh", overflowY: "auto", padding: 24, position: "relative" }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{ position: "absolute", top: 12, right: 14, border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: "var(--dark)", lineHeight: 1 }}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-mono font-bold uppercase mb-0.5" style={{ color: "var(--nar)" }}>
        {label}
      </p>
      <p className="text-sm whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{ border: "2px solid var(--dark)", background: "white", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
    >
      {copied ? "✓ Copiado" : label}
    </button>
  );
}

export const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-bold mb-1">{children}</label>
);
