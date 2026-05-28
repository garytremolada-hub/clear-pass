/**
 * Parses an agent message string and extracts structured scoring data.
 * Returns null if no scoring block is detected.
 */

export const BAND_CONFIG = [
    { name: 'Very Easy',         gradeRange: 'Grade 1–3',   aqf: 'Year 1–4',              color: '#22c55e', fkglMin: 0,  fkglMax: 3  },
    { name: 'Easy',              gradeRange: 'Grade 4–5',   aqf: 'Year 5–6',              color: '#86efac', fkglMin: 3,  fkglMax: 6  },
    { name: 'Fairly Easy',       gradeRange: 'Grade 6–7',   aqf: 'Year 7–8',              color: '#bef264', fkglMin: 6,  fkglMax: 8  },
    { name: 'Cert I/II · Yr 10', gradeRange: 'Grade 8–9',   aqf: 'AQF 1–2',              color: '#fde047', fkglMin: 8,  fkglMax: 10 },
    { name: 'Cert III/IV',       gradeRange: 'Grade 10–12', aqf: 'AQF 3–4',              color: '#fb923c', fkglMin: 10, fkglMax: 13 },
    { name: 'Diploma',           gradeRange: 'Grade 13–14', aqf: 'AQF 5–6',              color: '#f97316', fkglMin: 13, fkglMax: 15 },
    { name: 'Degree / Grad Dip', gradeRange: 'Grade 15–16', aqf: 'AQF 7–8',              color: '#ef4444', fkglMin: 15, fkglMax: 17 },
    { name: 'Very Difficult',    gradeRange: 'Grade 17+',   aqf: 'Postgraduate register', color: '#991b1b', fkglMin: 17, fkglMax: 99 },
];

export function getBandForFkgl(fkgl) {
    if (fkgl == null) return null;
    return BAND_CONFIG.find(b => fkgl >= b.fkglMin && fkgl < b.fkglMax) || BAND_CONFIG[BAND_CONFIG.length - 1];
}

export function getBandIndex(fkgl) {
    return BAND_CONFIG.findIndex(b => fkgl >= b.fkglMin && fkgl < b.fkglMax);
}

function extractField(text, ...patterns) {
    for (const pattern of patterns) {
        const m = text.match(pattern);
        if (m) return m[1]?.trim();
    }
    return null;
}

function extractNumber(text, ...patterns) {
    const val = extractField(text, ...patterns);
    if (val == null) return null;
    const n = parseFloat(val.replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? null : n;
}

/**
 * Attempts to parse a scoring result block from message text.
 * Returns a result object or null.
 */
export function parseReadabilityResult(text) {
    if (!text) return null;

    // Must have FKGL and FRE to qualify
    const fkgl = extractNumber(text, /FKGL:\s*([\d.]+)/, /\bFKGL\b[^:]*:\s*([\d.]+)/);
    const fre  = extractNumber(text, /FRE:\s*([\d.]+)/,  /\bFRE\b[^:]*:\s*([\d.]+)/);
    if (fkgl == null || fre == null) return null;

    const words     = extractNumber(text, /Words:\s*(\d+)/);
    const sentences = extractNumber(text, /Sentences:\s*(\d+)/);
    const syllables = extractNumber(text, /Syllables:\s*(\d+)/);

    const summary = extractField(text,
        /READABILITY SUMMARY:\s*([^\n]+)/,
        /READABILITY SUMMARY\s*[:\-]\s*([^\n]+)/,
    );

    const scaleName = extractField(text,
        /SCALE POSITION:\s*([^\n([\r]+)/,
        /SCALE POSITION\s*[:\-]\s*([^\n[\r]+)/,
    )?.trim().replace(/\s*\(.*\)/, '');

    const benchmark = extractField(text,
        /NEAREST BENCHMARK:\s*([^\n]+)/,
    );

    const aqfMapping = extractField(text,
        /AQF status:\s*([^\n]+)/,
        /AQF Level:\s*([^\n]+)/,
    );

    const yearLevel = extractField(text,
        /Year level:\s*([^\n]+)/,
        /Australian Year Level[^:]*:\s*([^\n]+)/,
    );

    // Grab everything from TEXT ANALYSIS onward as the full detail block
    const detailMatch = text.match(/(TEXT ANALYSIS[\s\S]+?)(?:\n##|\n---|\n\*\*Next|$)/i)
        || text.match(/(Words:\s*\d+[\s\S]+?)(?:\n##|\n---|\n\*\*Next|$)/i);
    const fullDetail = detailMatch?.[1]?.trim() || null;

    // Traffic light — look for WITHIN RANGE / ADVISORY / REFER FOR REVIEW
    let trafficLight = null;
    const targetFkglMatch = text.match(/target.*?FKGL[^:]*?(\d+\.?\d*)/i)
        || text.match(/Cohort target[^:]*:\s*([\d.]+)/i)
        || text.match(/target FKGL[:\s]*([\d.]+)/i);
    const targetFkgl = targetFkglMatch ? parseFloat(targetFkglMatch[1]) : null;

    if (text.match(/WITHIN RANGE\s*[✓✔]/)) {
        trafficLight = { status: 'green', fkgl, targetFkgl };
    } else if (text.match(/ADVISORY\s*[⚠⚡]/)) {
        trafficLight = { status: 'amber', fkgl, targetFkgl };
    } else if (text.match(/REFER FOR REVIEW\s*[✗✘×]/)) {
        trafficLight = { status: 'red', fkgl, targetFkgl };
    } else if (targetFkgl != null) {
        const diff = Math.abs(fkgl - targetFkgl);
        if (diff <= 1.5)       trafficLight = { status: 'green', fkgl, targetFkgl };
        else if (diff <= 2.5)  trafficLight = { status: 'amber', fkgl, targetFkgl };
        else                   trafficLight = { status: 'red',   fkgl, targetFkgl };
    }

    // Detect if this is a BEFORE block (preceding a rewrite)
    const isBefore = /BEFORE\b/i.test(text.slice(0, 400));
    const isAfter  = /\bAFTER\b/i.test(text.slice(0, 400));

    return {
        fkgl,
        fre,
        words: words ?? null,
        sentences: sentences ?? null,
        syllables: syllables ?? null,
        summary,
        scaleName,
        benchmark,
        aqfMapping,
        yearLevel,
        trafficLight,
        fullDetail,
        isBefore,
        isAfter,
    };
}

/**
 * Split a message that contains multiple scoring blocks (BEFORE + AFTER).
 * Returns [beforeResult, afterResult] or null if not a before/after message.
 */
export function parseBeforeAfter(text) {
    if (!text) return null;
    // Split on common dividers between BEFORE and AFTER sections
    const splitRe = /\n(?=\*{0,2}AFTER\b)/i;
    const parts = text.split(splitRe);
    if (parts.length < 2) return null;
    const before = parseReadabilityResult(parts[0]);
    const after  = parseReadabilityResult(parts.slice(1).join('\n'));
    if (!before || !after) return null;
    return { before, after };
}