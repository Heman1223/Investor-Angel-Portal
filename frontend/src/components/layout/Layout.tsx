import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
    return (
        <div className="flex min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
            <Sidebar />
            <main className="flex-1 ml-[220px] p-6 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
