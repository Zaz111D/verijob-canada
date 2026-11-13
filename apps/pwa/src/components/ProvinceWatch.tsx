/**
 * Veille par province : derniers tirages du programme de l'Alberta (relus chaque semaine sur alberta.ca, surtout le
 * volet rural des communautés désignées) et stratégie du Nouveau-Brunswick pour l'Afrique francophone
 * (le site du N.-B. bloque la lecture automatique : lien seulement).
 */
import { useEffect, useState } from 'preact/hooks';
import { formatDate, sourceRef, todayIso } from '@verijob/core';
import { loadAaipDraws, rules, type AaipDraw } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { Sources } from './common';

const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;
const SHOWN = 6;

export function ProvinceWatch({ lang }: { lang: Lang }) {
  const [draws, setDraws] = useState<AaipDraw[]>([]);
  useEffect(() => { loadAaipDraws().then((f) => setDraws(f.data)).catch(() => undefined); }, []);
  const today = todayIso();
  const rural = draws.find((d) => /rural renewal/i.test(d.stream));
  const nb = rules.africaRecruitment.official.find((o) => o.id === 'nouveau-brunswick');
  return (
    <>
      <h2>{tr(S.aaipTitle, lang)}</h2>
      <article class="card-result">
        {rural && <p><strong>{tr(S.aaipRural, lang).replace('{d}', formatDate(rural.date, lang)).replace('{n}', rural.invitations).replace('{s}', String(rural.minScore ?? '—'))}</strong></p>}
        {draws.length > 0 && (
          <ul class="plain">
            {draws.slice(0, SHOWN).map((d) => <li>{formatDate(d.date, lang)} — {d.stream} : {d.invitations} {lang === 'fr' ? 'invitations' : 'invitations'}{d.minScore !== null ? ` (score ≥ ${d.minScore})` : ''}</li>)}
          </ul>
        )}
        <p class="muted">{tr(S.aaipNote, lang)}</p>
        <a class="button" href={rules.sources['alberta-aaip-draws']!.urlEn!} {...ext}>alberta.ca ↗</a>
        <Sources sources={[sourceRef(rules, 'alberta-aaip-draws', today), sourceRef(rules, 'alberta-aaip-updates', today)]} />
      </article>
      {nb && (
        <>
          <h2>{tr(S.nbTitle, lang)}</h2>
          <article class="card-result">
            <p>{lang === 'fr' ? nb.detailFr : nb.detailEn}</p>
            <a class="button" href={rules.sources[nb.source]!.urlFr!} {...ext}>{tr(S.officialPage, lang)} ↗</a>
          </article>
        </>
      )}
    </>
  );
}
