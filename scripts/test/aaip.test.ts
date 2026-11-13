import { describe, expect, it } from 'vitest';
import { parseAaipDraws } from '../fetch-aaip-draws';

describe('Alberta : tirages', () => {
  it('lit le tableau officiel, du plus récent au plus ancien', () => {
    const html = `<table><tr><th>Draw date</th><th>Stream</th><th>Minimum score</th><th>Invitations</th></tr>
      <tr><td>October 23, 2026</td><td>Rural Renewal Stream</td><td>51</td><td>37</td></tr>
      <tr><td>November 2, 2026</td><td>Rural Renewal Stream</td><td>51</td><td>173</td></tr>
      <tr><td>October 16, 2026</td><td>Alberta Express Entry Stream &#8211; Law Enforcement Pathway</td><td>49</td><td>Less than 10</td></tr></table>`;
    const d = parseAaipDraws(html);
    expect(d[0]).toEqual({ date: '2026-11-02', stream: 'Rural Renewal Stream', minScore: 51, invitations: '173' });
    expect(d[2]).toMatchObject({ stream: 'Alberta Express Entry Stream – Law Enforcement Pathway', invitations: 'Less than 10' });
  });
});
