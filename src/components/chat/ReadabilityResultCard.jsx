import { ArrowRight } from 'lucide-react';
import { BAND_CONFIG, getBandForFkgl, getBandIndex } from '@/lib/parseReadabilityResult';

// ─── Scale bar ────────────────────────────────────────────────────────────────

function fkglToPercent(fkgl) {
    const MIN = 0;
    const MAX = 20;
    return ((Math.min(Math.max(fkgl, MIN), MAX) - MIN) / (MAX - MIN)) * 100;
}

function ScaleBar({ fkgl, rewriteFkgl }) {
    const activeBandIdx = getBandIndex(fkgl);
    const band = getBandForFkgl(fkgl);
    const primaryPct = fkgl != null ? fkglToPercent(fkgl) : null;
    const rewritePct = rewriteFkgl != null ? fkglToPercent(rewriteFkgl) : null;
    const hasRewrite = rewritePct != null;

    return (
        <div style={{ marginBottom: '24px' }}>
            {/* Marker row */}
            <div className="relative w-full" style={{ height: '28px', marginBottom: '4px' }}>
                {primaryPct != null && (
                    <div className="absolute -translate-x-1/2" style={{ left: `${primaryPct}%`, bottom: 0 }}>
                        <span style={{ fontSize: '20px', color: '#0d2444', lineHeight: 1 }}>▼</span>
                    </div>
                )}
                {rewritePct != null && (
                    <div className="absolute -translate-x-1/2" style={{ left: `${rewritePct}%`, bottom: 0 }}>
                        <span style={{ fontSize: '20px', color: '#c9a84c', lineHeight: 1 }}>▼</span>
                    </div>
                )}
            </div>

            {/* Band bar */}
            <div className="flex w-full overflow-hidden" style={{ borderRadius: '8px', height: '16px' }}>
                {BAND_CONFIG.map((b) => (
                    <div key={b.name} className="flex-1" style={{ backgroundColor: b.color }} />
                ))}
            </div>

            {/* Band labels */}
            <div className="flex w-full" style={{ marginTop: '6px' }}>
                {BAND_CONFIG.map((b, i) => {
                    const isActive = i === activeBandIdx;
                    return (
                        <div
                            key={b.name}
                            className="flex-1 text-center leading-tight"
                            style={{
                                fontSize: isActive ? '11px' : '10px',
                                fontWeight: isActive ? 500 : 400,
                                color: isActive ? '#0d2444' : '#6b7280',
                            }}
                        >
                            {b.name.split(' ·')[0]}
                        </div>
                    );
                })}
            </div>

            {/* Active band summary */}
            {band && (
                <div className="text-center" style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#0d2444' }}>
                        {band.name} — {band.gradeRange} · {band.aqf}
                    </span>
                </div>
            )}

            {/* Before/After legend */}
            {hasRewrite && (
                <div className="flex gap-4 justify-center" style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                    <span className="flex items-center gap-1">
                        <span style={{ color: '#0d2444' }}>▼</span> Original
                    </span>
                    <span className="flex items-center gap-1">
                        <span style={{ color: '#c9a84c' }}>▼</span> Rewrite
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
            bg: '#dcfce7', color: '#14532d',
            label: '✓ Within range for your learners',
            sub: tl.targetFkgl != null
                ? `FKGL ${tl.fkgl} is within ±1.5 of your target FKGL ${tl.targetFkgl}`
                : 'Text is within expected readability range.',
        },
        amber: {
            bg: '#fef9c3', color: '#713f12',
            label: '⚠ Outside expected range — assessor review recommended',
            sub: tl.targetFkgl != null
                ? `FKGL ${tl.fkgl} is ${absDiff} grade levels ${direction} your target.`
                : 'Text is outside expected readability range.',
        },
        red: {
            bg: '#fee2e2', color: '#7f1d1d',
            label: '✗ Material readability concern — must be addressed',
            sub: tl.targetFkgl != null
                ? `FKGL ${tl.fkgl} is ${absDiff} grade levels ${direction} your target. Must be addressed before use.`
                : 'Text has a significant readability concern. Must be addressed before use.',
        },
    }[tl.status];

    if (!config) return null;

    return (
        <div style={{
            backgroundColor: config.bg,
            color: config.color,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
        }}>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>{config.label}</div>
            {config.sub && (
                <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.85 }}>{config.sub}</div>
            )}
            {(tl.status === 'amber' || tl.status === 'red') && onRewrite && (
                <button
                    onClick={onRewrite}
                    style={{
                        marginTop: '10px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        backgroundColor: '#0d2444',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    Rewrite this section
                </button>
            )}
        </div>
    );
}

// ─── Stat box ─────────────────────────────────────────────────────────────────

function StatBox({ value, label, sub }) {
    return (
        <div style={{
            flex: 1,
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px 16px',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '36px', fontWeight: 500, color: '#0d2444', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{label}</div>
            {sub && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', fontStyle: 'italic' }}>{sub}</div>}
        </div>
    );
}

// ─── Single result card ───────────────────────────────────────────────────────

export function ResultCard({ result, headerLabel, headerColor, rewriteFkgl, onRewrite, onSaveToLibrary }) {
    const band = getBandForFkgl(result.fkgl);

    const headline = band
        ? `This document reads at ${band.name} level`
        : result.summary || null;

    return (
        <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '640px',
            width: '100%',
        }}>
            {/* Header label (Before / After) */}
            {headerLabel && (
                <div style={{
                    marginBottom: '20px',
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: headerColor || '#0d2444',
                }}>
                    {headerLabel}
                </div>
            )}

            {/* Section 1 — Headline */}
            {headline && (
                <p style={{
                    fontSize: '22px',
                    fontWeight: 500,
                    color: '#0d2444',
                    lineHeight: 1.3,
                    marginBottom: '24px',
                }}>
                    {headline}
                </p>
            )}

            {/* Section 2 — Scale bar */}
            <ScaleBar fkgl={result.fkgl} rewriteFkgl={rewriteFkgl} />

            {/* Section 3 — Traffic light (only when cohort target is set) */}
            {result.trafficLight && (
                <TrafficLight tl={result.trafficLight} onRewrite={onRewrite} />
            )}

            {/* Section 4 — Stat boxes */}
            <div className="flex gap-3" style={{ marginBottom: '24px' }}>
                <StatBox
                    value={result.fkgl?.toFixed(1) ?? '—'}
                    label="Reading Grade Level"
                    sub="lower = harder to read"
                />
                <StatBox
                    value={result.fre?.toFixed(1) ?? '—'}
                    label="Reading Ease Score"
                    sub="higher = easier to read"
                />
                <StatBox
                    value={result.words ?? '—'}
                    label="Words"
                    sub={null}
                />
            </div>

            {/* Action buttons */}
            {(onSaveToLibrary || onRewrite) && (
                <div className="flex gap-2">
                    {onSaveToLibrary && (
                        <button
                            onClick={onSaveToLibrary}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 500,
                                border: '1px solid #0d2444',
                                color: '#0d2444',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                            }}
                        >
                            Save to library
                        </button>
                    )}
                    {onRewrite && (
                        <button
                            onClick={onRewrite}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 500,
                                backgroundColor: '#c9a84c',
                                color: '#0d2444',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Rewrite to different level
                        </button>
                    )}
                </div>
            )}

            {/* Disclaimer */}
            <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#9ca3af', marginTop: '16px', lineHeight: 1.6 }}>
                Scores are AI estimates based on sentence length and word complexity. For critical compliance decisions, verify with a qualified assessor.
            </p>

            {result.benchmark && (
                <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#9ca3af', marginTop: '4px' }}>
                    Nearest benchmark: {result.benchmark}
                </p>
            )}
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
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                <ResultCard
                    result={before}
                    headerLabel="Before"
                    headerColor="#0d2444"
                    onRewrite={onRewrite}
                    onSaveToLibrary={onSaveToLibrary}
                />
                <div className="flex items-center justify-center py-2 sm:py-0 sm:pt-24">
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
                    Moved from{' '}
                    <span style={{ color: beforeBand.color }}>{beforeBand.name}</span>
                    {' '}to{' '}
                    <span style={{ color: afterBand.color }}>{afterBand.name}</span>
                    {' '}— {Math.abs(parseFloat(diff))} grade level{Math.abs(parseFloat(diff)) !== 1 ? 's' : ''} {direction}
                </p>
            )}
        </div>
    );
}