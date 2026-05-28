import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BAND_CONFIG, getBandForFkgl, getBandIndex } from '@/lib/parseReadabilityResult';

// ─── Band scale ──────────────────────────────────────────────────────────────

function fkglToPercent(fkgl) {
    const MIN = 0;
    const MAX = 20;
    const clamped = Math.min(Math.max(fkgl, MIN), MAX);
    return ((clamped - MIN) / (MAX - MIN)) * 100;
}

function ScaleBar({ fkgl, rewriteFkgl }) {
    const activeBandIdx = getBandIndex(fkgl);
    const rewriteBandIdx = rewriteFkgl != null ? getBandIndex(rewriteFkgl) : -1;
    const band = getBandForFkgl(fkgl);

    const primaryPct = fkgl != null ? fkglToPercent(fkgl) : null;
    const rewritePct = rewriteFkgl != null ? fkglToPercent(rewriteFkgl) : null;

    return (
        <div>
            {/* Marker row */}
            <div className="relative w-full h-5 mb-0.5">
                {primaryPct != null && (
                    <div className="absolute -translate-x-1/2" style={{ left: `${primaryPct}%` }}>
                        <span style={{ fontSize: '16px', color: '#0d2444', lineHeight: 1 }}>▼</span>
                    </div>
                )}
                {rewritePct != null && (
                    <div className="absolute -translate-x-1/2" style={{ left: `${rewritePct}%` }}>
                        <span style={{ fontSize: '16px', color: '#c9a84c', lineHeight: 1 }}>▼</span>
                    </div>
                )}
            </div>

            {/* Band segments */}
            <div className="flex rounded-lg overflow-hidden h-3 w-full">
                {BAND_CONFIG.map((b) => (
                    <div
                        key={b.name}
                        className="flex-1"
                        style={{ backgroundColor: b.color }}
                        title={`${b.name} (${b.gradeRange})`}
                    />
                ))}
            </div>

            {/* Band labels */}
            <div className="flex w-full mt-0.5">
                {BAND_CONFIG.map((b, i) => (
                    <div
                        key={b.name}
                        className={cn("flex-1 text-center leading-tight", i === activeBandIdx ? "font-semibold" : "")}
                        style={{ fontSize: '9px', color: i === activeBandIdx ? '#0d2444' : '#6b7280' }}
                    >
                        {b.name.split(' ·')[0]}
                    </div>
                ))}
            </div>

            {/* Active band detail */}
            {band && (
                <div className="mt-1.5 text-center">
                    <span className="text-sm font-medium" style={{ color: '#0d2444' }}>{band.name}</span>
                    <span className="text-xs ml-1.5" style={{ color: '#6b7280' }}>— {band.gradeRange} · {band.aqf}</span>
                </div>
            )}

            {/* Legend */}
            {rewriteBandIdx >= 0 && (
                <div className="flex gap-4 justify-center mt-1.5 text-xs" style={{ color: '#6b7280' }}>
                    <span className="flex items-center gap-1">
                        <span style={{ color: '#0d2444', fontSize: '12px' }}>▼</span>
                        Original
                    </span>
                    <span className="flex items-center gap-1">
                        <span style={{ color: '#c9a84c', fontSize: '12px' }}>▼</span>
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
            bg: '#22c55e', color: '#14532d',
            icon: '✓',
            label: 'Within range for your cohort',
            sub: tl.targetFkgl != null
                ? `FKGL ${tl.fkgl} is within ±1.5 of your target FKGL ${tl.targetFkgl}`
                : 'Text is within expected readability range.',
        },
        amber: {
            bg: '#fde047', color: '#713f12',
            icon: '⚠',
            label: 'Outside expected range',
            sub: tl.targetFkgl != null
                ? `FKGL ${tl.fkgl} is ${absDiff} grade levels ${direction} your target. Assessor review recommended.`
                : 'Text is outside expected readability range. Assessor review recommended.',
        },
        red: {
            bg: '#ef4444', color: '#ffffff',
            icon: '✗',
            label: 'Material readability concern',
            sub: tl.targetFkgl != null
                ? `FKGL ${tl.fkgl} is ${absDiff} grade levels ${direction} your target. Must be addressed before use.`
                : 'Text has a significant readability concern. Must be addressed before use.',
        },
    }[tl.status];

    return (
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: config.bg, color: config.color }}>
            <div className="font-medium text-sm">{config.icon} {config.label}</div>
            <div className="text-xs mt-0.5 opacity-90">{config.sub}</div>
            {(tl.status === 'amber' || tl.status === 'red') && onRewrite && (
                <button
                    onClick={onRewrite}
                    className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#0d2444', color: '#ffffff' }}
                >
                    Rewrite this section
                </button>
            )}
        </div>
    );
}

