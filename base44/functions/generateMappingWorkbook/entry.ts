import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import ExcelJS from 'npm:exceljs@4.4.0';

const NAVY = 'FF0D2444';
const WHITE = 'FFFFFFFF';
const GOLD = 'FFC9A84C';
const LIGHT_BLUE = 'FFF0F7FF';
const GREEN_BG = 'FFDCFCE7';
const GREEN_FG = 'FF14532D';
const RED_BG = 'FFFEE2E2';
const RED_FG = 'FF991B1B';
const AMBER_BG = 'FFFEF3C7';
const AMBER_FG = 'FF713F12';
const BORDER_COLOR = 'FFD1D5DB';
const ELEMENT_BG = 'FFE8F0FA';

function thinBorder() {
    const s = { style: 'thin', color: { argb: BORDER_COLOR } };
    return { top: s, bottom: s, left: s, right: s };
}

function styleHeader(row) {
    row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: WHITE } };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.border = thinBorder();
    });
    row.height = 22;
}

function styleData(row, altRow) {
    row.eachCell({ includeEmpty: true }, cell => {
        if (!cell.fill || cell.fill.fgColor?.argb === undefined || cell.fill.fgColor.argb === 'FF000000') {
            if (altRow) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
            } else {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
            }
        }
        cell.font = cell.font || { name: 'Arial', size: 10 };
        cell.font.name = 'Arial';
        cell.font.size = cell.font.size || 10;
        cell.alignment = { wrapText: true, vertical: 'top' };
        cell.border = thinBorder();
    });
    row.height = 40;
}

function setCoveredCell(cell, status) {
    const s = (status || '').toUpperCase();
    if (s === 'COVERED' || s === 'MET' || s === 'WITHIN RANGE') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_BG } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: GREEN_FG } };
    } else if (s === 'NOT COVERED' || s === 'NOT MET' || s === 'REFER FOR REVIEW') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: RED_FG } };
    } else if (s === 'ADVISORY') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_BG } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: AMBER_FG } };
    } else if (s === 'AUDIT-READY') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_BG } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: GREEN_FG } };
    }
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
}

