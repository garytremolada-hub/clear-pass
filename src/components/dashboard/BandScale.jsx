import { BAND_CONFIG } from '@/lib/parseReadabilityResult';

const FKGL_MIN = 0;
const FKGL_MAX = 17;

/**
 * Returns percentage position (0–100) along the scale for a given FKGL score.
 */
function fkglToPercent(fkgl) {
    return Math.min(100, Math.max(0, ((fkgl - FKGL_MIN) / (FKGL_MAX - FKGL_MIN)) * 100));
}

export default function BandScale({ items = [] }) {
    // Find the two most recent scored items: the original and any rewrite
    const scored = [...items].filter(i => i.fkgl != null);
    const original = scored.find(i => i.task_type === 'score') || null;
    const rewrite  = scored.find(i => i.task_type === 'rewrite') || null;

    const showMarkers = original || rewrite;

    return (
        <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-semibold text-[#1e3a5f] mb-4">Readability band reference</h2>

            {/* Colour bar with relative markers */}
            <div className="relative">
                <div className="flex rounded-xl overflow-hidden h-7">
                    {BAND_CONFIG.map(band => (
                        <div key={band.name} className="flex-1" style={{ backgroundColor: band.color }} />
                    ))}
                </div>

                {/* Markers */}
                {showMarkers && (
                    <div className="absolute inset-0 pointer-events-none">
                        {original && (
                            <div
                                className="absolute top-0 bottom-0 flex flex-col items-center"
                                style={{ left: `${fkglToPercent(original.fkgl)}%`, transform: 'translateX(-50%)' }}
                            >
                                <div className="w-0.5 h-full bg-white/80" />
                                <div className="absolute -bottom-5 text-[10px] font-semibold text-foreground whitespace-nowrap">
                                    Original · {original.fkgl.toFixed(1)}
                                </div>
                            </div>
                        )}
                        {rewrite && (
                            <div
                                className="absolute top-0 bottom-0 flex flex-col items-center"
                                style={{ left: `${fkglToPercent(rewrite.fkgl)}%`, transform: 'translateX(-50%)' }}
                            >
                                <div className="w-0.5 h-full bg-[#1e3a5f]" />
                                <div className="absolute -bottom-5 text-[10px] font-semibold text-[#1e3a5f] whitespace-nowrap">
                                    Rewrite · {rewrite.fkgl.toFixed(1)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Spacer for labels below bar */}
            <div className={showMarkers ? 'mt-7' : 'mt-1'} />

            {/* FKGL axis ticks */}
            <div className="flex mb-3">
                {BAND_CONFIG.map(band => (
                    <div key={band.name} className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground tabular-nums">{band.fkglMin}</p>
                    </div>
                ))}
                <p className="text-[10px] text-muted-foreground tabular-nums">17+</p>
            </div>

            {/* Band cards */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {BAND_CONFIG.map(band => (
                    <div key={band.name} className="rounded-lg p-2" style={{ backgroundColor: band.color + '18' }}>
                        <div className="h-2 w-2 rounded-full mb-1.5" style={{ backgroundColor: band.color }} />
                        <p className="text-[11px] font-semibold text-foreground leading-tight">{band.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{band.aqf}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}