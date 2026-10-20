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
  PROVINCE_NAMES, recruitmentEvents, todayIso, type AfricanRecruiter, type CurrentOffer, type InternationalOffer, type Prospect, type ProvinceCode,
} from '@verijob/core';
import { Badge } from '../components/common';
import { ContactLinks } from '../components/ContactLinks';
import { ProfileBanner } from '../components/ProfileBanner';
import {
  loadAfricanRecruiters, loadCurrentOffers, loadEmployerContacts, loadInternationalOffers, loadProspectsFor, nocData, rules,
  type EmployerContact,
} from '../data';
import { directoryPdf, employerSheetPdf, saveBlob, type DirectoryEntry } from '../pdf';
import { profileLabel } from '../components/Profiles';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { upsertApplication, useApplications, useProfile, useProfiles } from '../store';
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
  /**
   * Force de la preuve que l'employeur recrute HORS du Canada (une EIMT peut servir pour un travailleur déjà au Canada) :
   * 1 annonce qui le dit, 2 preuve publique de recrutement en Afrique, 3 offre actuelle sans précision, 4 EIMT seulement.
   */
  tier: 1 | 2 | 3 | 4;
  /** Phrase de l'annonce qui montre l'ouverture à l'étranger (rang 1). */
  proof?: string;
  /** Coordonnées relevées sur son site officiel (même province ; la même ville d'abord). */
  contacts: EmployerContact[];
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
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const apps = useApplications();
  const valid = (contact.trim().length > 3 || /\d{3}.*\d{4}/.test(phone)) && HTTP.test(source.trim());
  const save = async () => {
    const existing = apps.find((a) => employerKey(a.employer) === employerKey(employer));
    const d = todayIso();
    await upsertApplication(existing
      ? { ...existing, contact: contact.trim() || existing.contact, phone: phone.trim() || existing.phone, contactSource: source.trim(), updatedAt: new Date().toISOString() }
      : {
        id: newId(), employer, job: jobName(noc, lang), date: d, status: 'a-envoyer', followUp: addDays(d, DEFAULT_FOLLOW_UP_DAYS),
        contact: contact.trim() || undefined, phone: phone.trim() || undefined, contactSource: source.trim(), origin: 'site-employeur', updatedAt: new Date().toISOString(),
      });
    onDone();
  };
  return (
    <div class="panel">
      <label>{tr(S.applyPhoneLabel, lang)}<input type="tel" value={phone} placeholder="418-555-1234" onInput={(e) => setPhone((e.target as HTMLInputElement).value)} /></label>
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
      <p><Badge kind={e.tier <= 2 ? 'ok' : 'info'}>{tr(S.applyTier[e.tier], lang)}</Badge></p>
      {e.proof && <p class="quote">« {e.proof} »</p>}
      <p class="muted">
        {e.offer && <>{tr(S.applyHasOffer, lang)} {formatShort(e.offer.date, lang)} : « {e.offer.title} ». </>}
        {e.lmiaQuarters !== undefined && tr(S.applyLmia, lang).replace('{q}', String(e.lmiaQuarters))}
      </p>
      <OfficialContacts contacts={e.contacts} lang={lang} />
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

/** Coordonnées relevées sur le site officiel de l'employeur (ou site inaccessible depuis l'étranger). */
function OfficialContacts({ contacts, lang }: { contacts: EmployerContact[]; lang: Lang }) {
  if (!contacts.length) return null;
  return (
    <div class="official-contacts">
      {contacts.map((c) => (c.status === 'inaccessible'
        ? <p class="warn">{c.notes}</p>
        : (
          <p>
            {c.phone && <><a href={`tel:+1${c.phone.replace(/^1-/, '').replace(/-/g, '')}`}>📞 {c.phone}</a>{c.phoneAlt ? ` / ${c.phoneAlt}` : ''}{' '}</>}
            {c.email && <><a href={`mailto:${c.email}`}>✉ {c.email}</a>{' '}</>}
            <br /><span class="muted">{c.address ?? c.c} — {tr(S.applyOfficialSite, lang)} <a href={c.source} {...ext}>{tr(S.applySeenOn, lang).replace('{d}', c.recordedAt)}</a>{c.notes ? `. ${c.notes}` : ''}</span>
          </p>
        )))}
    </div>
  );
}

const formatShort = (iso: string, lang: Lang) => new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' });

const hasPhone = (e: Employer) => e.contacts.some((c) => c.phone);

/** Coordonnées officielles d'un employeur : même clé, même province ; la même ville d'abord. */
function contactsFor(all: EmployerContact[], key: string, province: ProvinceCode | undefined, city: string): EmployerContact[] {
  const town = employerKey(city);
  return all
    .filter((c) => c.k === key && (!province || c.p === province))
    .sort((a, b) => Number(employerKey(b.c) === town) - Number(employerKey(a.c) === town));
}

/**
 * Employeurs du profil, sans doublon, classés par force de la preuve qu'ils recrutent HORS du Canada
 * (puis ceux dont le téléphone officiel est connu, puis les plus récents).
 */
function useEmployers(nocs: string[], provinces: ProvinceCode[]) {
  const [current, setCurrent] = useState<CurrentOffer[]>([]);
  const [intl, setIntl] = useState<InternationalOffer[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [africa, setAfrica] = useState<AfricanRecruiter[]>([]);
  const [contacts, setContacts] = useState<EmployerContact[]>([]);
  const [dates, setDates] = useState<Record<string, string>>({});
  const seen = (name: string) => (f: { fetchedAt: string }) => setDates((d) => ({ ...d, [name]: f.fetchedAt.slice(0, 10) }));
  useEffect(() => {
    loadCurrentOffers().then((f) => { setCurrent(f.data); seen('offers')(f); }).catch(() => undefined);
    loadInternationalOffers().then((f) => setIntl(f.data)).catch(() => undefined);
    loadAfricanRecruiters().then((f) => setAfrica(f.data)).catch(() => undefined);
    loadEmployerContacts().then((f) => { setContacts(f.data); seen('contacts')(f); }).catch(() => undefined);
  }, []);
  useEffect(() => { loadProspectsFor(nocs).then((f) => setProspects(f.data)).catch(() => undefined); }, [nocs.join()]);
  const list = useMemo(() => {
    if (!nocs.length) return [];
    const mine = (o: { noc: string; province?: ProvinceCode }) => nocs.includes(o.noc) && (!provinces.length || !o.province || provinces.includes(o.province));
    const byKey = new Map<string, Employer & { date: string }>();
    // Les annonces qui disent accepter l'étranger passent avant les autres annonces du même employeur.
    const offers = [...intl.map((o) => ({ o, proof: o.evidence[0] })), ...current.map((o) => ({ o, proof: undefined as string | undefined }))]
      .filter(({ o }) => o.company && mine(o))
      .sort((a, b) => Number(!!b.proof) - Number(!!a.proof) || b.o.date.localeCompare(a.o.date));
    for (const { o, proof } of offers) {
      const key = employerKey(o.company);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, {
        key, name: o.company, city: o.location.split(',')[0] ?? '', province: o.province, noc: o.noc,
        offer: { title: o.title, url: o.url, date: o.date, snippet: o.snippet },
        tier: proof ? 1 : 3, proof, contacts: [], date: o.date,
      });
    }
    for (const p of filterProspects(prospects, { nocs, provinces })) {
      const cur = byKey.get(p.k);
      if (cur) { cur.lmiaQuarters = p.q; cur.postal = p.pc; continue; }
      const noc = p.j.find(([n]) => nocs.includes(n))?.[0] ?? nocs[0]!;
      byKey.set(p.k, {
        key: p.k, name: p.n, city: p.c, province: p.p === 'XX' ? undefined : (p.p as ProvinceCode), postal: p.pc, noc,
        lmiaQuarters: p.q, tier: 4, contacts: [], date: '',
      });
    }
    const african = new Set(africa.map((a) => `${a.k}|${a.province}`));
    for (const e of byKey.values()) {
      if (e.tier > 2 && african.has(`${e.key}|${e.province}`)) e.tier = 2;
      e.contacts = contactsFor(contacts, e.key, e.province, e.city);
    }
    return [...byKey.values()].sort((a, b) =>
      a.tier - b.tier || Number(hasPhone(b)) - Number(hasPhone(a)) || b.date.localeCompare(a.date) || (b.lmiaQuarters ?? 0) - (a.lmiaQuarters ?? 0));
  }, [current, intl, prospects, africa, contacts, nocs.join(), provinces.join()]);
  const dataDate = [dates.offers, dates.contacts].filter(Boolean).sort().at(-1) ?? todayIso();
  return { list, dataDate };
}

function countryName(code: string | undefined, lang: Lang): string {
  if (!code) return '';
  try { return new Intl.DisplayNames([lang === 'fr' ? 'fr-CA' : 'en-CA'], { type: 'region' }).of(code.toUpperCase()) ?? code; } catch { return code; }
}

/** Boutons PDF : annuaire du profil et fiche « M'embaucher sans EIMT » pour l'employeur (hors Québec). */
function PdfButtons({ list, dataDate, nocs, provinces, lang }: { list: Employer[]; dataDate: string; nocs: string[]; provinces: ProvinceCode[]; lang: Lang }) {
  const profile = useProfile();
  const idx = useProfiles();
  const apps = useApplications();
  const [busy, setBusy] = useState(false);
  const i = idx ? idx.list.findIndex((x) => x.id === idx.active) : 0;
  const profileName = profileLabel(idx?.list[i]?.name ?? '', Math.max(i, 0), lang);
  const outsideQc = !provinces.length || provinces.some((p) => p !== 'QC');
  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } finally { setBusy(false); } };
  const file = (base: string) => `${base}-${profileName.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'profil'}.pdf`;
  const directory = () => run(async () => {
    const mine = new Map(apps.filter((a) => a.contact?.trim() || a.phone?.trim()).map((a) => [employerKey(a.employer), a]));
    const entries: DirectoryEntry[] = list.map((e) => {
      const c = e.contacts.find((x) => x.status === 'verifie');
      const blocked = e.contacts.find((x) => x.status === 'inaccessible');
      const a = mine.get(e.key);
      return {
        name: e.name,
        place: `${e.city}${e.province ? `, ${PROVINCE_NAMES[e.province][lang]}` : ''}`,
        jobs: jobName(e.noc, lang),
        evidence: tr(S.applyTier[e.tier], lang) + (e.proof ? ` : « ${e.proof} »` : '')
          + (e.lmiaQuarters !== undefined ? `. ${tr(S.applyLmia, lang).replace('{q}', String(e.lmiaQuarters))}` : ''),
        offer: e.offer ? `${e.offer.title} (${e.offer.date})` : undefined,
        phone: c?.phone, phoneAlt: c?.phoneAlt, email: c?.email, address: c?.address ?? (c ? c.c : undefined),
        source: c?.source, sourceDate: c?.recordedAt,
        note: blocked?.notes,
        mine: a ? { contact: a.contact?.trim() ?? '', phone: a.phone?.trim(), source: a.contactSource } : undefined,
        links: [e.offer?.url].filter((x): x is string => !!x),
      };
    });
    const blob = await directoryPdf({
      lang, profile: profileName,
      jobs: nocs.map((n) => jobName(n, lang)).join(', '),
      provinces: provinces.length ? provinces.map((p) => PROVINCE_NAMES[p][lang]).join(', ') : tr(S.applyAllProvinces, lang),
      dataDate, generated: todayIso(),
    }, entries);
    saveBlob(blob, file(lang === 'fr' ? 'annuaire' : 'directory'));
  });
  const sheet = () => run(async () => {
    const src = rules.sources[rules.francophoneMobility.employerSource]!;
    const blob = await employerSheetPdf({
      candidate: idx?.list[i]?.name ?? '',
      country: countryName(profile.citizenship, lang),
      job: nocs[0] ? jobName(nocs[0], 'en') : undefined,
      feeCad: rules.francophoneMobility.employerComplianceFeeCad,
      sourceUrl: { fr: src.urlFr ?? src.urlEn, en: src.urlEn },
      sourceDate: src.pageModified ?? src.verifiedAt,
    });
    saveBlob(blob, file('fiche-employeur'));
  });
  return (
    <article class="card-result">
      <h3>{tr(S.applyPdfTitle, lang)}</h3>
      <p class="muted">{tr(S.applyPdfDirectoryText, lang)}</p>
      <button type="button" class="primary" disabled={busy || !list.length} onClick={() => void directory()}>{tr(S.applyPdfDirectory, lang)}</button>
      {outsideQc && (
        <>
          <p class="muted">{tr(S.applyPdfSheetText, lang).replace('{fee}', String(rules.francophoneMobility.employerComplianceFeeCad))}</p>
          <button type="button" disabled={busy} onClick={() => void sheet()}>{tr(S.applyPdfSheet, lang)}</button>
        </>
      )}
    </article>
  );
}

