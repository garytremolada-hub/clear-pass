import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { Home, Library, Settings, Menu, X, Ruler, PlayCircle, ClipboardCheck, Layers, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Level Check', path: '/level-check', icon: Ruler },
    { label: 'Build Assessment', path: '/build', icon: Layers },
    { label: 'Evaluate', path: '/evaluate', icon: ClipboardCheck },
    { label: 'Work Library', path: '/library', icon: Library },
    { label: 'How It Works', path: '/how-it-works', icon: PlayCircle },
    { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
    }, []);

    return (
        <>
            {/* Mobile toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-3 left-3 z-50 md:hidden text-white hover:bg-white/10"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed md:static inset-y-0 left-0 z-40 w-56 flex flex-col transition-transform duration-200",
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
                style={{ backgroundColor: '#0d2444' }}
            >
                {/* Logo */}
                <div className="p-5 pb-6">
                    <span
                        style={{
                            color: '#c9a84c',
                            letterSpacing: '2px',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}
                    >
                        CLEARPASS
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-0.5">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                                    isActive
                                        ? "font-medium"
                                        : "hover:bg-white/5"
                                )}
                                style={{
                                    backgroundColor: isActive ? '#162d50' : undefined,
                                    color: isActive ? '#c9a84c' : '#ffffff',
                                }}
                            >
                                <item.icon
                                    className="h-4 w-4 shrink-0"
                                    style={{ color: isActive ? '#c9a84c' : '#8ba4c4' }}
                                />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Admin: Beta Feedback link */}
                {isAdmin && (
                    <div className="px-3 pb-2">
                        <Link
                            to="/beta-feedback"
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                                location.pathname === '/beta-feedback' ? "font-medium" : "hover:bg-white/5"
                            )}
                            style={{
                                backgroundColor: location.pathname === '/beta-feedback' ? '#162d50' : undefined,
                                color: location.pathname === '/beta-feedback' ? '#c9a84c' : '#8ba4c4',
                            }}
                        >
                            <FlaskConical className="h-4 w-4 shrink-0" style={{ color: location.pathname === '/beta-feedback' ? '#c9a84c' : '#8ba4c4' }} />
                            Beta Feedback
                        </Link>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t" style={{ borderColor: '#162d50' }} />
            </aside>
        </>
    );
}