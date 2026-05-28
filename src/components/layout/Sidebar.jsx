import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquareText, Library, BarChart3, FileText, PenLine, ClipboardCheck, Hammer, Menu, X, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
{ label: 'New Session', path: '/', icon: MessageSquareText },
{ label: 'Work Library', path: '/library', icon: Library },
{ label: 'Pricing', path: '/pricing', icon: CreditCard }];


const modeItems = [
{ label: 'Score', icon: BarChart3, description: 'Score text readability' },
{ label: 'Rewrite', icon: PenLine, description: 'Rewrite to target level' },
{ label: 'Evaluate', icon: ClipboardCheck, description: 'Audit an assessment' },
{ label: 'Build', icon: Hammer, description: 'Create new assessment' }];


export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
            {/* Mobile toggle */}
            <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}>
        
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Overlay */}
            {mobileOpen &&
      <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      }

            {/* Sidebar */}
            <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-64 bg-card border-r flex flex-col transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
                {/* Logo */}
                <div className="p-5 border-b">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm tracking-tight">RTO Readability</h1>
                            <p className="text-[11px] text-muted-foreground">AQF Assessment Tool v24</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) =>
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              location.pathname === item.path ?
              "bg-primary/10 text-primary font-medium" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}>
            
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
          )}

                    <div className="pt-4 pb-2">
                        <p className="px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Modes</p>
                    </div>
                    {modeItems.map((item) =>
          <div
            key={item.label}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground">
            
                            <item.icon className="h-4 w-4" />
                            <div>
                                <p className="text-foreground/70 text-xs font-medium">{item.label}</p>
                                <p className="text-[10px]">{item.description}</p>
                            </div>
                        </div>
          )}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t">
                    <p className="text-[10px] text-muted-foreground text-center">
                        Scores are AI-estimated. Use for guidance only.
                    </p>
                </div>
            </aside>
        </>);

}