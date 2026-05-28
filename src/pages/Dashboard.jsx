import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, PenLine, ClipboardCheck, Hammer, Search, CheckSquare, FileEdit, ArrowRight, TrendingUp, FileText, BookOpen } from 'lucide-react';
import { BAND_CONFIG, getBandForFkgl } from '@/lib/parseReadabilityResult';
import { format } from 'date-fns';

const taskColors = {
    score:    { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: BarChart3 },
    rewrite:  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: PenLine },
    evaluate: { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',icon: ClipboardCheck },
    build:    { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Hammer },
};

function StatCard({ value, label, icon: Icon, color }) {
    return (
        <div className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <div className="text-2xl font-bold text-[#1e3a5f] tabular-nums">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
        </div>
    );
}

function BandPill({ fkgl }) {
    const band = getBandForFkgl(fkgl);
    if (!band) return null;
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: band.color }}
        >
            {band.name}
        </span>
    );
}

function RecentScoreRow({ item }) {
    const cfg = taskColors[item.task_type] || taskColors.score;
    const Icon = cfg.icon;
    return (
        <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.text}`}>
                <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    {item.unit_code && (
                        <span className="text-[10px] text-muted-foreground">{item.unit_code}</span>
                    )}
                    {item.created_date && (
                        <span className="text-[10px] text-muted-foreground">
                            {item.unit_code ? '·' : ''} {format(new Date(item.created_date), 'dd MMM')}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {item.fkgl != null && <BandPill fkgl={item.fkgl} />}
                {item.fkgl != null && (
                    <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                        {item.fkgl.toFixed(1)}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();

    const { data: items = [] } = useQuery({
        queryKey: ['workLibrary'],
        queryFn: () => base44.entities.WorkLibraryItem.list('-created_date', 100),
    });

    // Stats
    const total = items.length;
    const totalEvaluate = items.filter(i => i.task_type === 'evaluate').length;
    const totalScore = items.filter(i => i.task_type === 'score' || i.task_type === 'rewrite').length;
    const totalBuild = items.filter(i => i.task_type === 'build').length;

    // Recent items with a score
    const recentScored = items
        .filter(i => i.fkgl != null)
        .slice(0, 6);

    return (
        <div className="flex-1 overflow-y-auto bg-[#f6f8fb]">
            <div className="max-w-4xl mx-auto px-5 py-8 space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-[#1e3a5f]">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Your assessment activity at a glance.</p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard value={total}         label="Total saved"        icon={FileText}      color="bg-[#1e3a5f]/10 text-[#1e3a5f]" />
                    <StatCard value={totalEvaluate} label="Assessments audited" icon={ClipboardCheck} color="bg-emerald-50 text-emerald-700" />
                    <StatCard value={totalScore}    label="Texts scored"        icon={BarChart3}      color="bg-blue-50 text-blue-700" />
                    <StatCard value={totalBuild}    label="Assessments built"   icon={Hammer}         color="bg-amber-50 text-amber-700" />
                </div>

                {/* Main content row */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5 items-start">

                    {/* Recent scores */}
                    <div className="bg-white rounded-2xl border shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-[#1e3a5f]">Recent document scores</h2>
                            {items.length > 0 && (
                                <button
                                    onClick={() => navigate('/library')}
                                    className="text-xs text-muted-foreground hover:text-[#1e3a5f] flex items-center gap-1 transition-colors"
                                >
                                    View all <ArrowRight className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {recentScored.length === 0 ? (
                            <div className="py-10 text-center">
                                <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No scored documents yet.</p>
                                <p className="text-xs text-muted-foreground mt-1">Complete a task in the chat and save it to see scores here.</p>
                            </div>
                        ) : (
                            <div>
                                {recentScored.map(item => (
                                    <RecentScoreRow key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick-start tasks */}
                    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-2">
                        <h2 className="font-semibold text-[#1e3a5f] mb-4">Start a task</h2>

                        {[
                            { label: 'Check readability', sub: 'Score text against AQF levels', icon: Search,      color: 'bg-[#1e3a5f]',   prompt: 'I want to score some text for readability.', cohort: false },
                            { label: 'Audit assessment',  sub: 'Check evidence + compliance gaps', icon: CheckSquare, color: 'bg-emerald-600', prompt: 'I want to evaluate an existing assessment against a UoC.', cohort: true },
                            { label: 'Build assessment',  sub: 'Generate from a UoC',               icon: FileEdit,    color: 'bg-violet-600',  prompt: 'I want to build a new assessment from a UoC.', cohort: true },
                        ].map(task => (
                            <button
                                key={task.label}
                                onClick={() => navigate('/', { state: { quickPrompt: task.prompt, cohort: task.cohort } })}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                            >
                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${task.color}`}>
                                    <task.icon className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{task.label}</p>
                                    <p className="text-[11px] text-muted-foreground">{task.sub}</p>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                        ))}

                        <div className="pt-2 border-t">
                            <button
                                onClick={() => navigate('/')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                            >
                                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">Open chat</p>
                                    <p className="text-[11px] text-muted-foreground">Describe what you need</p>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* AQF band legend — linear scale */}
                <div className="bg-white rounded-2xl border shadow-sm p-5">
                    <h2 className="font-semibold text-[#1e3a5f] mb-4">Readability band reference</h2>
                    {/* Colour bar */}
                    <div className="flex rounded-lg overflow-hidden h-5">
                        {BAND_CONFIG.map(band => (
                            <div
                                key={band.name}
                                className="flex-1"
                                style={{ backgroundColor: band.color }}
                            />
                        ))}
                    </div>
                    {/* Labels */}
                    <div className="flex mt-2">
                        {BAND_CONFIG.map(band => (
                            <div key={band.name} className="flex-1 min-w-0 px-0.5">
                                <p className="text-[10px] font-medium text-foreground leading-tight truncate">{band.name}</p>
                                <p className="text-[9px] text-muted-foreground leading-tight truncate">{band.aqf}</p>
                            </div>
                        ))}
                    </div>
                    {/* FKGL axis */}
                    <div className="flex mt-1">
                        {BAND_CONFIG.map(band => (
                            <div key={band.name} className="flex-1 min-w-0 px-0.5">
                                <p className="text-[9px] text-muted-foreground tabular-nums">{band.fkglMin}</p>
                            </div>
                        ))}
                        <p className="text-[9px] text-muted-foreground tabular-nums">17+</p>
                    </div>
                </div>

            </div>
        </div>
    );
}