import { useCallback, useEffect, useRef, useState } from "react";
import { api, baseIsFixed, getBase, setBase, TEMPLATES } from "./api.js";

const pretty = (v) => JSON.stringify(v, null, 2);

function Pending({ p }) {
  if (!p) return <p className="muted">Nothing is waiting on a human.</p>;
  return (
    <div>
      <p><b>Waiting for:</b> <code>{p.checkpoint}</code></p>
      <pre>{pretty(p).slice(0, 4000)}</pre>
    </div>
  );
}

function Detail({ d }) {
  if (!d) return null;
  return (
    <div className="card">
      <h3>{d.ref}: {d.status}</h3>
      <ul className="timeline">
        {d.timeline.map((t, i) => (
          <li key={i}><code>{t.at.slice(11, 19)}</code> <b>{t.type}</b>: {t.message}</li>
        ))}
      </ul>
      {d.ai?.hypotheses && (
        <>
          <p><b>AI hypotheses (NOT confirmed; AI-generated)</b></p>
          <pre>{pretty(d.ai.hypotheses).slice(0, 3000)}</pre>
          <p className="muted">Retrieval status: <code>{String(d.ai.retrieval_status)}</code></p>
        </>
      )}
      <Pending p={d.pending} />
    </div>
  );
}

function Raise({ uid, onError }) {
  const [text, setText] = useState("");
  const [mekoOn, setMekoOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [ref, setRef] = useState("");
  const [detail, setDetail] = useState(null);

  async function submit() {
    setBusy(true); onError("");
    try {
      const r = await api("POST", "/api/workflow/submit", uid, { text, meko_enabled: mekoOn });
      setResult(r); setRef(r.ref);
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }
  async function track() {
    onError("");
    try { setDetail(await api("GET", `/api/workflow/${ref.trim()}`, uid)); } catch (e) { onError(e.message); }
  }
  return (
    <section>
      <label>What is wrong? (your own words)
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Wi-Fi has stopped working in the Computer Science block. It has been disconnecting since morning." />
      </label>
      <label className="row"><input type="checkbox" checked={mekoOn} onChange={(e) => setMekoOn(e.target.checked)} />
        Meko memory ON (untick to run the Meko OFF comparison)</label>
      <button className="primary" disabled={busy || text.trim().length < 10} onClick={submit}>
        {busy ? "Submitting… (the agents are working)" : "Submit"}
      </button>
      {result && (
        <div className="card">
          <p><b>Your grievance ID: <code>{result.ref}</code></b> (Meko {mekoOn ? "ON" : "OFF"})</p>
          <Pending p={result.pending} />
        </div>
      )}
      <div className="row">
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="GRV-XXXXXXXX" />
        <button onClick={track} disabled={!ref.trim()}>Track status</button>
      </div>
      <Detail d={detail} />
    </section>
  );
}

function Inbox({ uid, onError }) {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState("");
  const [detail, setDetail] = useState(null);
  const [payload, setPayload] = useState("{}");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    onError("");
    try { setItems(await api("GET", "/api/workflow/inbox", uid)); setSel(""); setDetail(null); setMsg(""); }
    catch (e) { onError(e.message); }
  }, [uid, onError]);
  useEffect(() => { if (uid) refresh(); }, [uid, refresh]);

  async function open(ref, cp) {
    setSel(ref); setMsg(""); onError("");
    setPayload(pretty(TEMPLATES[cp] || {}));
    try { setDetail(await api("GET", `/api/workflow/${ref}`, uid)); } catch (e) { onError(e.message); }
  }
  async function decide() {
    let value;
    try { value = JSON.parse(payload || "{}"); } catch (e) { onError(`Invalid JSON: ${e.message}`); return; }
    setBusy(true); onError("");
    try {
      const r = await api("POST", `/api/workflow/${sel}/resume`, uid, { value });
      setMsg(`Done. ${sel} is now "${r.status}".`);
      setItems(await api("GET", "/api/workflow/inbox", uid));
      setDetail(await api("GET", `/api/workflow/${sel}`, uid));
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  }
  return (
    <section>
      <div className="row"><button onClick={refresh}>Refresh inbox</button>
        <span className="muted">{items.length} item(s) waiting for you</span></div>
      <ul className="list">
        {items.map((i) => (
          <li key={i.ref}>
            <button className={sel === i.ref ? "sel" : ""} onClick={() => open(i.ref, i.pending.checkpoint)}>
              {i.ref} · {i.pending.checkpoint}
            </button>
          </li>
        ))}
      </ul>
      <Detail d={detail} />
      {sel && (
        <div className="card">
          <label>Your decision (edit the JSON, then submit)
            <textarea className="mono" rows={9} value={payload} onChange={(e) => setPayload(e.target.value)} />
          </label>
          <button className="primary" disabled={busy} onClick={decide}>{busy ? "Submitting…" : "Submit decision"}</button>
          {msg && <p className="ok">{msg}</p>}
        </div>
      )}
    </section>
  );
}

function Swarm({ uid, onError }) {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const timer = useRef(null);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const [s, e] = await Promise.all([
          api("GET", "/api/swarm/summary", uid),
          api("GET", "/api/swarm/events?limit=400", uid),
        ]);
        if (stop) return;
        setSummary(s); setEvents(e); onError("");
      } catch (err) { if (!stop) onError(err.message); }
      if (!stop) timer.current = setTimeout(tick, 4000);
    }
    tick();
    return () => { stop = true; clearTimeout(timer.current); };
  }, [uid, onError]);

  const per = {};
  for (const e of events) {
    const a = (per[e.actor] ||= { r: 0, w: 0, p: 0, err: 0 });
    if (e.type === "CONTEXT_RECALLED" || e.type === "KNOWLEDGE_RETRIEVED") a.r++;
    if (e.type === "MEMORY_WRITTEN") a.w++;
    if (e.type === "MEMORY_PROMOTED") a.p++;
    if (e.type === "TOOL_ERROR") a.err++;
  }
  return (
    <section>
      <p className="muted">Live board built only from logged backend/Meko events. Nothing here is simulated. (Staff, reviewers and leadership only.)</p>
      <div className="chips">
        {summary && Object.entries(summary).map(([k, v]) => (
          <div className="chip" key={k}><b>{v}</b><span>{k.replace("_", " ")}</span></div>
        ))}
      </div>
      <div className="chips">
        {Object.entries(per).map(([k, v]) => (
          <div className="chip wide" key={k}><b>{k}</b>
            <span>reads {v.r} · writes {v.w} · promoted {v.p}{v.err ? ` · errors ${v.err}` : ""}</span></div>
        ))}
      </div>
      <div className="scroll">
        <table>
          <thead><tr><th>#</th><th>time</th><th>type</th><th>actor</th><th>grievance</th><th>datapack</th><th>tool</th><th>result</th><th>summary</th></tr></thead>
          <tbody>
            {[...events].reverse().slice(0, 120).map((e) => (
              <tr key={e.id}>
                <td>{e.id}</td><td>{e.ts?.slice(11, 19)}</td><td>{e.type}</td><td>{e.actor}</td><td>{e.grievance_id}</td>
                <td>{e.datapack || ""}</td><td>{e.tool || ""}</td>
                <td className={e.success ? "" : "bad"}>{e.success ? "ok" : "FAILED"}</td><td>{e.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function App() {
  const [base, setBaseState] = useState(getBase());
  const [users, setUsers] = useState([]);
  const [uid, setUid] = useState("");
  const [sys, setSys] = useState(null);
  const [tab, setTab] = useState("raise");
  const [error, setError] = useState("");
  const onError = useCallback((m) => setError(m), []);

  useEffect(() => {
    if (!base) return;
    api("GET", "/api/demo-users").then((u) => { setUsers(u); if (u[0]) setUid(String(u[0].id)); })
      .catch((e) => setError(e.message));
  }, [base]);
  useEffect(() => {
    if (!uid) return;
    api("GET", "/api/system", uid).then(setSys).catch((e) => setError(e.message));
  }, [uid]);

  const fake = sys?.meko?.startsWith("FAKE");
  return (
    <main>
      <header>
        <h1>🧠 CampusMind</h1>
        <p className="muted">Campus grievances that resolve faster because the campus remembers.</p>
        {!baseIsFixed && (
          <div className="row">
            <input value={base} onChange={(e) => setBaseState(e.target.value)} placeholder="Backend URL, e.g. https://user-space.hf.space" />
            <button onClick={() => { setBase(base); setError(""); window.location.reload(); }}>Use</button>
          </div>
        )}
        <div className="row">
          <label className="row grow">Acting as (DEMO persona)
            <select value={uid} onChange={(e) => setUid(e.target.value)}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.id}: {u.name} ({u.role})</option>)}
            </select>
          </label>
        </div>
        {sys && (
          <p className={fake ? "warn" : "muted"}>
            Meko: <b>{sys.meko}</b>{fake && " ⚠️ DEMO MODE: Meko is a local test double"} · LLM chain: <b>{sys.llm_chain}</b> · All users are labelled DEMO data.
          </p>
        )}
      </header>
      <nav>
        {[["raise", "Raise a grievance"], ["inbox", "My inbox"], ["swarm", "Swarm view"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "sel" : ""} onClick={() => { setTab(k); setError(""); }}>{l}</button>
        ))}
      </nav>
      {error && <div className="error">{error}</div>}
      {uid && tab === "raise" && <Raise uid={uid} onError={onError} />}
      {uid && tab === "inbox" && <Inbox uid={uid} onError={onError} />}
      {uid && tab === "swarm" && <Swarm uid={uid} onError={onError} />}
    </main>
  );
}
