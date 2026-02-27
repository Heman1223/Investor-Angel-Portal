import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
    return (
        <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
            <Sidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
