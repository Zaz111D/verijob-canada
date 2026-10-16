/**
 * « Résultats pour : <profil> — <métiers> — <provinces> (changer) » en haut des pages qui dépendent du profil,
 * pour qu'on sache toujours pour qui on cherche.
 */
import { findNoc, PROVINCE_NAMES } from '@verijob/core';
import { nocData } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { useProfile, useProfiles } from '../store';
import { profileLabel } from './Profiles';

export function ProfileBanner({ lang }: { lang: Lang }) {
  const profile = useProfile();
  const idx = useProfiles();
  const i = idx ? idx.list.findIndex((p) => p.id === idx.active) : -1;
  const name = idx && i >= 0 ? profileLabel(idx.list[i]!.name, i, lang) : '';
  const nocs = profile.targetNocs ?? [];
  const jobs = nocs.map((c) => { const n = findNoc(nocData, c); return (lang === 'fr' ? n?.jobFr : n?.jobEn) ?? c; });
  const provs = (profile.provinces ?? []).map((p) => PROVINCE_NAMES[p][lang]);
  if (!nocs.length) {
    return <p class="banner banner-empty">{tr(S.bannerNoJobs, lang)} <a href="#/profil">{tr(S.navProfile, lang)} →</a></p>;
  }
  return (
    <p class="banner">
      <span class="muted">{tr(S.bannerFor, lang)} :</span> <strong>{name}</strong>
      {' — '}{jobs.join(', ')}
      {' — '}{provs.length ? provs.join(', ') : tr(S.bannerAllProvinces, lang)}
      {' '}<a href="#/profil">({tr(S.bannerChange, lang)})</a>
    </p>
  );
}
