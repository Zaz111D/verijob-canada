/**
 * Salons de recrutement (Destination Canada Forum Mobilité, Journées Québec) : chaque semaine, on relit la page
 * officielle et on repère les phrases officielles « inscriptions ouvertes » / « fermées », sans rien deviner.
 * L'appli affiche alors une alerte dans la Veille et dans « Où postuler », avec les liens d'inscription officiels.
 *
 * Produit : apps/pwa/public/data/events-status.json
 */
import { normalize, type OpportunityEvent, type Rules } from '../packages/core/src';
import { USER_AGENT } from './lib/http';
import { writeDataFile, type WrittenFile } from './lib/output';
import { pageLinks } from './check-region-lists';

/** ouvert / ferme : phrase officielle trouvée ; a-verifier : la phrase « fermé » a disparu ; inconnu : page illisible. */
export type EventState = 'ouvert' | 'ferme' | 'a-verifier' | 'inconnu';
export interface EventStatus { id: string; url: string; state: EventState; links: Array<{ label: string; url: string }>; checkedAt: string }
export interface EventsStats { checked: number; open: string[]; toCheck: string[]; file: WrittenFile }

const text = (html: string) => normalize(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&#39;|&rsquo;|&#8217;/g, "'").replace(/&nbsp;|&#160;/g, ' ')).replace(/\s+/g, ' ');

/** État d'un salon d'après le texte de sa page officielle. */
export function eventState(html: string, check: NonNullable<OpportunityEvent['check']>): EventState {
  let t = text(html);
  if (t.length < 200) return 'inconnu';
  if (check.section) {
    const [a, b] = check.section.map((x) => normalize(x));
    // Dernière occurrence : la première est souvent dans la table des matières (« Sur cette page »).
    const i = t.lastIndexOf(a!);
    if (i < 0) return 'inconnu';
    const j = t.indexOf(b!, i + a!.length);
    t = t.slice(i, j < 0 ? undefined : j);
  }
  if (check.open && t.includes(normalize(check.open))) return 'ouvert';
  if (check.closed && t.includes(normalize(check.closed))) return 'ferme';
  return check.closed && !check.open ? 'a-verifier' : 'inconnu';
}

/** Liens d'inscription officiels (ex. formulaires du gouvernement du Canada), avec leur libellé (ville). */
export function registrationLinks(html: string, base: string, pattern: string): Array<{ label: string; url: string }> {
  const seen = new Set<string>();
  return pageLinks(html, base).filter((l) => l.href.includes(pattern) && /^https:\/\//.test(l.href) && !seen.has(l.href) && seen.add(l.href))
    .map((l) => ({ label: l.text, url: l.href }));
}

export async function checkEvents(rules: Rules, today: string): Promise<EventsStats> {
  console.log('▶ Salons de recrutement : inscriptions ouvertes ?');
  const out: EventStatus[] = [];
  for (const e of rules.opportunities.events) {
    if (!e.check) continue;
    let state: EventState = 'inconnu';
    let links: EventStatus['links'] = [];
    try {
      const res = await fetch(e.check.url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
      if (res.ok) {
        const html = await res.text();
        state = eventState(html, e.check);
        if (state === 'ouvert' && e.check.links) links = registrationLinks(html, res.url, e.check.links);
      }
    } catch { /* page injoignable : inconnu */ }
    out.push({ id: e.id, url: e.check.url, state, links, checkedAt: today });
    console.log(`  ${e.id} : ${state}${links.length ? ` (${links.map((l) => l.label).join(', ')})` : ''}`);
  }
  const file = writeDataFile('events-status.json', {
    name: 'Salons de recrutement — inscriptions ouvertes ou non (pages officielles)',
    publisher: 'IRCC (canada.ca) et gouvernement du Québec — relevé automatique VériJob',
    url: rules.sources['ircc-destination-canada']?.urlFr ?? 'https://www.canada.ca/',
    licence: 'Résultats du contrôle et liens officiels seulement',
  }, out.length, out);
  return { checked: out.length, open: out.filter((o) => o.state === 'ouvert').map((o) => o.id), toCheck: out.filter((o) => o.state === 'a-verifier').map((o) => o.id), file };
}
