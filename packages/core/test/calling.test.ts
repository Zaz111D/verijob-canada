import { describe, expect, it } from 'vitest';
import { internationalNumber, officeHoursLocal, tzOffsetMinutes } from '../src';

describe('Appeler depuis l’étranger', () => {
  it('décalage horaire du Québec : heure avancée puis heure normale', () => {
    expect(tzOffsetMinutes('America/Toronto', new Date('2026-10-29T12:00:00Z'))).toBe(-240);
    expect(tzOffsetMinutes('America/Toronto', new Date('2026-11-10T12:00:00Z'))).toBe(-300);
    expect(tzOffsetMinutes('America/St_Johns', new Date('2026-11-10T12:00:00Z'))).toBe(-210);
  });

  it('heures de bureau du Québec vues du Cameroun (UTC+1)', () => {
    expect(officeHoursLocal('QC', 60, new Date('2026-10-29T12:00:00Z'))).toMatchObject({ from: '14 h', to: '21 h' });
    expect(officeHoursLocal('QC', 60, new Date('2026-11-10T12:00:00Z'))).toMatchObject({ from: '15 h', to: '22 h' });
    // Colombie-Britannique : heure avancée toute l'année selon la base des fuseaux (tzdata 2026b).
    expect(officeHoursLocal('BC', 60, new Date('2026-11-10T12:00:00Z'))).toMatchObject({ from: '17 h', to: '0 h' });
    expect(officeHoursLocal('NL', 60, new Date('2026-11-10T12:00:00Z')).from).toBe('13 h30');
  });

  it('numéro international', () => {
    expect(internationalNumber('418-522-8271')).toBe('+1 418 522 8271');
    expect(internationalNumber('1-866-522-8271')).toBe('+1 866 522 8271');
  });
});
