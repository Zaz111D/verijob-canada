/**
 * PDF fabriqués sur le téléphone (jsPDF, chargé seulement au clic) — rien n'est envoyé.
 *  - employerSheetPdf : « Comment m'embaucher sans EIMT » (Mobilité francophone), en anglais puis en français,
 *    à joindre à une candidature hors Québec. Étapes et frais : page officielle d'IRCC (rules.francophoneMobility).
 *  - directoryPdf : annuaire des employeurs d'un profil (coordonnées relevées sur leurs sites officiels,
 *    contacts vérifiés par la personne, sinon lignes à remplir). Aucune coordonnée n'est devinée.
 */
import type { jsPDF as JsPdf } from 'jspdf';

/** Les polices standard des PDF ne couvrent que l'alphabet latin courant : on remplace le reste. */
export function pdfText(s: string): string {
  return s
    .replace(/[→➜➤]/g, '->').replace(/[✓✔]/g, 'OK').replace(/≈/g, '~')
    .replace(/[·•]/g, '-').replace(/[  ]/g, ' ')
    .replace(/[^\u0009\u000A -~ -ÿŒœ–—‘’“”…€]/g, '');
}

async function newDoc(): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  return new jsPDF({ unit: 'mm', format: 'a4' });
}

/** Petite mise en page : texte qui passe à la ligne et à la page suivante. */
function writer(doc: JsPdf) {
  const M = 16, W = 210 - 2 * M, BOTTOM = 297 - 16;
  let y = M;
  const ensure = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };
  return {
    get y() { return y; },
    gap(h = 3) { y += h; },
    text(s: string, o: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number } = {}) {
      doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
      doc.setFontSize(o.size ?? 10);
      doc.setTextColor(...(o.color ?? [20, 20, 20]));
      const lines = doc.splitTextToSize(pdfText(s), W - (o.indent ?? 0)) as string[];
      const lh = (o.size ?? 10) * 0.42;
      for (const line of lines) { ensure(lh); doc.text(line, M + (o.indent ?? 0), y + lh * 0.8); y += lh; }
    },
    rule() { ensure(4); doc.setDrawColor(200, 200, 200); doc.line(M, y + 1, M + W, y + 1); y += 3; },
    keep(h: number) { ensure(h); },
  };
}

export interface EmployerSheet {
  candidate: string;
  country: string;
  job?: string;
  feeCad: number;
  sourceUrl: { fr: string; en: string };
  sourceDate: string;
}

/** Fiche « Comment m'embaucher sans EIMT » (Mobilité francophone, hors Québec), EN puis FR. */
export async function employerSheetPdf(d: EmployerSheet): Promise<Blob> {
  const doc = await newDoc();
  const name = d.candidate.trim() || '[Your name / Votre nom]';
  const country = d.country.trim() || '[country / pays]';
  const fee = `$${d.feeCad}`, feeFr = `${d.feeCad} $`;
  const page = (w: ReturnType<typeof writer>, lang: 'en' | 'fr') => {
    const en = lang === 'en';
    w.text(en ? 'Hiring me without an LMIA' : 'M’embaucher sans EIMT', { size: 18, bold: true, color: [11, 83, 148] });
    w.text(en ? 'Francophone Mobility — jobs outside Quebec' : 'Mobilité francophone — emplois hors Québec', { size: 12, bold: true });
    w.gap(2);
    w.text(en
      ? `Candidate: ${name}${d.job ? ` — ${d.job}` : ''} (country: ${country}; French speaker)`
      : `Candidat(e) : ${name}${d.job ? ` — ${d.job}` : ''} (pays : ${country} ; francophone)`);
    w.gap(3);
    w.text(en
      ? 'Many employers think hiring from abroad is long and costly. Through Francophone Mobility, you do NOT need a Labour Market Impact Assessment (LMIA). Three steps, according to Immigration, Refugees and Citizenship Canada (IRCC):'
      : 'Beaucoup d’employeurs pensent qu’embaucher de l’étranger est long et coûteux. Avec la Mobilité francophone, vous n’avez PAS besoin d’Évaluation de l’impact sur le marché du travail (EIMT). Trois étapes, selon Immigration, Réfugiés et Citoyenneté Canada (IRCC) :');
    w.gap(2);
    const steps = en
      ? [`1. Sign in to (or create an account in) IRCC’s Employer Portal.`,
        `2. Submit the job offer in the Employer Portal with LMIA exemption code C16 (Francophone Mobility) and pay the ${fee} employer compliance fee.`,
        `3. Give me the 7-digit offer of employment number and the signed job offer. I then apply for my work permit myself.`]
      : [`1. Ouvrez une session (ou créez un compte) dans le Portail des employeurs d’IRCC.`,
        `2. Présentez l’offre d’emploi dans le Portail des employeurs avec le code de dispense d’EIMT C16 (Mobilité francophone) et payez les frais relatifs à la conformité de l’employeur de ${feeFr}.`,
        `3. Donnez-moi le numéro de l’offre d’emploi (7 chiffres) et l’offre signée. Je présente ensuite moi-même ma demande de permis de travail.`];
    for (const s of steps) { w.text(s, { indent: 4 }); w.gap(1.5); }
    w.gap(2);
    w.text(en ? 'Conditions' : 'Conditions', { bold: true });
    for (const s of en
      ? ['- The job is in any province or territory except Quebec.', '- Any occupation (any TEER level), except primary agriculture in TEER 4 or 5.', '- My spoken French: at least NCLC level 5 (speaking and listening).']
      : ['- Le poste est dans une province ou un territoire autre que le Québec.', '- Tout métier (toutes les catégories FEER), sauf l’agriculture primaire de FEER 4 ou 5.', '- Mon français oral : au moins le niveau NCLC 5 (expression et compréhension orales).']) w.text(s, { indent: 4 });
    w.gap(3);
    w.text(en ? `Official source (IRCC, updated ${d.sourceDate}):` : `Source officielle (IRCC, mise à jour le ${d.sourceDate}) :`, { size: 9, color: [90, 90, 90] });
    w.text(en ? d.sourceUrl.en : d.sourceUrl.fr, { size: 8, color: [11, 83, 148] });
    w.gap(4);
    w.rule();
    w.text(en
      ? 'Prepared with VériJob Canada, a free tool not affiliated with the Government of Canada. No fee is ever charged to the worker for a job offer.'
      : 'Préparé avec VériJob Canada, outil gratuit non affilié au gouvernement du Canada. Aucun frais n’est jamais demandé au travailleur pour une offre d’emploi.', { size: 8, color: [110, 110, 110] });
  };
  page(writer(doc), 'en');
  doc.addPage();
  page(writer(doc), 'fr'); // nouvelle page : nouveau rédacteur, qui repart du haut
  return doc.output('blob');
}

