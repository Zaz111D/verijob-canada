/**
 * Autres pistes d'emploi (onglet Emplois), en MODE LIENS UNIQUEMENT :
 * sites d'offres avec recherche pré-remplie, salons de recrutement, réseaux, canaux à risque.
 * Rien n'est lu automatiquement sur ces sites ; tout le contenu vient de data/rules.json.
 */
import {
  findNoc, networks, PROVINCE_NAMES, recruitmentEvents, riskyChannels, searchLinks, type ProvinceCode,
} from '@verijob/core';
import { nocData, rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { Badge, Sources } from './common';

const today = () => new Date().toISOString().slice(0, 10);
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function Opportunities({ nocs, provinces, citizenship, lang }: { nocs: string[]; provinces: ProvinceCode[]; citizenship?: string; lang: Lang }) {
  const d = today();
  // Lieu de recherche : la 1re province visée (nom anglais, compris par les deux sites), sinon « Canada ».
  const location = provinces[0] ? PROVINCE_NAMES[provinces[0]].en : 'Canada';
  const keywords = nocs.map((code) => ({ code, n: findNoc(nocData, code) }));
  const sites = searchLinks(rules, { provinces });

  return (
    <>
      <h2>{tr(S.otherSitesTitle, lang)}</h2>
      <p class="muted">{tr(S.otherSitesIntro, lang)}</p>
      {sites.map((site) => (
        <article class="card-result">
          <h3>{site.name}</h3>
          <p class="muted">{site.note[lang]}</p>
          <div class="row">
            {keywords.length && rules.opportunities.searchSites.find((s) => s.id === site.id)?.template
              ? keywords.map(({ code, n }) => {
                // Hors Québec, les offres sont surtout rédigées en anglais : on cherche avec l'intitulé anglais.
                const kw = n?.jobEn ?? n?.titleEn ?? code;
                const link = searchLinks(rules, { keyword: kw, location, provinces }).find((l) => l.id === site.id)!;
                return <a class="button" href={link.url} {...ext}>{tr(S.searchFor, lang)} « {kw} » ↗</a>;
              })
              : <a class="button" href={site.url} {...ext}>{tr(S.openSite, lang)} ↗</a>}
          </div>
        </article>
      ))}

      <h2>{tr(S.eventsTitle, lang)}</h2>
      <p class="muted">{tr(S.eventsIntro, lang)}</p>
      {recruitmentEvents(rules, d).map((e) => (
        <article class="card-result">
          <h3>{e.name[lang]}</h3>
          <p>{e.audience[lang]}</p>
          <p class="muted">{e.status[lang]}</p>
          {e.old && <p class="warn">{tr(S.eventOld, lang)}</p>}
          <p><a href={e.source.url[lang]} {...ext}>{tr(S.officialPage, lang)} ↗</a></p>
          <Sources sources={[e.source]} />
        </article>
      ))}

      <h2>{tr(S.networksTitle, lang)}</h2>
      {networks(rules, d, citizenship).map((n) => (
        <article class="card-result">
          <div class="route-head"><strong>{n.name[lang]}</strong>{n.forYourCountry && <Badge kind="ok">{tr(S.forYourCountry, lang)}</Badge>}</div>
          <p>{n.detail[lang]}</p>
          <p>
            {n.internal
              ? <a href={n.internal}>{tr(S.navProspects, lang)} →</a>
              : <a href={n.url[lang]} {...ext}>{tr(S.officialPage, lang)} ↗</a>}
          </p>
          <Sources sources={[n.source]} />
        </article>
      ))}

      <h2>{tr(S.riskyTitle, lang)}</h2>
      {riskyChannels(rules, d).map((r) => (
        <article class="card-result sev-moyen">
          <h3>{r.name[lang]}</h3>
          <p>{r.detail[lang]}</p>
          <p><a href="#/offre">{tr(S.cardOfferTitle, lang)} →</a></p>
          <Sources sources={[r.source]} />
        </article>
      ))}
    </>
  );
}
