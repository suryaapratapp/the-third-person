import AppShell from './components/AppShell.jsx';
import { Suspense, lazy, useEffect } from 'react';
import HomePage from './pages/HomePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useRouter } from './state/RouterContext.jsx';
import { applyRouteSeo } from './lib/seo.js';

const NewAnalysisPage = lazy(() => import('./pages/NewAnalysisPage.jsx'));
const ResultPage = lazy(() => import('./pages/ResultPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.jsx'));
const TermsPage = lazy(() => import('./pages/TermsPage.jsx'));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage.jsx'));
const CompanyPage = lazy(() => import('./pages/CompanyPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const PersonalityCardPage = lazy(() => import('./pages/PersonalityCardPage.jsx'));
const VisionPage = lazy(() => import('./pages/VisionPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const FaqsPage = lazy(() => import('./pages/FaqsPage.jsx'));
const BestieBotPage = lazy(() => import('./pages/BestieBotPage.jsx'));
const PricingPage = lazy(() => import('./pages/PricingPage.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));

function PageLoading() {
  return (
    <section className="flex min-h-screen items-center justify-center px-4 pt-28">
      <div className="thin-panel max-w-md p-6 text-center">
        <p className="tech-label text-smoke">ThirdPerson AI</p>
        <p className="mt-4 text-sm leading-7 text-smoke">Preparing your page…</p>
      </div>
    </section>
  );
}

function RouteSwitch() {
  const { path } = useRouter();

  useEffect(() => {
    applyRouteSeo(path);
  }, [path]);

  if (path === '/auth') return <AuthPage />;
  if (path === '/analysis/new') return <ProtectedRoute><NewAnalysisPage /></ProtectedRoute>;
  if (path === '/analysis/result') return <ProtectedRoute><ResultPage /></ProtectedRoute>;
  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/terms') return <TermsPage />;
  if (path === '/refund-policy') return <RefundPolicyPage />;
  if (path === '/company') return <CompanyPage />;
  if (path === '/profile') return <ProtectedRoute><ProfilePage /></ProtectedRoute>;
  if (path === '/personality-card') return <ProtectedRoute><PersonalityCardPage /></ProtectedRoute>;
  if (path === '/vision') return <VisionPage />;
  if (path === '/reports') return <ProtectedRoute><ReportsPage /></ProtectedRoute>;
  if (path.startsWith('/reports/') && (path.endsWith('/broski') || path.endsWith('/bestie'))) {
    const chainId = decodeURIComponent(path.replace('/reports/', '').replace('/broski', '').replace('/bestie', ''));
    return <ProtectedRoute><BestieBotPage chainId={chainId} /></ProtectedRoute>;
  }
  if (path === '/faqs') return <FaqsPage />;
  if (path === '/pricing') return <PricingPage />;
  return <HomePage />;
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<PageLoading />}>
        <RouteSwitch />
      </Suspense>
    </AppShell>
  );
}
