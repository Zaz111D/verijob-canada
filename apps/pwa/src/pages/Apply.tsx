/**
 * « Où postuler » : le carnet d'adresses du profil actif.
 *  ① plateformes officielles pour ce profil (Guichet-Emplois par métier et province, Québec, salons, réseaux) ;
 *  ② employeurs du profil regroupés (offres actuelles + recruteurs des listes d'EIMT), avec toutes leurs portes d'entrée ;
 *  ③ contacts vérifiés par la personne (enregistrés avec la page officielle où elle les a trouvés), reliés au Suivi.
 * Règle : VériJob ne devine JAMAIS une adresse e-mail ; il ne montre que des liens officiels ou des contacts vérifiés.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  addDays, DEFAULT_FOLLOW_UP_DAYS, employerKey, filterProspects, findNoc, isFreeEmail, jobBankLink, networks, newId,
  PROVINCE_NAMES, recruitmentEvents, todayIso, type CurrentOffer, type InternationalOffer, type Prospect, type ProvinceCode,
} from '@verijob/core';
import { Badge } from '../components/common';
import { ContactLinks } from '../components/ContactLinks';
import { ProfileBanner } from '../components/ProfileBanner';
import { loadCurrentOffers, loadInternationalOffers, loadProspectsFor, nocData, rules } from '../data';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { upsertApplication, useApplications, useProfile } from '../store';
import { openSampleCv } from './SampleCv';

const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;
const PAGE = 20;
const HTTP = /^https?:\/\//i;

interface Employer {
  key: string;
  name: string;
  city: string;
  province?: ProvinceCode;
  postal?: string;
  noc: string;
  /** Annonce actuelle (la plus récente) de cet employeur pour le profil. */
  offer?: { title: string; url: string; date: string; snippet: string };
  /** Trimestres avec EIMT pour les métiers du profil (listes officielles). */
  lmiaQuarters?: number;
}

function jobName(code: string, lang: Lang) {
  const n = findNoc(nocData, code);
  return (lang === 'fr' ? n?.jobFr : n?.jobEn) ?? code;
}