// ─── Single result card ───────────────────────────────────────────────────────

export function ResultCard({ result, headerLabel, headerColor, rewriteFkgl, onRewrite, onSaveToLibrary }) {
    return (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
            {headerLabel && (
                <div
                    className="px-4 py-2 text-xs font-medium uppercase tracking-wider"
                    style={{ backgroundColor: headerColor || '#0d2444', color: '#ffffff' }}
                >
                    {headerLabel}
                </div>
            )}

            <div className="p-4 space-y-4">
                {/* Headline */}
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
                        <p className="text-base font-medium leading-snug" style={{ color: '#0d2444' }}>
                            {headline}
                        </p>
                    ) : null;
                })()}

                {/* Scale */}
                <div className="pt-2">
                    <ScaleBar fkgl={result.fkgl} rewriteFkgl={rewriteFkgl} />
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                        { abbr: 'FKGL', label: 'Grade Level',         value: result.fkgl?.toFixed(1) ?? '—',        note: 'lower = easier' },
                        { abbr: 'FRE',  label: 'Reading Ease',        value: result.fre?.toFixed(1) ?? '—',         note: '0–100, higher = easier' },
                        {
                            abbr: 'ASL', label: 'Avg Sentence Length',
                            value: result.sentences != null && result.words != null && result.sentences > 0
                                ? (result.words / result.sentences).toFixed(1) : '—',
                            note: 'words per sentence',
                        },
                        {
                            abbr: 'ASW', label: 'Avg Word Length',
                            value: result.syllables != null && result.words != null && result.words > 0
                                ? (result.syllables / result.words).toFixed(2) : '—',
                            note: 'syllables per word',
                        },
                    ].map(stat => (
                        <div key={stat.abbr} className="rounded-xl p-3 text-center" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                            <div className="font-mono text-2xl font-medium tabular-nums" style={{ color: '#0d2444' }}>
                                {stat.value}
                            </div>
                            <div className="text-[11px] font-medium mt-0.5" style={{ color: '#374151' }}>{stat.abbr}</div>
                            <div className="text-[10px] mt-0.5 leading-tight" style={{ color: '#6b7280' }}>{stat.label}</div>
                            <div className="text-[9px] mt-0.5 leading-tight italic" style={{ color: '#9ca3af' }}>{stat.note}</div>
                        </div>
                    ))}
                </div>

                {/* Traffic light */}
                {result.trafficLight && (
                    <TrafficLight tl={result.trafficLight} onRewrite={onRewrite} />
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                    <button
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                        style={{ border: '1px solid #0d2444', color: '#0d2444', backgroundColor: 'transparent' }}
                        onClick={onSaveToLibrary}
                    >
                        Save to library
                    </button>
                    <button
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                        style={{ backgroundColor: '#c9a84c', color: '#0d2444', border: 'none' }}
                        onClick={onRewrite}
                    >
                        Rewrite to different level
                    </button>
                </div>

                {/* Disclaimer */}
                <p className="text-[11px] italic leading-relaxed" style={{ color: '#9ca3af' }}>
                    Scores are AI estimates based on sentence length and word complexity. For critical compliance decisions, verify with a qualified assessor.
                </p>

                {result.benchmark && (
                    <p className="text-[11px] italic" style={{ color: '#9ca3af' }}>
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
    const diff = after.fkgl != null && before.fkgl != null
        ? (before.fkgl - after.fkgl).toFixed(1)
        : null;
    const direction = diff != null
        ? (parseFloat(diff) > 0 ? 'simpler' : 'more complex')
        : null;

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-start">
                <ResultCard
                    result={before}
                    headerLabel="Before"
                    headerColor="#0d2444"
                    onRewrite={onRewrite}
                    onSaveToLibrary={onSaveToLibrary}
                />
                <div className="flex items-center justify-center py-2 sm:py-0 sm:pt-20">
                    <ArrowRight className="h-5 w-5" style={{ color: '#6b7280' }} />
                </div>
                <ResultCard
                    result={after}
                    headerLabel="After"
                    headerColor="#c9a84c"
                    onRewrite={onRewrite}
                    onSaveToLibrary={onSaveToLibrary}
                />
            </div>

            {beforeBand && afterBand && diff && (
                <p className="text-sm font-medium text-center" style={{ color: '#374151' }}>
                    Moved from <span style={{ color: beforeBand.color }}>{beforeBand.name}</span> to{' '}
                    <span style={{ color: afterBand.color }}>{afterBand.name}</span>
                    {' '}— {Math.abs(parseFloat(diff))} grade level{Math.abs(parseFloat(diff)) !== 1 ? 's' : ''} {direction}
                </p>
            )}
        </div>
    );
}