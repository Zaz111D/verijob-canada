import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { Layout, useRoute } from './components/common';
import { CheckConsultant } from './pages/CheckConsultant';
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
        : <Home />}
    </Layout>
  );
}

initLang();
render(<App />, document.getElementById('app')!);
// Service worker : installation et fonctionnement hors ligne (mise à jour automatique).
registerSW({ immediate: true });
