import { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BAND_CONFIG, getBandForFkgl, getBandIndex } from '@/lib/parseReadabilityResult';

// ─── Band scale ──────────────────────────────────────────────────────────────

// Calculate % position across the full bar for a given FKGL value
function fkglToPercent(fkgl) {
    const MIN = 0;
    const MAX = 20; // anything ≥17 lands in last band; cap at 20 for visual
    const clamped = Math.min(Math.max(fkgl, MIN), MAX);
    return ((clamped - MIN) / (MAX - MIN)) * 100;
}

function ScaleBar({ fkgl, rewriteFkgl }) {
    const activeBandIdx = getBandIndex(fkgl);
    const rewriteBandIdx = rewriteFkgl != null ? getBandIndex(rewriteFkgl) : -1;
    const band = getBandForFkgl(fkgl);

    const primaryPct  = fkgl != null ? fkglToPercent(fkgl) : null;
    const rewritePct  = rewriteFkgl != null ? fkglToPercent(rewriteFkgl) : null;

    return (
        <div>
            {/* Marker row — sits above the bar */}
            <div className="relative w-full h-5 mb-0.5">
                {primaryPct != null && (
                    <div
                        className="absolute -translate-x-1/2"
                        style={{ left: `${primaryPct}%` }}
                    >
                        <span style={{ fontSize: '16px', color: '#1e3a5f', lineHeight: 1 }}>▼</span>
                    </div>
                )}
                {rewritePct != null && (
                    <div
                        className="absolute -translate-x-1/2"
                        style={{ left: `${rewritePct}%` }}
                    >
                        <span style={{ fontSize: '16px', color: '#15803d', lineHeight: 1 }}>▼</span>
                    </div>
                )}
            </div>

            {/* Band segments */}
            <div className="flex rounded-lg overflow-hidden h-5 w-full">
                {BAND_CONFIG.map((b, i) => (
                    <div
                        key={b.name}
                        className="flex-1 relative"
                        style={{ backgroundColor: b.color }}
                        title={`${b.name} (${b.gradeRange})`}
                    />
                ))}
            </div>

            {/* Band labels — tiny, below */}
            <div className="flex w-full mt-0.5">
                {BAND_CONFIG.map((b, i) => (
                    <div
                        key={b.name}
                        className={cn(
                            "flex-1 text-center leading-tight",
                            i === activeBandIdx ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}
                        style={{ fontSize: '9px' }}
                    >
                        {b.name.split(' ·')[0]}
                    </div>
                ))}
            </div>

            {/* Active band detail */}
            {band && (
                <div className="mt-1.5 text-center">
                    <span className="font-semibold text-sm text-foreground">{band.name}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">— {band.gradeRange} · {band.aqf}</span>
                </div>
            )}

            {/* Legend */}
            {rewriteBandIdx >= 0 && (
                <div className="flex gap-4 justify-center mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span style={{ color: '#1e3a5f', fontSize: '12px' }}>▼</span>
                        Original
                    </span>
                    <span className="flex items-center gap-1">
                        <span style={{ color: '#15803d', fontSize: '12px' }}>▼</span>
                        Rewrite
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── Traffic light ────────────────────────────────────────────────────────────

function TrafficLight({ tl, onRewrite }) {
    if (!tl) return null;

    const diff = tl.targetFkgl != null ? (tl.fkgl - tl.targetFkgl) : null;
    const absDiff = diff != null ? Math.abs(diff).toFixed(1) : null;
    const direction = diff != null ? (diff > 0 ? 'above' : 'below') : null;

    const config = {
        green: {
            bg: 'bg-green-600',
            icon: '✓',
            label: 'Within range for your cohort',
            sub: tl.targetFkgl != null
                ? `FKGL ${tl.fkgl} is within ±1.5 of your target FKGL ${tl.targetFkgl}`
                : 'Text is within expected readability range.',
        },
        amber: {
            bg: 'bg-amber-500',
            icon: '⚠',
            label: 'Outside expected range',
            sub: tl.targetFkgl != null
                ? `FKGL ${tl.fkgl} is ${absDiff} grade levels ${direction} your target. Assessor review recommended.`
                : 'Text is outside expected readability range. Assessor review recommended.',
        },
        red: {
            bg: 'bg-red-600',
            icon: '✗',
            label: 'Material readability concern',
            sub: tl.targetFkgl != null
                ? `FKGL ${tl.fkgl} is ${absDiff} grade levels ${direction} your target. Must be addressed before use.`
                : 'Text has a significant readability concern. Must be addressed before use.',
        },
    }[tl.status];

    return (
        <div className={cn('rounded-xl px-4 py-3 text-white', config.bg)}>
            <div className="font-semibold text-sm">
                {config.icon} {config.label}
            </div>
            <div className="text-xs mt-0.5 opacity-90">{config.sub}</div>
            {(tl.status === 'amber' || tl.status === 'red') && onRewrite && (
                <button
                    onClick={onRewrite}
                    className="mt-2 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-medium hover:bg-[#152d4d] transition-colors"
                >
                    Rewrite this section
                </button>
            )}
        </div>
    );
}

// ─── Single result card ───────────────────────────────────────────────────────

export function ResultCard({ result, headerLabel, headerColor, rewriteFkgl, onRewrite, onSaveToLibrary }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white dark:bg-card border rounded-2xl shadow-sm overflow-hidden">
            {/* Optional coloured header bar */}
            {headerLabel && (
                <div
                    className="px-4 py-2 text-white text-xs font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: headerColor || '#1e3a5f' }}
                >
                    {headerLabel}
                </div>
            )}

            <div className="p-4 space-y-4">
                {/* Section 1 — Headline */}
                {(() => {
                    const band = getBandForFkgl(result.fkgl);
                    const bandDescriptions = {
                        'Very Easy':         'below AQF entry — primary to early secondary',
                        'Easy':              'below AQF entry — upper primary to Year 6',
                        'Fairly Easy':       'below AQF entry — Year 7–8',
                        'Cert I/II · Yr 10': 'AQF 1–2 — suitable for foundation VET learners',
                        'Cert III/IV':       'AQF 3–4 — suitable for vocational learners',
                        'Diploma':           'AQF 5–6 — suitable for advanced VET learners',
                        'Degree / Grad Dip': 'AQF 7–8 — suitable for undergraduate students',
                        'Very Difficult':    'AQF 9–10 — postgraduate level',
                    };
                    const desc = band ? bandDescriptions[band.name] : null;
                    const headline = band && desc
                        ? `This document reads at ${band.name} level (${desc}).`
                        : result.summary;
                    return headline ? (
                        <p className="text-base font-bold text-[#1e3a5f] dark:text-foreground leading-snug">
                            {headline}
                        </p>
                    ) : null;
                })()}

                {/* Section 2 — Scale */}
                <div className="pt-3">
                    <ScaleBar fkgl={result.fkgl} rewriteFkgl={rewriteFkgl} />
                </div>

                {/* Section 3 — Three key stats */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <div className="font-mono text-2xl font-bold text-[#1e3a5f] dark:text-foreground tabular-nums">
                            {result.fkgl?.toFixed(1) ?? '—'}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                            Reading Grade Level
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight italic">
                            (higher = harder to read)
                        </div>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <div className="font-mono text-2xl font-bold text-[#1e3a5f] dark:text-foreground tabular-nums">
                            {result.fre?.toFixed(1) ?? '—'}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                            Reading Ease Score
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight italic">
                            (higher = easier to read)
                        </div>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <div className="font-mono text-2xl font-bold text-[#1e3a5f] dark:text-foreground tabular-nums">
                            {result.words != null ? result.words.toLocaleString() : '—'}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                            Words
                        </div>
                    </div>
                </div>

                {/* Section 4 — Traffic light */}
                {result.trafficLight && (
                    <TrafficLight tl={result.trafficLight} onRewrite={onRewrite} />
                )}

                {/* Section 5 — Expandable detail */}
                {result.fullDetail && (
                    <div>
                        <button
                            onClick={() => setExpanded(v => !v)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {expanded ? 'Hide full analysis' : 'Show full analysis'}
                        </button>
                        {expanded && (
                            <pre className="mt-2 text-xs font-mono bg-muted/50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed text-foreground/80 overflow-x-auto">
                                {result.fullDetail}
                            </pre>
                        )}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5 dark:border-primary dark:text-primary"
                        onClick={onSaveToLibrary}
                    >
                        Save to library
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1 bg-[#1e3a5f] hover:bg-[#152d4d] text-white dark:bg-primary"
                        onClick={onRewrite}
                    >
                        Rewrite to different level
                    </Button>
                </div>

                {/* Nearest benchmark */}
                {result.benchmark && (
                    <p className="text-[11px] text-muted-foreground italic">
                        Nearest benchmark: {result.benchmark}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Before / After pair ──────────────────────────────────────────────────────

export function BeforeAfterCards({ before, after, onRewrite, onSaveToLibrary }) {
    const beforeBand = getBandForFkgl(before.fkgl);
    const afterBand  = getBandForFkgl(after.fkgl);
    const diff       = after.fkgl != null && before.fkgl != null
        ? (before.fkgl - after.fkgl).toFixed(1)
        : null;
    const direction  = diff != null
        ? (parseFloat(diff) > 0 ? 'simpler' : 'more complex')
        : null;

    return (
        <div className="space-y-3">
            {/* Cards — side by side on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-start">
                <ResultCard
                    result={before}
                    headerLabel="Before"
                    headerColor="#1e3a5f"
                    onRewrite={onRewrite}
                    onSaveToLibrary={onSaveToLibrary}
                />
                <div className="flex items-center justify-center py-2 sm:py-0 sm:pt-20">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <ResultCard
                    result={after}
                    headerLabel="After"
                    headerColor="#15803d"
                    onRewrite={onRewrite}
                    onSaveToLibrary={onSaveToLibrary}
                />
            </div>

            {/* Movement summary */}
            {beforeBand && afterBand && diff && (
                <p className="text-sm font-semibold text-foreground text-center">
                    Moved from <span style={{ color: beforeBand.color }}>{beforeBand.name}</span> to{' '}
                    <span style={{ color: afterBand.color }}>{afterBand.name}</span>
                    {' '}— {Math.abs(parseFloat(diff))} grade level{Math.abs(parseFloat(diff)) !== 1 ? 's' : ''} {direction}
                </p>
            )}
        </div>
    );
}