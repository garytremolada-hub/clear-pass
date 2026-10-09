import { runGuidedCoverage } from '@/lib/buildCoverage';
import { buildMappingIndex, generateSupportingDocs } from '@/lib/buildSupportingDocs';
import { llmCall } from '@/lib/evaluateAudit';
import { callWithRetry } from '@/lib/buildUtils';

// outputs: { assessment, mapping, validation }. Nothing is applied here; the caller swaps results in on success.
export async function regenerateWithGuidance({ units, cohortInfo, base, coverage, overall, notes, outputs, onProgress }) {
    let { kText, oText } = base;
    let cov = coverage;

    if (outputs.assessment) {
        const gaps = coverage.units.flatMap(u => u.gaps);
        onProgress(5, 'Revising the assessment with your input...');
        cov = await runGuidedCoverage(units, { kText, oText, pText: base.pText }, gaps, { overall, notes },
            p => onProgress(5 + Math.round(p * 0.55), 'Re-checking coverage against training.gov.au...'));
        kText = cov.kText;
        oText = cov.oText;
    }

    let mappingIndex = null;
    if (outputs.mapping || outputs.validation) {
        onProgress(65, 'Mapping requirements to the revised assessment...');
        mappingIndex = await buildMappingIndex({
            units, kText, oText, pText: base.pText,
            ask: (name, prompt) => callWithRetry(() => llmCall(prompt)),
        });
    }

    onProgress(85, 'Generating documents...');
    const docs = await generateSupportingDocs({
        units, cohortInfo, sections: base.sections, kText, oText, pText: base.pText, mappingIndex,
        clusterCode: base.clusterCode, clusterTitle: base.clusterTitle,
        want: { mapping: outputs.mapping, validation: outputs.validation, booklet: outputs.assessment },
    });

    return { cov, kText, oText, docs };
}