/**
 * Analyse d'une offre collée (WhatsApp, e-mail, Facebook…).
 * 100 % local : aucun appel réseau, fonctionne hors ligne.
 */
import { detectProvince } from '../geo';
import { DISCLAIMER, scamSummary } from '../messages';
import { detectNocInText } from '../noc';
import { sourceRef, todayIso } from '../sources';
import { prepareText } from '../text';
import type { NocData, Profile, Rules } from '../types';
import { SCAM_RULES } from './rules';
import type { ScamAnalysis, ScamContext, ScamSignal, Severity, WageLookup } from './types';

export interface AnalyzeOptions {
  rules: Rules;
  nocData: NocData;
  profile?: Profile;
  wageLookup?: WageLookup;
  /** Date du jour AAAA-MM-JJ (pour les tests ; sinon la date du système). */
  today?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { eleve: 0, moyen: 1, info: 2 };

export function analyzeOffer(text: string, opts: AnalyzeOptions): ScamAnalysis {
  const { raw, norm, segments } = prepareText(text);
  const today = opts.today ?? todayIso();
  const detectedNoc = detectNocInText(opts.nocData, norm);
  const detectedProvince = detectProvince(opts.rules, raw);
  const ctx: ScamContext = {
    raw,
    norm,
    segments,
    rules: opts.rules,
    nocData: opts.nocData,
    profile: opts.profile ?? {},
    detectedNoc,
    detectedProvince,
    wageLookup: opts.wageLookup,
    today,
  };

  const signals: ScamSignal[] = [];
  const skipped: ScamAnalysis['skipped'] = [];
  for (const rule of SCAM_RULES) {
    const res = rule.detect(ctx);
    if (!res) continue;
    if ('skipped' in res) {
      skipped.push({ id: rule.id, reason: res.skipped });
      continue;
    }
    signals.push({
      id: rule.id,
      severity: rule.severity,
      title: rule.title,
      explanation: res.explanation ?? rule.explanation(opts.rules),
      evidence: res.evidence,
      sources: rule.sourceIds(opts.rules).map((id) => sourceRef(opts.rules, id, today)),
    });
  }
  signals.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return {
    signals,
    count: signals.length,
    summary: scamSummary(signals.length),
    skipped,
    detectedNoc: detectedNoc
      ? { code: detectedNoc.code, title: { fr: detectedNoc.titleFr, en: detectedNoc.titleEn } }
      : undefined,
    detectedProvince,
    disclaimer: DISCLAIMER,
  };
}
