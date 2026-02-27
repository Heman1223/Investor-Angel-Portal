import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
    return (
        <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
            <Sidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
                <Header />
                <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-6">
                    <div className="max-w-[1360px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
