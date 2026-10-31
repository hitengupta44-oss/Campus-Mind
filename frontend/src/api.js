// The backend base URL comes from the Vercel environment variable VITE_API_BASE_URL (set at build time),
// e.g. https://<hf-user>-<space-name>.hf.space . For local dev you can also type it into the box in the header.
const BUILD_TIME_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const KEY = "campusmind.apiBase";

export function getBase() {
  let saved = "";
  try { saved = localStorage.getItem(KEY) || ""; } catch { /* storage unavailable */ }
  return (BUILD_TIME_URL || saved).replace(/\/+$/, "");
}
export const baseIsFixed = Boolean(BUILD_TIME_URL);
export function setBase(url) {
  try { localStorage.setItem(KEY, url.trim()); } catch { /* ignore */ }
}

export async function api(method, path, userId, body) {
  const base = getBase();
  if (!base) throw new Error("Backend URL is not configured (set VITE_API_BASE_URL in Vercel).");
  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(userId ? { "X-User-Id": String(userId) } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(`Cannot reach the backend at ${base}. Is the Space awake, and does CORS_ORIGINS include this site? (${e.message})`);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) {
    const detail = data?.detail;
    throw new Error(`${res.status}: ${typeof detail === "string" ? detail : JSON.stringify(detail ?? text)}`);
  }
  return data;
}

// Starting payloads for each human checkpoint (same contract as the backend's resume endpoint).
export const TEMPLATES = {
  ask_student: { answers: "", skip: false },
  student_verify: { verified: true, reason: "" },
  human_triage: { department: "IT and Network" },
  staff_accept: { accepted: true, reason: "" },
  staff_findings: { hypothesis_confirmed: false, confirmed_cause: "", actions: [], evidence: [] },
  record_resolution: { resolution_notes: "" },
  lesson_review: { decision: "approve", rationale: "" },
  safety_escalation: { notes: "" },
};
