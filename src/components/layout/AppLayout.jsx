import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { CohortProvider } from '@/lib/CohortContext';

export default function AppLayout() {
    return (
        <CohortProvider>
            <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden">
                    <Outlet />
                </main>
            </div>
        </CohortProvider>
    );
}