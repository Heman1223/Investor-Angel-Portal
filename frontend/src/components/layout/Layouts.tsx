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
  background: var(--navy, #060d19);
  position: relative;
}

/* Ambient glow orbs */
.ml-shell::before {
  content: '';
  position: fixed;
  top: -120px;
  left: -80px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(212,168,67,0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.ml-shell::after {
  content: '';
  position: fixed;
  bottom: -160px;
  right: -100px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(96,165,250,0.025) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Body (right of sidebar) */
.ml-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  position: relative;
  z-index: 1;
}

/* Scrollable main */
.ml-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: transparent;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(212,168,67,0.04) 1px, transparent 0);
  background-size: 40px 40px;
  scrollbar-width: thin;
  scrollbar-color: rgba(212,168,67,0.15) transparent;
}
.ml-main::-webkit-scrollbar { width: 5px; }
.ml-main::-webkit-scrollbar-track { background: transparent; }
.ml-main::-webkit-scrollbar-thumb { background: rgba(212,168,67,0.15); border-radius: 10px; }
.ml-main::-webkit-scrollbar-thumb:hover { background: rgba(212,168,67,0.3); }

/* Content wrapper */
.ml-content {
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 44px 64px;
  min-height: 100%;
  animation: ml-page-in 0.45s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
}

/* Simple layout main */
.ml-simple-main {
  flex: 1;
  overflow-y: auto;
  padding: 32px 44px 64px;
  background: transparent;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(212,168,67,0.04) 1px, transparent 0);
  background-size: 40px 40px;
}

/* Global page fade */
@keyframes ml-page-in {
  from { opacity: 0; transform: translateY(10px); }
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
