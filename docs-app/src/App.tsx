import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect, lazy, Suspense } from 'react';
import { enableSmoothScrollForAnchors } from './lib/animation/smooth-scroll';
import { ScrollToTop, ProgressBar, Header } from './components/layout';
import './App.css';

// Lazy load pages for code splitting
const HubPage = lazy(() => import('./pages').then(m => ({ default: m.HubPage })));
const ApiPage = lazy(() => import('./pages').then(m => ({ default: m.ApiPage })));
const TechnicalPage = lazy(() => import('./pages').then(m => ({ default: m.TechnicalPage })));
const AuthPage = lazy(() => import('./pages').then(m => ({ default: m.AuthPage })));
const ClientPage = lazy(() => import('./pages').then(m => ({ default: m.ClientPage })));
const ServerPage = lazy(() => import('./pages').then(m => ({ default: m.ServerPage })));
const DatabasePage = lazy(() => import('./pages').then(m => ({ default: m.DatabasePage })));
const GamesPage = lazy(() => import('./pages').then(m => ({ default: m.GamesPage })));
const SocialPage = lazy(() => import('./pages').then(m => ({ default: m.SocialPage })));
const StatsPage = lazy(() => import('./pages').then(m => ({ default: m.StatsPage })));
const SubscriptionPage = lazy(() => import('./pages').then(m => ({ default: m.SubscriptionPage })));
const DeployPage = lazy(() => import('./pages').then(m => ({ default: m.DeployPage })));
const DesignPage = lazy(() => import('./pages').then(m => ({ default: m.DesignPage })));
const GuidesPage = lazy(() => import('./pages').then(m => ({ default: m.GuidesPage })));
const StartHerePage = lazy(() => import('./pages').then(m => ({ default: m.StartHerePage })));
const InstructionPage = lazy(() => import('./pages').then(m => ({ default: m.InstructionPage })));
const DocsGuidePage = lazy(() => import('./pages').then(m => ({ default: m.DocsGuidePage })));
const McpSetupPage = lazy(() => import('./pages').then(m => ({ default: m.McpSetupPage })));
const UpdatePlanPage = lazy(() => import('./pages').then(m => ({ default: m.UpdatePlanPage })));
const FinalTasksPage = lazy(() => import('./pages').then(m => ({ default: m.FinalTasksPage })));
const PlanPage = lazy(() => import('./pages/PlanPage').then(m => ({ default: m.PlanPage })));
const BugDetailPage = lazy(() => import('./pages/BugDetailPage').then(m => ({ default: m.BugDetailPage })));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="loading-fallback">
      <div className="loading-spinner" />
      <p>Loading...</p>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HubPage />} />
          <Route path="/api" element={<ApiPage />} />
          <Route path="/technical" element={<TechnicalPage />}>
            <Route path="auth" element={<AuthPage />} />
            <Route path="client" element={<ClientPage />} />
            <Route path="server" element={<ServerPage />} />
            <Route path="database" element={<DatabasePage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="social" element={<SocialPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="deploy" element={<DeployPage />} />
            <Route path="design" element={<DesignPage />} />
          </Route>
          <Route path="/guides" element={<GuidesPage />}>
            <Route path="start-here" element={<StartHerePage />} />
            <Route path="instruction" element={<InstructionPage />} />
            <Route path="docs-guide" element={<DocsGuidePage />} />
            <Route path="mcp-setup" element={<McpSetupPage />} />
            <Route path="update-plan" element={<UpdatePlanPage />} />
            <Route path="final-tasks" element={<FinalTasksPage />} />
          </Route>
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/plan/bug/:bugId" element={<BugDetailPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  // Enable smooth scroll for anchor links
  useEffect(() => {
    const cleanup = enableSmoothScrollForAnchors({ duration: 800, offset: 80 });
    return cleanup;
  }, []);

  return (
    <Router>
      <div className="app">
        {/* Reading progress bar */}
        <ProgressBar />
        
        {/* Header with theme and language toggles */}
        <Header />

        <main className="app-main">
          <AnimatedRoutes />
        </main>

        {/* Scroll to top button */}
        <ScrollToTop />
      </div>
    </Router>
  );
}

export default App;
