import { STRINGS as S, tr, useLang } from '../i18n';

const CARDS = [
  { href: '#/offre', title: S.cardOfferTitle, text: S.cardOfferText },
  { href: '#/employeur', title: S.cardEmployerTitle, text: S.cardEmployerText },
  { href: '#/consultant', title: S.cardConsultantTitle, text: S.cardConsultantText },
  { href: '#/profil', title: S.cardProfileTitle, text: S.cardProfileText },
];

export function Home() {
  const lang = useLang();
  return (
    <section>
      <h1>{tr(S.homeTitle, lang)}</h1>
      <p>{tr(S.homeIntro, lang)}</p>
      <p class="callout">{tr(S.homeRule, lang)}</p>
      <div class="cards">
        {CARDS.map((c) => (
          <a class="card" href={c.href}>
            <strong>{tr(c.title, lang)}</strong>
            <span>{tr(c.text, lang)}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
