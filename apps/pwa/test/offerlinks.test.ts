import { describe, expect, it } from 'vitest';
import { coreTitle } from '../src/components/InternationalOffers';

describe('titre pour retrouver une annonce', () => {
  it('retire les précisions de quart ou de contrat', () => {
    expect(coreTitle('Food Counter Attendant - Early Morning')).toBe('Food Counter Attendant');
    expect(coreTitle('Security Guard (Full time)')).toBe('Security Guard');
    expect(coreTitle('Cook | Night shift')).toBe('Cook');
    expect(coreTitle('Cuisinier/cuisinière')).toBe('Cuisinier/cuisinière');
  });
});
