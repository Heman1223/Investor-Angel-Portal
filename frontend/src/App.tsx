import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PortfolioPage from './pages/PortfolioPage';
import StartupDetailPage from './pages/StartupDetailPage';
import AlertsPage from './pages/AlertsPage';
import DocumentsPage from './pages/DocumentsPage';
import SettingsPage from './pages/SettingsPage';
import ComparisonPage from './pages/ComparisonPage';
import ReportsPage from './pages/ReportsPage';
import ScenarioPage from './pages/ScenarioPage';
import InvitePage from './pages/InvitePage';
import './index.css';
import MainLayout from './components/layout/Layouts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="animate-pulse" style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: 16, letterSpacing: '0.24em', color: 'var(--color-primary)', fontWeight: 600 }}>ANGEL</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

import CompanyLayout from './components/layout/CompanyLayout';
import CompanyDashboard from './pages/CompanyDashboard';
import CompanyUpdates from './pages/CompanyUpdates';
import CompanyUpdateForm from './pages/CompanyUpdateForm';
import CompanyMessaging from './pages/CompanyMessaging';

function AppRoutes() {
  const { investor } = useAuth();

  if (!investor) return null; // Wait for auth check

  // Route companies to their portal
  if (investor.role === 'COMPANY_USER') {
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/company/dashboard" />} />
        <Route path="/" element={<Navigate to="/company/dashboard" />} />
        <Route path="/company" element={<PrivateRoute><CompanyLayout /></PrivateRoute>}>
          <Route path="dashboard" element={<CompanyDashboard />} />
          <Route path="updates" element={<CompanyUpdates />} />
          <Route path="updates/new" element={<CompanyUpdateForm />} />
          <Route path="updates/:id" element={<CompanyUpdateForm />} />
          <Route path="messaging" element={<CompanyMessaging />} />
        </Route>
        <Route path="*" element={<Navigate to="/company/dashboard" />} />
      </Routes>
    );
  }

  // Route investors to the main app
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" />} />
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="portfolio/:id" element={<StartupDetailPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="compare" element={<ComparisonPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="scenarios" element={<ScenarioPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

// Wrapper to handle unauthenticated state (Login) or authenticated (Routes)
function RootRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="animate-pulse" style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: 16, letterSpacing: '0.24em', color: 'var(--color-primary)', fontWeight: 600 }}>ANGEL</div>
      </div>
    );
  }

  // If not authenticated, only show login (and later invite links)
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // If authenticated, show role-specific routes
  return <AppRoutes />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <RootRouter />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
