/**
 * Recruteurs en Afrique pour des employeurs canadiens (onglet Tracker) :
 * ① voies officielles (IRCC, Nouveau-Brunswick, Manitoba), avec l'état des inscriptions quand il est suivi ;
 * ② agences privées qui PUBLIENT un permis et une activité en Afrique — « permis à vérifier », lien du registre ;
 * ③ registres officiels des recruteurs autorisés. Règle : aucun frais de recrutement à la charge du travailleur.
 */
import { formatDate, PROVINCE_NAMES, sourceRef, todayIso } from '@verijob/core';
import { rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { Badge, Sources } from './common';
import { EventOpen, useEventsStatus } from './EventsStatus';

const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;

export function Recruiters({ lang }: { lang: Lang }) {
  const ar = rules.africaRecruitment;
  const today = todayIso();
  const events = useEventsStatus();
  const registry = (province: string) => ar.registries.find((r) => r.province === province);
  const link = (id: string) => { const s = rules.sources[id]!; return (lang === 'fr' ? s.urlFr : s.urlEn) ?? s.urlEn ?? s.urlFr ?? '#'; };
  return (
    <>
      <h2>{tr(S.recruitersTitle, lang)}</h2>
      <p class="alert">{tr(S.recruitersRule, lang)}</p>
      <Sources sources={[sourceRef(rules, ar.feesSource, today)]} />

      <h3>{tr(S.recruitersOfficial, lang)}</h3>
      {ar.official.map((o) => (
        <article class="card-result">
          <h4>{lang === 'fr' ? o.nameFr : o.nameEn}</h4>
          <p class="muted">{lang === 'fr' ? o.detailFr : o.detailEn}</p>
          {o.event && <EventOpen status={events.find((e) => e.id === o.event)} lang={lang} />}
          <a class="button" href={link(o.source)} {...ext}>{tr(S.officialPage, lang)} ↗</a>
        </article>
      ))}

      <h3>{tr(S.recruitersAgencies, lang)}</h3>
      <p class="muted">{tr(S.recruitersAgenciesHelp, lang)}</p>
      {ar.agencies.map((a) => {
        const reg = registry(a.province);
        return (
          <article class="card-result">
            <h4>{a.name}</h4>
            <p>{lang === 'fr' ? a.zonesFr : a.zonesEn}</p>
            <p>
              {tr(S.recruitersLicence, lang)} : <strong>{a.licence}</strong> ({lang === 'fr' ? PROVINCE_NAMES[a.province].fr : PROVINCE_NAMES[a.province].en}){' '}
              <Badge kind="moyen">{tr(S.recruitersToCheck, lang)}</Badge>
              {a.noFeeStated && <>{' '}<Badge kind="ok">{tr(S.recruitersNoFee, lang)}</Badge></>}
            </p>
            <div class="row">
              {reg && <a class="button primary" href={link(reg.source)} {...ext}>{tr(S.recruitersCheckRegistry, lang)} ↗</a>}
              <a class="button" href={a.url} {...ext}>{tr(S.recruitersSite, lang)} ↗</a>
            </div>
            <p class="muted">{tr(S.recruitersRecorded, lang)} {formatDate(a.checkedAt, lang)}</p>
          </article>
        );
      })}

      <h3>{tr(S.recruitersRegistries, lang)}</h3>
      <p class="muted">{tr(S.recruitersRegistriesHelp, lang)}</p>
      <div class="row">
        {ar.registries.map((r) => <a class="button" href={link(r.source)} {...ext}>{lang === 'fr' ? PROVINCE_NAMES[r.province].fr : PROVINCE_NAMES[r.province].en} ↗</a>)}
      </div>
    </>
  );
}