/** ① Plateformes officielles qui correspondent au profil. */
function Platforms({ nocs, provinces, citizenship, lang }: { nocs: string[]; provinces: ProvinceCode[]; citizenship?: string; lang: Lang }) {
  const today = todayIso();
  const qc = !provinces.length || provinces.includes('QC');
  const outsideQc = !provinces.length || provinces.some((p) => p !== 'QC');
  const events = recruitmentEvents(rules, today).filter((e) =>
    (e.id === 'recrutement-quebec' && qc) || (e.id === 'destination-canada' && outsideQc) || (e.id === 'destination-manitoba' && (!provinces.length || provinces.includes('MB'))));
  const nets = networks(rules, today, citizenship).filter((n) =>
    (n.id === 'services-publics-emploi' && n.forYourCountry) || (n.id === 'reseaux-immigration-francophone' && outsideQc));
  return (
    <>
      <h2>{tr(S.applyPlatformsTitle, lang)}</h2>
      <article class="card-result">
        <h3>{tr(S.applyJobBankTitle, lang)}</h3>
        <p class="muted">{tr(S.applyJobBankText, lang)}</p>
        {nocs.map((code) => {
          const n = findNoc(nocData, code);
          const kw = n?.jobEn?.split(/[(/]/)[0]!.trim() ?? code;
          return (
            <div class="row">
              {(provinces.length ? provinces : [undefined]).map((p) => (
                <a class="button" href={jobBankLink(rules, { keyword: kw, province: p }).url} {...ext}>
                  {jobName(code, lang)}{p ? ` — ${PROVINCE_NAMES[p][lang]}` : ''} ↗
                </a>
              ))}
            </div>
          );
        })}
      </article>
      {qc && (
        <article class="card-result">
          <h3>{tr(S.applyArrimaTitle, lang)}</h3>
          <p class="muted">{rules.quebec.steps.find((s) => s.source === 'qc-arrima')?.[lang]}</p>
          <a class="button primary" href={rules.quebec.arrimaUrl} {...ext}>{tr(S.quebecArrima, lang)} ↗</a>
        </article>
      )}
      {events.map((e) => (
        <article class="card-result">
          <h3>{e.name[lang]}</h3>
          <p class="muted">{e.status[lang]}</p>
          {e.old && <p class="warn">{tr(S.eventOld, lang)}</p>}
          <a class="button" href={e.source.url[lang]} {...ext}>{tr(S.officialPage, lang)} ↗</a>
        </article>
      ))}
      {nets.map((n) => (
        <article class="card-result">
          <h3>{n.name[lang]}</h3>
          <p class="muted">{n.detail[lang]}</p>
          <a class="button" href={n.url[lang]} {...ext}>{tr(S.officialPage, lang)} ↗</a>
        </article>
      ))}
    </>
  );
}

/** Formulaire « enregistrer un contact vérifié » pour un employeur (crée ou complète une candidature du Suivi). */
function ContactForm({ employer, noc, lang, onDone }: { employer: string; noc: string; lang: Lang; onDone: () => void }) {
  const [contact, setContact] = useState('');
  const [source, setSource] = useState('');
  const apps = useApplications();
  const valid = contact.trim().length > 3 && HTTP.test(source.trim());
  const save = async () => {
    const existing = apps.find((a) => employerKey(a.employer) === employerKey(employer));
    const d = todayIso();
    await upsertApplication(existing
      ? { ...existing, contact: contact.trim(), contactSource: source.trim(), updatedAt: new Date().toISOString() }
      : {
        id: newId(), employer, job: jobName(noc, lang), date: d, status: 'a-envoyer', followUp: addDays(d, DEFAULT_FOLLOW_UP_DAYS),
        contact: contact.trim(), contactSource: source.trim(), origin: 'site-employeur', updatedAt: new Date().toISOString(),
      });
    onDone();
  };
  return (
    <div class="panel">
      <label>{tr(S.applyContactLabel, lang)}<input value={contact} placeholder="rh@… / https://…/carrieres" onInput={(e) => setContact((e.target as HTMLInputElement).value)} /></label>
      <label>{tr(S.applyContactSource, lang)}<input value={source} placeholder="https://…" onInput={(e) => setSource((e.target as HTMLInputElement).value)} /></label>
      {isFreeEmail(contact) && <p class="warn">{tr(S.contactFreeMail, lang)}</p>}
      <p class="muted">{tr(S.applyContactRule, lang)}</p>
      <div class="row">
        <button type="button" class="primary" disabled={!valid} onClick={() => void save()}>{tr(S.save, lang)}</button>
        <button type="button" onClick={onDone}>{tr(S.close, lang)}</button>
      </div>
    </div>
  );
}

function EmployerCard({ e, lang }: { e: Employer; lang: Lang }) {
  const [adding, setAdding] = useState(false);
  return (
    <article class="card-result">
      <h3>{e.name}</h3>
      <p>{e.city}{e.province ? `, ${PROVINCE_NAMES[e.province][lang]}` : ''} · <span class="muted">{jobName(e.noc, lang)}</span></p>
      <p>
        {e.offer && <Badge kind="ok">{tr(S.applyHasOffer, lang)} {formatShort(e.offer.date, lang)}</Badge>}{' '}
        {e.lmiaQuarters !== undefined && <Badge kind="info">{tr(S.applyLmia, lang).replace('{q}', String(e.lmiaQuarters))}</Badge>}
      </p>
      {e.offer && <p class="muted">« {e.offer.title} »</p>}
      <ContactLinks name={e.name} city={e.city} province={e.province} postal={e.postal} lang={lang} />
      <div class="row">
        {e.offer && <a class="button" href={e.offer.url} {...ext}>{tr(S.offerReadAdzuna, lang)} ↗</a>}
        <button type="button" class="primary" onClick={() => openSampleCv({ noc: e.noc, title: e.offer?.title, text: e.offer?.snippet, province: e.province })}>{tr(S.applyPrepare, lang)}</button>
        <button type="button" onClick={() => setAdding(!adding)}>{tr(S.applyAddContact, lang)}</button>
      </div>
      {adding && <ContactForm employer={e.name} noc={e.noc} lang={lang} onDone={() => setAdding(false)} />}
    </article>
  );
}

const formatShort = (iso: string, lang: Lang) => new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' });

/** ② Employeurs du profil, sans doublon : offres actuelles d'abord, puis recruteurs réguliers des listes d'EIMT. */
function Employers({ nocs, provinces, lang }: { nocs: string[]; provinces: ProvinceCode[]; lang: Lang }) {
  const [current, setCurrent] = useState<CurrentOffer[]>([]);
  const [intl, setIntl] = useState<InternationalOffer[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  useEffect(() => {
    loadCurrentOffers().then((f) => setCurrent(f.data)).catch(() => undefined);
    loadInternationalOffers().then((f) => setIntl(f.data)).catch(() => undefined);
  }, []);
  useEffect(() => { loadProspectsFor(nocs).then((f) => setProspects(f.data)).catch(() => undefined); }, [nocs.join()]);
  const list = useMemo(() => {
    if (!nocs.length) return [];
    const mine = (o: { noc: string; province?: ProvinceCode }) => nocs.includes(o.noc) && (!provinces.length || !o.province || provinces.includes(o.province));
    const byKey = new Map<string, Employer>();
    for (const o of [...intl, ...current].filter((x) => x.company && mine(x)).sort((a, b) => b.date.localeCompare(a.date))) {
      const key = employerKey(o.company);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, {
        key, name: o.company, city: o.location.split(',')[0] ?? '', province: o.province, noc: o.noc,
        offer: { title: o.title, url: o.url, date: o.date, snippet: o.snippet },
      });
    }
    for (const p of filterProspects(prospects, { nocs, provinces })) {
      const cur = byKey.get(p.k);
      if (cur) { cur.lmiaQuarters = p.q; cur.postal = p.pc; continue; }
      const noc = p.j.find(([n]) => nocs.includes(n))?.[0] ?? nocs[0]!;
      byKey.set(p.k, { key: p.k, name: p.n, city: p.c, province: p.p === 'XX' ? undefined : (p.p as ProvinceCode), postal: p.pc, noc, lmiaQuarters: p.q });
    }
    return [...byKey.values()];
  }, [current, intl, prospects, nocs.join(), provinces.join()]);
  const needle = employerKey(q);
  const visible = needle ? list.filter((e) => e.key.includes(needle)) : list;
  if (!nocs.length) return null;
  return (
    <>
      <h2>{tr(S.applyEmployersTitle, lang)}</h2>
      <p class="muted">{tr(S.applyEmployersIntro, lang).replace('{n}', String(list.length))}</p>
      <p class="callout">{tr(S.howToApply, lang)}</p>
      <label>{tr(S.applySearch, lang)}<input value={q} onInput={(e) => { setQ((e.target as HTMLInputElement).value); setShown(PAGE); }} /></label>
      {visible.slice(0, shown).map((e) => <EmployerCard e={e} lang={lang} />)}
      {shown < visible.length && <button type="button" onClick={() => setShown(shown + PAGE)}>{tr(S.showMore, lang)} ({visible.length - shown})</button>}
      <p><a href="#/employeur">{tr(S.cardEmployerTitle, lang)} →</a></p>
    </>
  );
}

/** ③ Contacts vérifiés du profil (candidatures du Suivi qui ont un contact). */
function VerifiedContacts({ lang }: { lang: Lang }) {
  const apps = useApplications();
  const withContact = apps.filter((a) => a.contact?.trim()).sort((a, b) => a.employer.localeCompare(b.employer, lang));
  return (
    <>
      <h2>{tr(S.applyContactsTitle, lang)}</h2>
      {!withContact.length && <p class="muted">{tr(S.applyContactsEmpty, lang)}</p>}
      {withContact.map((a) => {
        const c = a.contact!.trim();
        const href = c.includes('@') && !HTTP.test(c) ? `mailto:${c}` : HTTP.test(c) ? c : undefined;
        return (
          <article class="card-result">
            <h3>{a.employer}</h3>
            <p>{href ? <a href={href} {...ext}>{c}</a> : c} {a.job && <span class="muted">· {a.job}</span>}</p>
            {isFreeEmail(c) && <p class="warn">{tr(S.contactFreeMail, lang)}</p>}
            {a.contactSource
              ? <p class="muted">{tr(S.applyFoundOn, lang)} <a href={a.contactSource} {...ext}>{a.contactSource.replace(/^https?:\/\//, '').slice(0, 60)}</a></p>
              : <p class="warn">{tr(S.applyNoSource, lang)}</p>}
            <p><a href="#/suivi">{tr(S.navTracking, lang)} →</a></p>
          </article>
        );
      })}
    </>
  );
}

export function Apply() {
  const lang = useLang();
  const profile = useProfile();
  const nocs = profile.targetNocs ?? [];
  const provinces = (profile.provinces ?? []) as ProvinceCode[];
  return (
    <section>
      <h1>{tr(S.applyPageTitle, lang)}</h1>
      <ProfileBanner lang={lang} />
      <p class="muted">{tr(S.applyPageIntro, lang)}</p>
      {nocs.length > 0 && <Platforms nocs={nocs} provinces={provinces} citizenship={profile.citizenship} lang={lang} />}
      <Employers nocs={nocs} provinces={provinces} lang={lang} />
      <VerifiedContacts lang={lang} />
    </section>
  );
}
