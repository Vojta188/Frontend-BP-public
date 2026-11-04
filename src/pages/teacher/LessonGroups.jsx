import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createLessonGroupApi, deleteLessonGroupApi, getLessonEditorOptionsApi, getLessonGroupsApi, updateLessonGroupApi } from "../../api/endpoints";

const emptyGroup = () => ({ name: "", grade: "", education_level: "unspecified" });
export default function LessonGroups() {
  const [groups, setGroups] = useState([]);
  const [options, setOptions] = useState(null);
  const [draft, setDraft] = useState(emptyGroup);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    Promise.all([getLessonGroupsApi(), getLessonEditorOptionsApi()])
      .then(([result, settings]) => { if (!cancelled) { setGroups(result); setOptions(settings); } })
      .catch((caught) => { if (!cancelled) setError(caught.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  async function mutate(action) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setMessage("");
    try { await action(); setGroups(await getLessonGroupsApi()); }
    catch (caught) { setError(caught.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function save(event) {
    event.preventDefault();
    mutate(async () => {
      if (editingId) await updateLessonGroupApi(editingId, draft); else await createLessonGroupApi(draft);
      setMessage(editingId ? "Skupina byla upravena." : "Skupina byla vytvořena. Nyní do ní můžeš zařadit lekce.");
      setDraft(emptyGroup()); setEditingId(null);
    });
  }
  function remove(group) {
    if (!window.confirm(`Odstranit skupinu „${group.name}“? Její lekce i výsledky zůstanou zachované bez zařazení.`)) return;
    mutate(async () => { await deleteLessonGroupApi(group.id); setMessage("Skupina byla odstraněna, lekce zůstaly zachované."); if (editingId === group.id) { setEditingId(null); setDraft(emptyGroup()); } });
  }
  const change = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return <div className="groupsPage">
    {error && <div className="error" role="alert">{error}<button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={busy || loading}>Zkusit načíst znovu</button></div>}
    {message && <div className="ok" role="status">{message}</div>}
    <section className="card"><h3>{editingId ? "Upravit třídu" : "Nová třída"}</h3><form className="form" onSubmit={save}><fieldset className="editorFields" disabled={busy || !options}>
      <label htmlFor="group-name">Název</label><input id="group-name" required minLength={2} maxLength={100} placeholder="Například 7. třída" value={draft.name} onChange={(event) => change("name", event.target.value)} />
      <div className="grid2"><div><label htmlFor="group-grade">Ročník</label><input id="group-grade" type="number" min="1" max="13" value={draft.grade} onChange={(event) => change("grade", event.target.value)} /></div><div><label htmlFor="group-education">Stupeň vzdělávání</label><select id="group-education" value={draft.education_level} onChange={(event) => change("education_level", event.target.value)}>{options?.educationLevels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}</select></div></div>
      <div className="btnRow"><button className="primary" disabled={busy || !options}>{busy ? "Ukládám…" : editingId ? "Uložit skupinu" : "Vytvořit skupinu"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyGroup()); }}>Zrušit úpravy</button>}</div>
    </fieldset></form></section>
    <section className="card"><h3>Moje skupiny</h3>{loading && <p role="status">Načítám skupiny…</p>}<div className="tableWrap"><table className="tableModern"><thead><tr><th>Název</th><th>Ročník / stupeň</th><th>Lekcí</th><th>Akce</th></tr></thead><tbody>
      {groups.map((group) => <tr key={group.id}><td><strong>{group.name}</strong></td><td>{group.grade ? `${group.grade}. ročník · ` : ""}{options?.educationLevels.find((level) => level.id === group.education_level)?.label || "Nespecifikováno"}</td><td>{group.lesson_count}</td><td><div className="actionsModern"><Link className="linkBtn" to={`/ucitel?skupina=${group.id}`}>Zobrazit lekce</Link><Link className="linkBtn" to={`/ucitel/vytvorit?skupina=${group.id}`}>Nová lekce ve skupině</Link><button type="button" disabled={busy} onClick={() => { setEditingId(group.id); setDraft({ name: group.name, grade: group.grade ?? "", education_level: group.education_level }); }}>Upravit</button><button type="button" className="btnDangerSoft" disabled={busy} onClick={() => remove(group)}>Odstranit skupinu</button></div></td></tr>)}
      {!loading && !groups.length && <tr><td colSpan="4">Zatím nemáš žádnou skupinu. Vytvoř první pomocí formuláře výše.</td></tr>}
    </tbody></table></div></section>
  </div>;
}