/** ② Employeurs du profil, classés par force de la preuve qu'ils recrutent à l'étranger. */
function Employers({ nocs, provinces, lang }: { nocs: string[]; provinces: ProvinceCode[]; lang: Lang }) {
  const { list, dataDate } = useEmployers(nocs, provinces);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const needle = employerKey(q);
  const visible = needle ? list.filter((e) => e.key.includes(needle)) : list;
  if (!nocs.length) return null;
  return (
    <>
      <h2>{tr(S.applyEmployersTitle, lang)}</h2>
      <p class="muted">{tr(S.applyEmployersIntro, lang).replace('{n}', String(list.length))}</p>
      <p class="callout">{tr(S.applyTierIntro, lang)}</p>
      <PdfButtons list={list} dataDate={dataDate} nocs={nocs} provinces={provinces} lang={lang} />
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
  const withContact = apps.filter((a) => a.contact?.trim() || a.phone?.trim()).sort((a, b) => a.employer.localeCompare(b.employer, lang));
  return (
    <>
      <h2>{tr(S.applyContactsTitle, lang)}</h2>
      {!withContact.length && <p class="muted">{tr(S.applyContactsEmpty, lang)}</p>}
      {withContact.map((a) => {
        const c = a.contact?.trim() ?? '';
        const href = c.includes('@') && !HTTP.test(c) ? `mailto:${c}` : HTTP.test(c) ? c : undefined;
        return (
          <article class="card-result">
            <h3>{a.employer}</h3>
            {a.phone && <p><a href={`tel:${a.phone.replace(/[^\d+]/g, '')}`}>📞 {a.phone}</a></p>}
            <p>{href ? <a href={href} {...ext}>{c}</a> : c} {a.job && <span class="muted">{c ? "· " : ""}{a.job}</span>}</p>
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
