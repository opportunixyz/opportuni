import { put, list, get } from "@vercel/blob";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

// Server-only helper for CV + asesoría submissions. Stores to Vercel Blob
// (private) with a resilient fallback to ./uploads, and reads from both so the
// admin dashboard works even while Blob is unreachable.

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const BLOB_TIMEOUT = 12000;

export type SubmissionType = "cv" | "asesoria";

export interface Submission {
  type: SubmissionType;
  nombre: string;
  email: string;
  whatsapp: string;
  mensaje?: string;
  tema?: string;
  fileName?: string;
  pdf?: string; // download ref (filename), CV only
  submittedAt: number;
  source: "blob" | "local";
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ]);
}

const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "sub";
}

/** Persist a submission (JSON + optional PDF). Returns where it landed. */
export async function saveSubmission(
  type: SubmissionType,
  meta: Record<string, unknown>,
  pdf?: Buffer
): Promise<"blob" | "local"> {
  const stamp = Number(meta.submittedAt) || Date.now();
  const key = `${type}-${stamp}-${slugify(String(meta.nombre ?? "sub"))}`;
  const record = { ...meta, type, submittedAt: stamp, ...(pdf ? { pdf: `${key}.pdf` } : {}) };
  const json = JSON.stringify(record, null, 2);

  if (hasBlob()) {
    try {
      if (pdf) {
        await withTimeout(
          put(`${type}-submissions/${key}.pdf`, pdf, { access: "private", contentType: "application/pdf" }),
          BLOB_TIMEOUT, "blob pdf"
        );
      }
      await withTimeout(
        put(`${type}-submissions/${key}.json`, json, { access: "private", contentType: "application/json" }),
        BLOB_TIMEOUT, "blob json"
      );
      return "blob";
    } catch (e) {
      console.error("[submissions] Blob falló, fallback local:", e instanceof Error ? e.message : e);
    }
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  if (pdf) await writeFile(path.join(UPLOADS_DIR, `${key}.pdf`), pdf);
  await writeFile(path.join(UPLOADS_DIR, `${key}.json`), json);
  return "local";
}

/** List all submissions from ./uploads (local) + Blob (best-effort). */
export async function listSubmissions(): Promise<Submission[]> {
  const out: Submission[] = [];

  try {
    const files = await readdir(UPLOADS_DIR);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const m = JSON.parse(await readFile(path.join(UPLOADS_DIR, f), "utf8"));
        out.push({ ...m, source: "local" });
      } catch {
        /* skip bad file */
      }
    }
  } catch {
    /* no uploads dir yet */
  }

  if (hasBlob()) {
    for (const type of ["cv", "asesoria"] as SubmissionType[]) {
      try {
        const res = await withTimeout(list({ prefix: `${type}-submissions/` }), BLOB_TIMEOUT, "blob list");
        for (const b of res.blobs) {
          if (!b.pathname.endsWith(".json")) continue;
          try {
            const g = await withTimeout(get(b.pathname, { access: "private" }), BLOB_TIMEOUT, "blob get");
            if (g && g.statusCode === 200) {
              const m = JSON.parse(await new Response(g.stream).text());
              out.push({ ...m, source: "blob" });
            }
          } catch {
            /* skip */
          }
        }
      } catch {
        /* blob unreachable — local data still returned */
      }
    }
  }

  return out.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
}

/** Fetch a CV PDF (local first, then Blob) for the admin download endpoint. */
export async function getPdf(ref: string): Promise<{ body: BodyInit; filename: string } | null> {
  const safe = ref.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe.endsWith(".pdf")) return null;

  try {
    const buf = await readFile(path.join(UPLOADS_DIR, safe));
    return { body: new Uint8Array(buf), filename: safe };
  } catch {
    /* not local */
  }

  if (hasBlob()) {
    try {
      const g = await withTimeout(get(`cv-submissions/${safe}`, { access: "private" }), BLOB_TIMEOUT, "blob get pdf");
      if (g && g.statusCode === 200) return { body: g.stream, filename: safe };
    } catch {
      /* not in blob */
    }
  }
  return null;
}
