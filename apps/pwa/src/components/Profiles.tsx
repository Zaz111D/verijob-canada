/**
 * Plusieurs profils sur le même téléphone (famille, amis) : choisir, créer, renommer, supprimer.
 * Tout reste sur l'appareil ; aucun compte.
 */
import { useState } from 'preact/hooks';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { createProfile, deleteProfile, renameProfile, switchProfile, useProfiles } from '../store';

export function profileLabel(name: string, index: number, lang: Lang): string {
  return name || `${tr(S.profileDefaultName, lang)}${index ? ` ${index + 1}` : ''}`;
}

/** Nom du profil actif, affiché en haut de l'écran quand il y a plusieurs profils. */
export function ActiveProfileChip() {
  const lang = useLang();
  const idx = useProfiles();
  if (!idx || idx.list.length < 2) return null;
  const i = idx.list.findIndex((p) => p.id === idx.active);
  return <a class="profile-chip" href="#/profil" title={tr(S.profileSwitchHint, lang)}>☺ {profileLabel(idx.list[i]?.name ?? '', i, lang)}</a>;
}

export function ProfileSwitcher() {
  const lang = useLang();
  const idx = useProfiles();
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string>();
  const [createName, setCreateName] = useState('');
  if (!idx) return null;
  const activeIndex = idx.list.findIndex((p) => p.id === idx.active);
  const active = idx.list[activeIndex];
  return (
    <fieldset class="profiles">
      <legend>{tr(S.profilesTitle, lang)}</legend>
      <p class="muted">{tr(S.profilesIntro, lang)}</p>
      <div class="seg" role="radiogroup" aria-label={tr(S.profilesTitle, lang)}>
        {idx.list.map((p, i) => (
          <button type="button" role="radio" aria-checked={p.id === idx.active} class={p.id === idx.active ? 'on' : ''} onClick={() => void switchProfile(p.id)}>
            {profileLabel(p.name, i, lang)}
          </button>
        ))}
      </div>
      {active && (
        <div class="row">
          {renaming === active.id ? (
            <>
              <input aria-label={tr(S.profileName, lang)} value={newName} onInput={(e) => setNewName((e.target as HTMLInputElement).value)} />
              <button type="button" class="primary" onClick={() => void renameProfile(active.id, newName).then(() => { setRenaming(undefined); setNewName(''); })}>{tr(S.save, lang)}</button>
            </>
          ) : (
            <button type="button" onClick={() => { setRenaming(active.id); setNewName(active.name); }}>{tr(S.profileRename, lang)}</button>
          )}
          {idx.list.length > 1 && (
            <button type="button" onClick={() => {
              if (confirm(tr(S.profileDeleteConfirm, lang).replace('{nom}', profileLabel(active.name, activeIndex, lang)))) void deleteProfile(active.id);
            }}>{tr(S.profileDelete, lang)}</button>
          )}
        </div>
      )}
      <form class="row" onSubmit={(e) => { e.preventDefault(); void createProfile(createName).then(() => setCreateName('')); }}>
        <input aria-label={tr(S.profileNewName, lang)} placeholder={tr(S.profileNewName, lang)} value={createName} onInput={(e) => setCreateName((e.target as HTMLInputElement).value)} />
        <button type="submit">{tr(S.profileCreate, lang)}</button>
      </form>
    </fieldset>
  );
}
