/**
 * Appeler un employeur depuis l'étranger : fuseau horaire de la province, heures de bureau converties
 * dans l'heure de la personne, numéro au format international.
 */
import type { ProvinceCode } from './types';

/** Fuseau principal de chaque province (IANA). */
export const PROVINCE_TZ: Record<ProvinceCode, string> = {
  NL: 'America/St_Johns', PE: 'America/Halifax', NS: 'America/Halifax', NB: 'America/Moncton',
  QC: 'America/Toronto', ON: 'America/Toronto', MB: 'America/Winnipeg', SK: 'America/Regina',
  AB: 'America/Edmonton', BC: 'America/Vancouver', YT: 'America/Whitehorse', NT: 'America/Yellowknife', NU: 'America/Iqaluit',
};

/** Décalage (minutes) d'un fuseau par rapport à UTC à un instant donné. */
export function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(at).reduce<Record<string, string>>((o, p) => ({ ...o, [p.type]: p.value }), {});
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/**
 * Heures de bureau de la province (9 h – 16 h par défaut) exprimées dans le fuseau de la personne.
 * @param localOffset décalage UTC de la personne en minutes (ex. Cameroun : 60).
 */
export function officeHoursLocal(province: ProvinceCode, localOffset: number, at = new Date(), from = 9, to = 16): { from: string; to: string; provinceOffset: number } {
  const prov = tzOffsetMinutes(PROVINCE_TZ[province], at);
  const fmt = (h: number) => {
    const m = (((h * 60 - prov + localOffset) % 1440) + 1440) % 1440;
    return `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
  };
  return { from: fmt(from), to: fmt(to), provinceOffset: prov };
}

/** « 418-522-8271 » ou « 1-866-522-8271 » → « +1 418 522 8271 » (à composer depuis un mobile, n'importe quel pays). */
export function internationalNumber(phone: string): string {
  const d = phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `+1 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : phone;
}
