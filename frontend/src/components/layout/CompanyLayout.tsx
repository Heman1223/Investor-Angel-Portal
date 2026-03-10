import { Outlet } from 'react-router-dom';
import CompanySidebar from './CompanySidebar';
import CompanyHeader from './CompanyHeader';
import { MobileMenuProvider } from '../../context/MobileMenuContext';

export default function CompanyLayout() {
    return (
        <MobileMenuProvider>
            <style>{LAYOUT_CSS}</style>
            <div className="cl-shell">
                <CompanySidebar />
                <div className="cl-body">
                    <CompanyHeader />
                    <main className="cl-main">
                        <div className="cl-content">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </MobileMenuProvider>
    );
}

const LAYOUT_CSS = `
.cl-shell {
  display: flex;
  min-height: 100vh;
  background-color: #060d19;
  color: #f0e6d0;
  overflow: hidden;
  position: relative;
}

/* Background detail */
.cl-shell::after {
  content: '';
  position: fixed;
  top: 0;
  right: 0;
  width: 40vw;
  height: 100vh;
  background: radial-gradient(circle at 70% 30%, rgba(212, 168, 67, 0.03) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.cl-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  position: relative;
  z-index: 10;
}

.cl-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 32px;
  scroll-behavior: smooth;
  background: radial-gradient(circle at top right, rgba(212, 168, 67, 0.02) 0%, transparent 40%);
}

.cl-content {
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100%;
  animation: cl-page-entry 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cl-page-entry {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.99);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

/* Custom Scrollbar for the main area */
.cl-main::-webkit-scrollbar {
  width: 6px;
}
.cl-main::-webkit-scrollbar-track {
  background: transparent;
}
.cl-main::-webkit-scrollbar-thumb {
  background: rgba(212, 168, 67, 0.1);
  border-radius: 10px;
}
.cl-main::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 168, 67, 0.2);
}

@media (max-width: 768px) {
  .cl-main {
    padding: 20px 16px;
  }
}
`;