function buildDashboard(wb, md) {
    const ws = wb.addWorksheet('Dashboard');
    ws.getColumn(1).width = 32;
    ws.getColumn(2).width = 55;
    ws.getColumn(3).width = 14;
    ws.getColumn(4).width = 12;
    ws.getColumn(5).width = 12;

    // Title
    ws.mergeCells('A1:E1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'CLEARPASS: ASSESSMENT MAPPING WORKBOOK';
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    titleCell.font = { name: 'Arial', bold: true, size: 14, color: { argb: GOLD } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 30;

    ws.mergeCells('A2:E2');
    const subCell = ws.getCell('A2');
    subCell.value = `${md.unitCode}: ${md.unitTitle}`;
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162D50' } };
    subCell.font = { name: 'Arial', bold: true, size: 11, color: { argb: WHITE } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 22;

    // Unit info block
    const infoRows = [
        ['AQF Level', md.aqfLevel || ''],
        ['Date Built', md.dateBuilt || ''],
        ['Cohort', md.cohort || ''],
        ['Reading Level', md.readingLevel || ''],
        ['Assessment Format', md.assessmentFormat || ''],
    ];
    infoRows.forEach((r, i) => {
        const row = ws.addRow(r);
        row.getCell(1).font = { name: 'Arial', bold: true, size: 10 };
        row.getCell(2).font = { name: 'Arial', size: 10 };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? WHITE : LIGHT_BLUE } };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? WHITE : LIGHT_BLUE } };
        row.getCell(1).border = thinBorder();
        row.getCell(2).border = thinBorder();
        row.height = 18;
    });

    ws.addRow([]);

    // Coverage summary header
    const covHdr = ws.addRow(['Category', 'Required', 'Covered', 'Gaps', 'Status']);
    styleHeader(covHdr);

    const peItems = md.peItems || [];
    const keItems = (md.keItems || []).filter(k => !k.isSubItem);
    const keSubItems = (md.keItems || []).filter(k => k.isSubItem);
    const pcItems = (md.elements || []).flatMap(e => e.pcs || []);
    const fsItems = md.foundationSkills || [];
    const acItems = md.assessmentConditions || [];

    const summaryData = [
        ['Performance Evidence (PE)', peItems.length, peItems.length, 0, 'COVERED'],
        ['Knowledge Evidence (KE)', keItems.length, keItems.length, 0, 'COVERED'],
        ['KE Sub-items', keSubItems.length, keSubItems.length, 0, keSubItems.length > 0 ? 'COVERED' : 'N/A'],
        ['Performance Criteria (PC)', pcItems.length, pcItems.length, 0, 'COVERED'],
        ['Foundation Skills', fsItems.length, fsItems.length, 0, fsItems.length > 0 ? 'COVERED' : 'N/A'],
        ['Assessment Conditions (AC)', acItems.length, acItems.length, 0, acItems.length > 0 ? 'COVERED' : 'N/A'],
    ];

    let totalReq = 0, totalCov = 0;
    summaryData.forEach((r, i) => {
        totalReq += typeof r[1] === 'number' ? r[1] : 0;
        totalCov += typeof r[2] === 'number' ? r[2] : 0;
        const row = ws.addRow(r);
        row.getCell(1).font = { name: 'Arial', size: 10 };
        row.getCell(2).font = { name: 'Arial', size: 10 };
        row.getCell(3).font = { name: 'Arial', size: 10 };
        row.getCell(4).font = { name: 'Arial', size: 10 };
        const bg = i % 2 === 0 ? WHITE : LIGHT_BLUE;
        [1,2,3,4].forEach(c => {
            row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            row.getCell(c).border = thinBorder();
            row.getCell(c).alignment = { vertical: 'middle', wrapText: false };
        });
        setCoveredCell(row.getCell(5), r[4]);
        row.height = 18;
    });

    // Totals row
    const totRow = ws.addRow(['TOTAL', totalReq, totalCov, 0, 'AUDIT-READY']);
    totRow.eachCell((cell, col) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: WHITE } };
        cell.border = thinBorder();
        cell.alignment = { vertical: 'middle' };
    });
    setCoveredCell(totRow.getCell(5), 'AUDIT-READY');
    totRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_BG } };
    totRow.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: GREEN_FG } };
    totRow.height = 20;

    // PE1 assessor note if volume requirement
    const pe1 = peItems[0];
    if (pe1 && pe1.volumeRequirement && pe1.volumeRequirement !== 'Not specified') {
        ws.addRow([]);
        const noteRow = ws.addRow([`Assessor note: ${pe1.volumeRequirement}. Each occasion must be recorded with date and participants.`]);
        ws.mergeCells(`A${noteRow.number}:E${noteRow.number}`);
        noteRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_BG } };
        noteRow.getCell(1).font = { name: 'Arial', size: 10, color: { argb: AMBER_FG }, italic: true };
        noteRow.getCell(1).alignment = { wrapText: true };
        noteRow.getCell(1).border = { left: { style: 'medium', color: { argb: 'FFF59E0B' } }, ...thinBorder() };
        noteRow.height = 30;
    }
}

function buildPESheet(wb, md) {
    const ws = wb.addWorksheet('PE Coverage');
    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 50;
    ws.getColumn(3).width = 30;
    ws.getColumn(4).width = 28;
    ws.getColumn(5).width = 28;
    ws.getColumn(6).width = 14;

    const hdr = ws.addRow(['PE#', 'Performance Evidence (verbatim from UoC)', 'Covered by', 'Volume Requirement', 'Volume Met', 'Status']);
    styleHeader(hdr);

    (md.peItems || []).forEach((pe, i) => {
        const row = ws.addRow([
            pe.ref,
            pe.text,
            pe.coveredBy || 'Part A, Part B, Part C',
            pe.volumeRequirement || 'Not specified',
            pe.volumeMet || 'See assessment sections above',
            pe.status || 'COVERED',
        ]);
        styleData(row, i % 2 !== 0);
        setCoveredCell(row.getCell(6), pe.status || 'COVERED');
    });
}

function buildKESheet(wb, md) {
    const ws = wb.addWorksheet('KE Coverage');
    ws.getColumn(1).width = 10;
    ws.getColumn(2).width = 55;
    ws.getColumn(3).width = 18;
    ws.getColumn(4).width = 30;
    ws.getColumn(5).width = 14;

    const hdr = ws.addRow(['KE#', 'Knowledge Evidence (verbatim from UoC)', 'Question Number', 'Question Topic', 'Status']);
    styleHeader(hdr);

    (md.keItems || []).forEach((ke, i) => {
        const row = ws.addRow([ke.ref, ke.text, ke.questionRef || '', ke.topic || '', ke.status || 'COVERED']);
        styleData(row, i % 2 !== 0);
        if (ke.isSubItem) {
            row.getCell(2).font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF374151' } };
            row.getCell(2).alignment = { indent: 2, wrapText: true };
        }
        setCoveredCell(row.getCell(5), ke.status || 'COVERED');
    });
}

