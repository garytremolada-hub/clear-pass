import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { CohortProvider } from '@/lib/CohortContext';
import BetaFeedbackWidget from '@/components/feedback/BetaFeedbackWidget';

export default function AppLayout() {
    return (
        <CohortProvider>
            <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden">
                    <Outlet />
                </main>
            </div>
            <BetaFeedbackWidget />
        </CohortProvider>
    );
}