export interface DirectoryEntry {
  name: string;
  place: string;
  jobs: string;
  evidence: string;
  offer?: string;
  phone?: string;
  phoneAlt?: string;
  email?: string;
  address?: string;
  source?: string;
  sourceDate?: string;
  note?: string;
  /** Contact enregistré par la personne (avec la page où elle l'a trouvé). */
  mine?: { contact: string; phone?: string; source?: string };
  links: string[];
}

export interface DirectoryMeta {
  lang: 'fr' | 'en';
  profile: string;
  jobs: string;
  provinces: string;
  dataDate: string;
  generated: string;
}

/** Annuaire des employeurs d'un profil. */
export async function directoryPdf(meta: DirectoryMeta, entries: DirectoryEntry[]): Promise<Blob> {
  const doc = await newDoc();
  const w = writer(doc);
  const fr = meta.lang === 'fr';
  w.text(fr ? `Annuaire des employeurs — ${meta.profile}` : `Employer directory — ${meta.profile}`, { size: 16, bold: true, color: [11, 83, 148] });
  w.text(`${meta.jobs} — ${meta.provinces}`, { size: 10 });
  w.text(fr ? `${entries.length} employeurs. Données du ${meta.dataDate} ; annuaire créé le ${meta.generated}.` : `${entries.length} employers. Data of ${meta.dataDate}; directory created on ${meta.generated}.`, { size: 9, color: [90, 90, 90] });
  w.gap(2);
  w.text(fr
    ? 'Téléphones et e-mails : relevés sur le site officiel de l’employeur (page et date indiquées) ou notés par vous. Sinon, lignes à remplir : VériJob ne devine jamais une coordonnée. Ne payez jamais pour un emploi.'
    : 'Phones and e-mails: taken from the employer’s official website (page and date shown) or noted by you. Otherwise, lines to fill in: VériJob never guesses contact details. Never pay for a job.', { size: 9 });
  w.rule();
  for (const e of entries) {
    w.keep(28);
    w.text(e.name, { size: 11, bold: true });
    w.text(`${e.place} — ${e.jobs}`, { size: 9 });
    w.text(e.evidence, { size: 9, color: [30, 110, 50] });
    if (e.offer) w.text((fr ? 'Offre : ' : 'Offer: ') + e.offer, { size: 9 });
    if (e.address) w.text((fr ? 'Adresse : ' : 'Address: ') + e.address, { size: 9 });
    const tel = [e.phone, e.phoneAlt].filter(Boolean).join(' / ');
    w.text((fr ? 'Tél. : ' : 'Phone: ') + (tel || e.mine?.phone || '______________________'), { size: 10, bold: !!(tel || e.mine?.phone) });
    w.text((fr ? 'Courriel : ' : 'E-mail: ') + (e.email || (e.mine?.contact.includes('@') ? e.mine.contact : '') || '______________________'), { size: 10, bold: !!(e.email || e.mine?.contact.includes('@')) });
    if (e.source) w.text((fr ? `Relevé le ${e.sourceDate} sur : ` : `Taken on ${e.sourceDate} from: `) + e.source, { size: 7.5, color: [90, 90, 90] });
    if (e.mine) w.text((fr ? 'Votre contact : ' : 'Your contact: ') + e.mine.contact + (e.mine.source ? ` (${e.mine.source})` : ''), { size: 8, color: [90, 90, 90] });
    if (e.note) w.text(e.note, { size: 8, color: [170, 90, 0] });
    for (const l of e.links) w.text(l, { size: 7.5, color: [11, 83, 148] });
    w.rule();
  }
  return doc.output('blob');
}

/** Télécharge un Blob sous un nom de fichier. */
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
