/**
 * Suivi des candidatures : ajout / modification, relances, export et import JSON.
 * Tout reste sur l'appareil.
 */
import { useState } from 'preact/hooks';
import {
  addDays, APPLICATION_STATUSES, DEFAULT_FOLLOW_UP_DAYS, dueFollowUps, exportApplications, formatDate,
  mergeApplications, newId, parseImport, sortApplications, type Application, type ApplicationStatus,
} from '@verijob/core';
import { Badge } from '../components/common';
import { STRINGS as S, tr, useLang } from '../i18n';
import { loadApplications, saveApplications, upsertApplication, useApplications } from '../store';

const todayIso = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

const STATUS_KIND: Record<ApplicationStatus, string> = {
  'a-envoyer': 'info', envoyee: 'info', relancee: 'info', entretien: 'ok', offre: 'ok', refus: 'eleve', abandon: 'info',
};

function blank(): Application {
  const d = todayIso();
  return { id: newId(), employer: '', job: '', date: d, status: 'a-envoyer', followUp: addDays(d, DEFAULT_FOLLOW_UP_DAYS), updatedAt: nowIso() };
}

function Editor({ initial, onDone }: { initial: Application; onDone: () => void }) {
  const lang = useLang();
  const [a, setA] = useState(initial);
  const field = (k: keyof Application) => (e: Event) => setA({ ...a, [k]: (e.target as HTMLInputElement).value || undefined });
  return (
    <form class="panel" onSubmit={(e) => {
      e.preventDefault();
      if (!a.employer?.trim()) return;
      void upsertApplication({ ...a, employer: a.employer.trim(), job: (a.job ?? '').trim(), updatedAt: nowIso() }).then(onDone);
    }}>
      <h2>{tr(initial.employer ? S.editApplication : S.addApplication, lang)}</h2>
      <label>{tr(S.fieldEmployer, lang)}<input required value={a.employer} onInput={field('employer')} /></label>
      <label>{tr(S.fieldJob, lang)}<input value={a.job} onInput={field('job')} /></label>
      <div class="grid2">
        <label>{tr(S.fieldDate, lang)}<input type="date" required value={a.date} onInput={field('date')} /></label>
        <label>{tr(S.fieldFollowUp, lang)}<input type="date" value={a.followUp ?? ''} onInput={field('followUp')} /></label>
      </div>
      <label>{tr(S.fieldStatus, lang)}
        <select value={a.status} onChange={(e) => setA({ ...a, status: (e.target as HTMLSelectElement).value as ApplicationStatus })}>
          {APPLICATION_STATUSES.map((s) => <option value={s}>{tr(S.appStatus[s], lang)}</option>)}
        </select>
      </label>
      <label>{tr(S.fieldContact, lang)}<input value={a.contact ?? ''} onInput={field('contact')} /></label>
      <label>{tr(S.fieldNotes, lang)}<textarea rows={3} value={a.notes ?? ''} onInput={field('notes')} /></label>
      <div class="row">
        <button type="submit" class="primary">{tr(S.save, lang)}</button>
        <button type="button" onClick={onDone}>{tr(S.cancel, lang)}</button>
      </div>
    </form>
  );
}

export function Tracking() {
  const lang = useLang();
  const apps = useApplications();
  const [editing, setEditing] = useState<Application>();
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const today = todayIso();
  const due = dueFollowUps(apps, today);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportApplications(apps), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `verijob-candidatures-${today}.json` });
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const doImport = async (file: File) => {
    const r = parseImport(await file.text());
    if (!r.ok) { setMsg({ ok: false, text: tr(S.importBad, lang) }); return; }
    const m = mergeApplications(await loadApplications(), r.applications);
    await saveApplications(m.merged);
    setMsg({ ok: true, text: tr(S.importDone, lang).replace('{added}', String(m.added)).replace('{updated}', String(m.updated)).replace('{rejected}', String(r.rejected)) });
  };
  const followedUp = (a: Application) => void upsertApplication({ ...a, status: 'relancee', followUp: addDays(today, DEFAULT_FOLLOW_UP_DAYS), updatedAt: nowIso() });
  const remove = (a: Application) => {
    if (confirm(tr(S.confirmDelete, lang))) void saveApplications(apps.filter((x) => x.id !== a.id));
  };

  return (
    <section>
      <h1>{tr(S.trackingTitle, lang)}</h1>
      <p class="callout">{tr(S.trackingPrivacy, lang)}</p>
      <div class="row">
        <button type="button" class="primary" onClick={() => setEditing(blank())}>{tr(S.addApplication, lang)}</button>
        <button type="button" onClick={doExport} disabled={!apps.length}>{tr(S.exportJson, lang)}</button>
        <label class="button">{tr(S.importJson, lang)}
          <input type="file" accept="application/json,.json" class="sr-only" onChange={(e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) void doImport(f);
            (e.target as HTMLInputElement).value = '';
          }} />
        </label>
      </div>
      {msg && <p class={msg.ok ? 'ok' : 'alert'} role="status">{msg.text}</p>}
      {editing && <Editor initial={editing} onDone={() => setEditing(undefined)} />}
      {due.length > 0 && <p class="warn"><strong>{due.length} {tr(S.trackingDue, lang)}</strong></p>}
      {!apps.length && !editing && <p class="muted">{tr(S.trackingEmpty, lang)}</p>}

      {sortApplications(apps, today).map((a) => {
        const isDue = due.includes(a);
        return (
          <article class={`card-result ${isDue ? 'sev-moyen' : ''}`}>
            <div class="route-head"><strong>{a.employer}</strong><Badge kind={STATUS_KIND[a.status]}>{tr(S.appStatus[a.status], lang)}</Badge></div>
            {a.job && <p>{a.job}</p>}
            <p class="muted">{tr(S.fieldDate, lang)} : {formatDate(a.date, lang)}{a.followUp ? ` — ${tr(S.fieldFollowUp, lang)} ${formatDate(a.followUp, lang)}` : ''}</p>
            {isDue && <p class="warn">{tr(S.followUpDue, lang)}</p>}
            {a.verification && (
              <p class="muted">
                {a.verification.lmiaFound && <Badge kind="ok">{tr(S.verifLmia, lang)}</Badge>}{' '}
                {a.verification.designated && <Badge kind="ok">{tr(S.verifDesignated, lang)}</Badge>}{' '}
                {a.verification.scamSignals !== undefined && <Badge kind={a.verification.scamSignals ? 'eleve' : 'info'}>{a.verification.scamSignals} {tr(S.verifSignals, lang)}</Badge>}
              </p>
            )}
            {a.contact && <p class="muted">{a.contact}</p>}
            {a.notes && <p>{a.notes}</p>}
            <div class="row">
              {isDue && <button type="button" class="primary" onClick={() => followedUp(a)}>{tr(S.markFollowedUp, lang)}</button>}
              <button type="button" onClick={() => { setEditing(a); scrollTo(0, 0); }}>{tr(S.edit, lang)}</button>
              <button type="button" onClick={() => remove(a)}>{tr(S.delete, lang)}</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
