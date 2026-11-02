/**
 * Salons de recrutement : état des inscriptions relevé chaque semaine sur la page officielle (events-status.json).
 * « Inscriptions ouvertes » n'apparaît que si la phrase officielle est sur la page ; les liens sont ceux de la page.
 */
import { useEffect, useState } from 'preact/hooks';
import { formatDate } from '@verijob/core';
import { loadEventsStatus, rules, type EventStatus } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';

const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;

export function useEventsStatus(): EventStatus[] {
  const [list, setList] = useState<EventStatus[]>([]);
  useEffect(() => { loadEventsStatus().then((f) => setList(f.data)).catch(() => undefined); }, []);
  return list;
}

/** Alerte « inscriptions ouvertes » d'un salon, avec les liens officiels d'inscription. */
export function EventOpen({ status, lang }: { status?: EventStatus; lang: Lang }) {
  if (!status || status.state === 'ferme' || status.state === 'inconnu') return null;
  if (status.state === 'a-verifier') return <p class="callout">{tr(S.eventMaybeNew, lang)} <a href={status.url} {...ext}>↗</a></p>;
  return (
    <div class="callout">
      <p><strong>🔔 {tr(S.eventOpen, lang)}</strong> <span class="muted">({tr(S.eventCheckedOn, lang)} {formatDate(status.checkedAt, lang)})</span></p>
      {status.links.length > 0 && (
        <div class="row">
          {status.links.map((l) => <a class="button primary" href={l.url} {...ext}>{tr(S.eventRegister, lang)} — {l.label} ↗</a>)}
        </div>
      )}
      <p class="muted">{tr(S.eventFree, lang)}</p>
    </div>
  );
}

/** Bandeau de la Veille : tous les salons dont les inscriptions sont ouvertes. */
export function OpenEventsBanner({ lang }: { lang: Lang }) {
  const list = useEventsStatus().filter((s) => s.state === 'ouvert');
  if (!list.length) return null;
  return (
    <>
      {list.map((s) => {
        const e = rules.opportunities.events.find((x) => x.id === s.id);
        return (
          <article class="card-result">
            <h3>{e ? (lang === 'fr' ? e.nameFr : e.nameEn) : s.id}</h3>
            {e && <p class="muted">{lang === 'fr' ? e.statusFr : e.statusEn}</p>}
            <EventOpen status={s} lang={lang} />
          </article>
        );
      })}
    </>
  );
}
