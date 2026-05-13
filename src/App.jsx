import AppShell from './components/AppShell.jsx';
import HomePage from './pages/HomePage.jsx';
import NewAnalysisPage from './pages/NewAnalysisPage.jsx';
import LoadingPage from './pages/LoadingPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import CompanyPage from './pages/CompanyPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PersonalityCardPage from './pages/PersonalityCardPage.jsx';
import VisionPage from './pages/VisionPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import FaqsPage from './pages/FaqsPage.jsx';
import BestieBotPage from './pages/BestieBotPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useRouter } from './state/RouterContext.jsx';

function RouteSwitch() {
  const { path } = useRouter();

  if (path === '/auth') return <AuthPage />;
  if (path === '/analysis/new') return <ProtectedRoute><NewAnalysisPage /></ProtectedRoute>;
  if (path === '/analysis/loading') return <ProtectedRoute><LoadingPage /></ProtectedRoute>;
  if (path === '/analysis/result') return <ProtectedRoute><ResultPage /></ProtectedRoute>;
  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/company') return <CompanyPage />;
  if (path === '/profile') return <ProtectedRoute><ProfilePage /></ProtectedRoute>;
  if (path === '/personality-card') return <ProtectedRoute><PersonalityCardPage /></ProtectedRoute>;
  if (path === '/vision') return <VisionPage />;
  if (path === '/reports') return <ProtectedRoute><ReportsPage /></ProtectedRoute>;
  if (path.startsWith('/reports/') && path.endsWith('/bestie')) {
    const chainId = decodeURIComponent(path.replace('/reports/', '').replace('/bestie', ''));
    return <ProtectedRoute><BestieBotPage chainId={chainId} /></ProtectedRoute>;
  }
  if (path === '/faqs') return <FaqsPage />;
  if (path === '/pricing') return <PricingPage />;
  return <HomePage />;
}

export default function App() {
  return (
    <AppShell>
      <RouteSwitch />
    </AppShell>
  );
}
