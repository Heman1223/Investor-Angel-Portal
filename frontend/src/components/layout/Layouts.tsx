// ─────────────────────────────────────────────────────────────────────────
// Layout.tsx  — Simple layout (sidebar only, no header)
// ─────────────────────────────────────────────────────────────────────────
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { MobileMenuProvider } from '../../context/MobileMenuContext';

export function Layout() {
  return (
    <MobileMenuProvider>
      <style>{BASE_CSS}</style>
      <div className="ml-shell">
        <Sidebar />
        <main className="ml-simple-main">
          <Outlet />
        </main>
      </div>
    </MobileMenuProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MainLayout.tsx  — Full layout with sidebar + sticky header
// ─────────────────────────────────────────────────────────────────────────
import Header from './Header';

export default function MainLayout() {
  return (
    <MobileMenuProvider>
      <style>{BASE_CSS}</style>
      <div className="ml-shell">
        <Sidebar />
        <div className="ml-body">
          <Header />
          <main className="ml-main">
            <div className="ml-content">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </MobileMenuProvider>
  );
}

const BASE_CSS = `
/* Shell */
.ml-shell {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--navy, #0B1221);
}

/* Body (right of sidebar) */
.ml-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  min-width: 0;
}

/* Scrollable main */
.ml-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--navy, #0B1221);
  background-image:
    linear-gradient(rgba(197,164,84,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(197,164,84,0.02) 1px, transparent 1px);
  background-size: 48px 48px;
  scrollbar-width: thin;
  scrollbar-color: rgba(197,164,84,0.2) transparent;
}
.ml-main::-webkit-scrollbar { width: 4px; }
.ml-main::-webkit-scrollbar-track { background: transparent; }
.ml-main::-webkit-scrollbar-thumb { background: rgba(197,164,84,0.2); border-radius: 10px; }
.ml-main::-webkit-scrollbar-thumb:hover { background: rgba(197,164,84,0.4); }

/* Content wrapper */
.ml-content {
  max-width: 1440px;
  margin: 0 auto;
  padding: 36px 48px 64px;
  min-height: 100%;
}

/* Simple layout main */
.ml-simple-main {
  flex: 1;
  overflow-y: auto;
  padding: 36px 48px 64px;
  background: var(--navy, #0B1221);
  background-image:
    linear-gradient(rgba(197,164,84,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(197,164,84,0.02) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* Global page fade */
.page-enter {
  animation: ml-page-in 0.4s ease;
}
@keyframes ml-page-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Responsive */
@media (max-width: 768px) {
  .ml-content, .ml-simple-main { padding: 16px 16px 48px; }
  .ml-shell { flex-direction: column; }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .ml-content, .ml-simple-main { padding: 24px 24px 48px; }
}
`;
