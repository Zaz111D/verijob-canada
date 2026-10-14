/**
 * Comment joindre un employeur, sans jamais deviner d'adresse e-mail :
 * - ses offres actuelles sur le Guichet-Emplois (chaque offre indique la façon officielle de postuler) ;
 * - son site officiel (recherche) ;
 * - sa ville et son code postal publiés par EDSC, sur une carte.
 */
import { employerSearchName, jobBankLink } from '@verijob/core';
import { rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function websiteSearchUrl(name: string, city: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(`${employerSearchName(name)} ${city} Canada`)}`;
}

export function ContactLinks({ name, city, province, postal, lang }: { name: string; city: string; province?: string; postal?: string; lang: Lang }) {
  const jb = jobBankLink(rules, { keyword: employerSearchName(name) });
  const place = [city, province, postal, 'Canada'].filter(Boolean).join(', ');
  return (
    <div class="row">
      <a class="button" href={jb.url} {...ext}>{tr(S.employerJobs, lang)} ↗</a>
      <a class="button" href={websiteSearchUrl(name, city)} {...ext}>{tr(S.findWebsite, lang)} ↗</a>
      {city && <a class="button" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(place)}`} {...ext}>{tr(S.seeOnMap, lang)} ↗</a>}
    </div>
  );
}

/** À afficher une fois au-dessus d'une liste d'employeurs. */
export function HowToApply({ lang }: { lang: Lang }) {
  return <p class="callout">{tr(S.howToApply, lang)}</p>;
}
