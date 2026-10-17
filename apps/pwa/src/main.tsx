import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { Layout, useRoute } from './components/common';
import { CheckConsultant } from './pages/CheckConsultant';
import { CheckCv } from './pages/CheckCv';
import { SampleCvPage } from './pages/SampleCv';
import { Apply } from './pages/Apply';
import { CheckEmployer } from './pages/CheckEmployer';
import { CheckOffer } from './pages/CheckOffer';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Prospects } from './pages/Prospects';
import { Jobs } from './pages/Jobs';
import { Watch } from './pages/Watch';
import { Tracking } from './pages/Tracking';
import { initLang, useLang } from './i18n';
import './styles.css';

function App() {
  const route = useRoute();
  useLang(); // re-rendu complet quand la langue change
  return (
    <Layout route={route}>
      {route === 'offre' ? <CheckOffer />
        : route === 'employeur' ? <CheckEmployer />
        : route === 'emplois' ? <Jobs />
        : route === 'veille' ? <Watch />
        : route === 'suivi' ? <Tracking />
        : route === 'demarcher' ? <Prospects />
        : route === 'consultant' ? <CheckConsultant />
        : route === 'profil' ? <Profile />
        : route === 'cv' ? <CheckCv />
        : route === 'cv-exemple' ? <SampleCvPage />
        : route === 'postuler' ? <Apply />
        : <Home />}
    </Layout>
  );
}

initLang();
render(<App />, document.getElementById('app')!);
// Service worker : installation et fonctionnement hors ligne (mise à jour automatique).
// Sur un téléphone, l'appli reste ouverte longtemps ou est rouverte depuis l'écran d'accueil : sans vérification,
// l'ancienne version s'affichait jusqu'à la DEUXIÈME ouverture. On vérifie donc à chaque retour dans l'appli et
// toutes les heures ; la nouvelle version prend la main et la page se recharge d'elle-même (registerType autoUpdate).
const UPDATE_EVERY_MS = 60 * 60 * 1000;
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => { if (navigator.onLine) void registration.update().catch(() => undefined); };
    setInterval(check, UPDATE_EVERY_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  },
});