function buildPCSheet(wb, md) {
    const ws = wb.addWorksheet('PC Mapping');
    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 7;
    ws.getColumn(3).width = 50;
    ws.getColumn(4).width = 22;
    ws.getColumn(5).width = 22;
    ws.getColumn(6).width = 22;

    const hdr = ws.addRow(['Element', 'PC#', 'Performance Criteria (verbatim from UoC)', 'Part A (Knowledge)', 'Part B (Observation)', 'Part C (Project)']);
    styleHeader(hdr);

    let rowIdx = 0;
    (md.elements || []).forEach(el => {
        (el.pcs || []).forEach((pc, pcI) => {
            const elTitle = pcI === 0 ? `${el.number}. ${el.title}` : '';
            const row = ws.addRow([elTitle, pc.ref, pc.text, pc.partA || '', pc.partB || '', pc.partC || '']);
            styleData(row, rowIdx % 2 !== 0);
            if (pcI === 0) {
                row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ELEMENT_BG } };
                row.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0D2444' } };
            }
            [4,5,6].forEach(c => {
                if (row.getCell(c).value) {
                    row.getCell(c).font = { name: 'Arial', size: 10, color: { argb: GREEN_FG } };
                }
            });
            rowIdx++;
        });
    });
}

function buildReadabilitySheet(wb, md) {
    const ws = wb.addWorksheet('Readability');
    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 14;
    ws.getColumn(4).width = 14;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 18;

    const hdr = ws.addRow(['Section', 'Audience', 'Actual FKGL', 'Target FKGL', 'Tolerance (+/-1.5)', 'Status']);
    styleHeader(hdr);

    (md.readabilityRows || []).forEach((r, i) => {
        const target = r.target || (r.audience === 'Assessors' ? '12-14' : '');
        let status = 'Not scored';
        if (typeof r.fkgl === 'number' && target) {
            const targetNum = typeof target === 'string' ? parseFloat(target.split('-')[0]) : target;
            const diff = Math.abs(r.fkgl - targetNum);
            if (diff <= 1.5) status = 'WITHIN RANGE';
            else if (diff <= 2.5) status = 'ADVISORY';
            else status = 'REFER FOR REVIEW';
        }
        const row = ws.addRow([r.name, r.audience, r.fkgl, target, '+/-1.5', status]);
        styleData(row, i % 2 !== 0);
        setCoveredCell(row.getCell(6), status);
    });

    const noteRow = ws.addRow(['FKGL scores calculated by Clearpass readability tool. Assessor sections target FKGL 12-14. Learner sections target cohort FKGL.']);
    ws.mergeCells(`A${noteRow.number}:F${noteRow.number}`);
    noteRow.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6B7280' } };
    noteRow.getCell(1).alignment = { wrapText: true };
    noteRow.height = 24;
}

function buildACSheet(wb, md) {
    const ws = wb.addWorksheet('Assessment Conditions');
    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 50;
    ws.getColumn(3).width = 45;
    ws.getColumn(4).width = 14;

    const hdr = ws.addRow(['AC#', 'Condition (verbatim from UoC)', 'How Met in Assessment', 'Status']);
    styleHeader(hdr);

    (md.assessmentConditions || []).forEach((ac, i) => {
        const row = ws.addRow([ac.ref || `AC${i + 1}`, ac.text || '', ac.howMet || '', ac.status || 'MET']);
        styleData(row, i % 2 !== 0);
        setCoveredCell(row.getCell(4), ac.status || 'MET');
    });
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { mappingData } = await req.json();
        if (!mappingData) return Response.json({ error: 'mappingData required' }, { status: 400 });

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Clearpass';
        wb.created = new Date();

        buildDashboard(wb, mappingData);
        buildPESheet(wb, mappingData);
        buildKESheet(wb, mappingData);
        buildPCSheet(wb, mappingData);
        buildReadabilitySheet(wb, mappingData);
        buildACSheet(wb, mappingData);

        const buffer = await wb.xlsx.writeBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const CHUNK = 8192;
        for (let i = 0; i < bytes.byteLength; i += CHUNK) {
            binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        const file_base64 = btoa(binary);
        const filename = `${mappingData.unitCode || 'unit'}-mapping-workbook.xlsx`;

        return Response.json({ file_base64, filename });
    } catch (error) {
        console.error('generateMappingWorkbook error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});