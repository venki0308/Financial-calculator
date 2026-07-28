/**
 * exportReport.ts — Shared PDF & Excel export utility for all FinCalix calculators.
 * All calculators call exportToPDF(config) and exportToExcel(config).
 */

import { Capacitor } from '@capacitor/core';
import { sanitizeForPDF } from './exportUtils';
import { useSettingsStore } from '../store/useSettingsStore';
import i18nInstance from '../i18n';

// ─── Lazy loaders for heavy export libraries ─────────────────────────────────
// jsPDF (~250KB) + jspdf-autotable (~80KB) + xlsx (~430KB) are loaded only when
// the user actually triggers an export, not on app start.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getJsPDF(): Promise<{ jsPDF: any; autoTable: any }> {
    const [{ jsPDF }, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);
    return { jsPDF, autoTable: autoTableMod.default };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getXLSX(): Promise<any> {
    return await import('xlsx');
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChartSegment {
    label: string;
    value: number;
    color: string; // hex e.g. '#10B981'
}

export interface ExportConfig {
    title: string;
    subtitle?: string;
    inputs: Array<{ label: string; value: string }>;
    results: Array<{ label: string; value: string }>;
    chart?: { type: 'pie'; segments: ChartSegment[] };
    projectionTitle?: string;
    projectionColumns?: string[];
    projectionRows?: Array<Array<string | number>>;
    notes?: string;
    /** Extra tables rendered after the main projection (each gets its own page in PDF / sheet in Excel) */
    additionalTables?: Array<{
        title: string;
        columns: string[];
        rows: Array<Array<string | number>>;
    }>;
    filename: string;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

/** Format number in Indian numbering with ₹ prefix: ₹1,00,000 */
export function fmt(n: number): string {
    return '₹' + Math.round(n).toLocaleString('en-IN');
}

/**
 * Get a translation function that ALWAYS returns English text.
 * Use this for PDF/Excel exports — jsPDF Helvetica cannot render Indian scripts.
 * Usage: const te = getEnglishT(); then te('sip.title') → "SIP Calculator"
 */
export function getEnglishT(): (key: string, fallback?: string) => string {
    const fixedT = i18nInstance.getFixedT('en');
    return (key: string, fallback?: string) => {
        const result = fixedT(key);
        // If key not found, getFixedT returns the key itself
        return result === key ? (fallback || key) : result;
    };
}

/** Date tag for filenames: 28032026 */
export function dateTag(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}${mm}${yyyy}`;
}

// ─── EMI schedule calendar labels ────────────────────────────────────────────
// User feedback: schedule tables showed only "Month 1, 2, 3..." — no way to
// tell WHICH calendar month an EMI falls in. Convention matches
// loanStatusEngine: EMI #n is due in (disbursement month + n). When no
// disbursement date was entered, we anchor on today, i.e. "if the loan
// started today, EMI 1 falls next month".

const MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function anchorDate(anchorDateStr?: string): Date {
    if (anchorDateStr && /^\d{4}-\d{2}-\d{2}$/.test(anchorDateStr)) {
        const [y, m, d] = anchorDateStr.split('-').map(Number);
        return new Date(y, m - 1, d); // local midnight — never new Date('YYYY-MM-DD') (UTC shift)
    }
    return new Date();
}

/** "Jun 2026" for EMI #n (1-based) given the loan start (disbursement) date. */
export function emiMonthLabel(anchorDateStr: string | undefined, emiNumber: number): string {
    const base = anchorDate(anchorDateStr);
    const d = new Date(base.getFullYear(), base.getMonth() + emiNumber, 1);
    return `${MONTHS_SHORT_EN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Jun 2026 - May 2027" for loan year #n (1-based, 12 EMIs per year). */
export function emiYearRange(anchorDateStr: string | undefined, yearNumber: number): string {
    return `${emiMonthLabel(anchorDateStr, (yearNumber - 1) * 12 + 1)} - ${emiMonthLabel(anchorDateStr, yearNumber * 12)}`;
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

/** Sanitize a cell value for jsPDF (strip emoji, replace ₹ with INR, strip non-Latin scripts) */
function san(cell: string | number): string | number {
    if (typeof cell !== 'string') return cell;
    let s = cell.replace(/₹\s*/g, 'INR ').replace(/Rs\.\s*/g, 'INR ');
    // Strip Devanagari, Telugu, Tamil, Kannada, Malayalam scripts that jsPDF can't render
    s = s.replace(/[\u0900-\u097F]/g, '')  // Devanagari (Hindi)
         .replace(/[\u0C00-\u0C7F]/g, '')  // Telugu
         .replace(/[\u0B80-\u0BFF]/g, '')  // Tamil
         .replace(/[\u0C80-\u0CFF]/g, '')  // Kannada
         .replace(/[\u0D00-\u0D7F]/g, '')  // Malayalam
         .replace(/\s{2,}/g, ' ')          // collapse multiple spaces
         .trim();
    return sanitizeForPDF(s) || cell.replace(/[^\x20-\x7E]/g, '').trim() || 'N/A';
}

/** Draw a perfect-circle donut pie chart on a 300×300 canvas and return PNG data URL */
function drawPie(segments: ChartSegment[]): string {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const total = segments.reduce((s, seg) => s + Math.max(0, seg.value), 0);
    if (total <= 0) return '';

    const cx = 150, cy = 150, r = 120;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 300, 300);

    // Pie slices
    let angle = -Math.PI / 2;
    for (const seg of segments) {
        if (seg.value <= 0) continue;
        const sweep = (seg.value / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + sweep);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        angle += sweep;
    }

    // White border ring
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();

    // White donut hole (42% radius)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    return canvas.toDataURL('image/png');
}

// ─── Shared internals ─────────────────────────────────────────────────────────

function showToast(msg: string, isError = false) {
    const isDark = useSettingsStore.getState().darkMode;
    const old = document.getElementById('fncx-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'fncx-toast';
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)',
        background: isError ? (isDark ? '#ef4444' : '#dc2626') : (isDark ? '#10B981' : '#059669'), color: '#ffffff',
        padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
        zIndex: '99999', boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap', maxWidth: '90vw', textAlign: 'center',
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function saveNative(blob: Blob, filename: string): Promise<void> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { usePdfStore } = await import('../store/usePdfStore');
    const base64 = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
        path: filename, data: base64, directory: Directory.Cache, recursive: true,
    });
    showToast('File ready');
    usePdfStore.getState().showActionSheet(result.uri, filename);
}

function webDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
}

/** Add branded footer + page numbers + disclaimer on every page */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addFooters(doc: any, _title: string) {
    const total = (doc as any).internal.getNumberOfPages();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const disc = 'For informational purposes only. Consult a certified financial advisor before making investment decisions. Results are estimates.';
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setDrawColor(210, 210, 210);
        doc.line(14, ph - 19, pw - 14, ph - 19);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('FinCalix — Your Financial Companion', 14, ph - 13);
        doc.text(`Page ${i} of ${total}`, pw - 14, ph - 13, { align: 'right' });
        doc.setFontSize(6.5);
        doc.setTextColor(155);
        const lines = doc.splitTextToSize(disc, pw - 28);
        doc.text(lines, 14, ph - 8);
    }
}

// ─── Public: exportToPDF ──────────────────────────────────────────────────────

/**
 * Generate a structured PDF report.
 *
 * Structure:
 *   1. Header  — FinCalix brand bar, calculator name, date
 *   2. Inputs  — Parameter | Value table
 *   3. Results — Metric | Value table
 *   4. Chart   — 300×300 perfect-circle donut pie (if chart provided)
 *   5. Projection — full schedule/table on new page(s), paginated
 *   6. Footer  — "FinCalix — Your Financial Companion", Page X/Y, disclaimer (every page)
 */
export async function exportToPDF(config: ExportConfig): Promise<void> {
    const {
        title, subtitle, inputs, results, chart,
        projectionTitle, projectionColumns, projectionRows,
        filename,
    } = config;

    try {
        showToast('Generating PDF...');
        const { jsPDF, autoTable } = await getJsPDF();
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();

        // ── 1. Header bar ─────────────────────────────────────────────────
        doc.setFillColor(13, 59, 46); // Deep green #0D3B2E
        doc.rect(0, 0, pw, 42, 'F');

        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('FinCalix', 14, 17);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 29);

        const dateStr = new Date().toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
        doc.setFontSize(9);
        doc.setTextColor(195, 230, 210);
        doc.text(dateStr, pw - 14, 17, { align: 'right' });
        if (subtitle) doc.text(subtitle, pw - 14, 27, { align: 'right' });

        let y = 52;

        // ── 2. Input Summary ──────────────────────────────────────────────
        doc.setFontSize(10);
        doc.setTextColor(13, 59, 46);
        doc.setFont('helvetica', 'bold');
        doc.text('Input Summary', 14, y);
        y += 3;

        autoTable(doc, {
            startY: y,
            head: [['Parameter', 'Value']],
            body: inputs.map(({ label, value }) => [san(label), san(value)]),
            theme: 'grid',
            headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 91 }, 1: { cellWidth: 91 } },
            margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // ── 3. Results Summary ────────────────────────────────────────────
        if (y + 20 > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setTextColor(13, 59, 46);
        doc.setFont('helvetica', 'bold');
        doc.text('Results Summary', 14, y);
        y += 3;

        autoTable(doc, {
            startY: y,
            head: [['Metric', 'Value']],
            body: results.map(({ label, value }) => [san(label), san(value)]),
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 91 }, 1: { cellWidth: 91 } },
            margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // ── 4. Chart (donut pie) ──────────────────────────────────────────
        if (chart?.segments && chart.segments.length >= 2) {
            const img = drawPie(chart.segments);
            if (img) {
                if (y + 100 > 272) { doc.addPage(); y = 20; }

                doc.setFontSize(10);
                doc.setTextColor(13, 59, 46);
                doc.setFont('helvetica', 'bold');
                doc.text('Visual Summary', 14, y);
                y += 4;

                // 300px → 78mm square (perfect circle)
                const sz = 78;
                doc.addImage(img, 'PNG', (pw - sz) / 2, y, sz, sz);
                y += sz + 6;

                // Color legend
                autoTable(doc, {
                    startY: y,
                    head: [],
                    body: chart.segments.map(s => ['', s.label, san(s.value.toLocaleString('en-IN'))]),
                    theme: 'plain',
                    styles: { fontSize: 9, cellPadding: 1.5 },
                    columnStyles: {
                        0: { cellWidth: 7 },
                        1: { cellWidth: 85, textColor: [70, 70, 70] },
                        2: { cellWidth: 85, fontStyle: 'bold' },
                    },
                    margin: { left: (pw - 177) / 2 },
                    didParseCell: (d: any) => {
                        if (d.column.index === 0 && d.row.index < chart.segments.length) {
                            const c = chart.segments[d.row.index].color;
                            const rr = parseInt(c.slice(1, 3), 16);
                            const gg = parseInt(c.slice(3, 5), 16);
                            const bb = parseInt(c.slice(5, 7), 16);
                            d.cell.styles.fillColor = [rr, gg, bb];
                        }
                    },
                });
                y = (doc as any).lastAutoTable.finalY + 8;
            }
        }

        // ── 5. Projection table (new page) ────────────────────────────────
        if (projectionColumns?.length && projectionRows?.length) {
            doc.addPage();
            y = 20;

            doc.setFontSize(10);
            doc.setTextColor(13, 59, 46);
            doc.setFont('helvetica', 'bold');
            doc.text(projectionTitle || 'Projection Schedule', 14, y);
            y += 3;

            const cw = 182 / projectionColumns.length;
            const cDef: Record<number, { cellWidth: number }> = {};
            projectionColumns.forEach((_, i) => { cDef[i] = { cellWidth: cw }; });

            autoTable(doc, {
                startY: y,
                head: [projectionColumns.map(h => san(h) as string)],
                body: projectionRows.map(row => row.map(c => san(c))),
                theme: 'striped',
                headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                alternateRowStyles: { fillColor: [240, 253, 244] },
                styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'hidden' },
                columnStyles: cDef,
                margin: { left: 14, right: 14 },
                didDrawPage: (d: any) => {
                    if (d.pageNumber > 1) {
                        doc.setFillColor(13, 59, 46);
                        doc.rect(0, 0, pw, 10, 'F');
                        doc.setFontSize(7);
                        doc.setTextColor(255, 255, 255);
                        doc.text(
                            `${title} — ${projectionTitle || 'Schedule'} (continued)`,
                            14, 7
                        );
                    }
                },
            });
        }

        // ── 5b. Additional tables (each starts on a new page) ────────────
        if (config.additionalTables?.length) {
            for (const table of config.additionalTables) {
                doc.addPage();
                let ay = 20;

                doc.setFontSize(10);
                doc.setTextColor(13, 59, 46);
                doc.setFont('helvetica', 'bold');
                doc.text(table.title, 14, ay);
                ay += 3;

                const acw = 182 / table.columns.length;
                const aDef: Record<number, { cellWidth: number }> = {};
                table.columns.forEach((_, i) => { aDef[i] = { cellWidth: acw }; });

                autoTable(doc, {
                    startY: ay,
                    head: [table.columns.map(h => san(h) as string)],
                    body: table.rows.map(row => row.map(c => san(c))),
                    theme: 'striped',
                    headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                    alternateRowStyles: { fillColor: [240, 253, 244] },
                    // linebreak, not hidden — long cells (e.g. disclaimer notes)
                    // must wrap onto extra lines instead of being truncated.
                    styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
                    columnStyles: aDef,
                    margin: { left: 14, right: 14 },
                    didDrawPage: (d: any) => {
                        if (d.pageNumber > 1) {
                            doc.setFillColor(13, 59, 46);
                            doc.rect(0, 0, pw, 10, 'F');
                            doc.setFontSize(7);
                            doc.setTextColor(255, 255, 255);
                            doc.text(`${title} — ${table.title} (continued)`, 14, 7);
                        }
                    },
                });
            }
        }

        // ── 6. Footer on every page ───────────────────────────────────────
        addFooters(doc, title);

        // ── Download ──────────────────────────────────────────────────────
        const fname = `${filename}.pdf`;
        const blob = doc.output('blob');
        if (Capacitor.isNativePlatform()) {
            await saveNative(blob, fname);
        } else {
            webDownload(blob, fname);
            showToast('PDF downloaded!');
        }
    } catch (err) {
        console.error('exportToPDF error:', err);
        showToast('Export failed', true);
    }
}

// Excel formula-injection guard (CWE-1236): user-entered text (e.g. a loan
// nickname like "=HYPERLINK(...)") must not be interpreted as a formula when
// the exported file is opened in Excel. Prefixing with ' renders it as text.
// Defense-in-depth for '=' and '@' only; '+'/'-' are excluded because signed
// amounts (e.g. "+₹1,200", "-3.2%") are legitimate in financial exports and
// aoa_to_sheet stores strings as type-'s' cells Excel never evaluates.
function sanitizeAoa(rows: (string | number)[][]): (string | number)[][] {
    return rows.map(row =>
        row.map(cell =>
            typeof cell === 'string' && /^[=@\t\r]/.test(cell) ? `'${cell}` : cell
        )
    );
}

// ─── Public: exportToExcel ────────────────────────────────────────────────────

/**
 * Generate a two-sheet Excel workbook.
 *
 * Sheet 1 "Summary"     — inputs + results
 * Sheet 2 "Projections" — full projection table with auto-fit columns
 */
export async function exportToExcel(config: ExportConfig): Promise<void> {
    const { title, inputs, results, projectionColumns, projectionRows, filename } = config;

    try {
        showToast('Generating Excel...');
        const XLSX = await getXLSX();
        const wb = XLSX.utils.book_new();

        // ── Sheet 1: Summary ──────────────────────────────────────────────
        const summaryData: (string | number)[][] = [
            [`${title} — Generated by FinCalix`],
            [],
            ['INPUT SUMMARY'],
            ['Parameter', 'Value'],
            ...inputs.map(({ label, value }) => [label, value]),
            [],
            ['RESULTS SUMMARY'],
            ['Metric', 'Value'],
            ...results.map(({ label, value }) => [label, value]),
        ];
        const sheet1 = XLSX.utils.aoa_to_sheet(sanitizeAoa(summaryData));
        sheet1['!cols'] = [{ wch: 38 }, { wch: 28 }];
        XLSX.utils.book_append_sheet(wb, sheet1, 'Summary');

        // ── Sheet 2: Projections ──────────────────────────────────────────
        if (projectionColumns?.length && projectionRows?.length) {
            const projData: (string | number)[][] = [
                projectionColumns,
                ...projectionRows,
            ];
            const sheet2 = XLSX.utils.aoa_to_sheet(sanitizeAoa(projData));

            // Auto-fit column widths
            sheet2['!cols'] = projectionColumns.map((h, colIdx) => {
                let maxLen = h.length;
                projectionRows.forEach(row => {
                    const cell = row[colIdx];
                    if (cell !== undefined) maxLen = Math.max(maxLen, String(cell).length);
                });
                return { wch: Math.min(maxLen + 2, 30) };
            });

            XLSX.utils.book_append_sheet(wb, sheet2, 'Projections');
        }

        // ── Additional sheets ─────────────────────────────────────────────
        if (config.additionalTables?.length) {
            for (const table of config.additionalTables) {
                const tData: (string | number)[][] = [table.columns, ...table.rows];
                const ws = XLSX.utils.aoa_to_sheet(sanitizeAoa(tData));
                ws['!cols'] = table.columns.map((h, colIdx) => {
                    let maxLen = h.length;
                    table.rows.forEach(row => {
                        const cell = row[colIdx];
                        if (cell !== undefined) maxLen = Math.max(maxLen, String(cell).length);
                    });
                    return { wch: Math.min(maxLen + 2, 30) };
                });
                // Sheet name max 31 chars
                XLSX.utils.book_append_sheet(wb, ws, table.title.slice(0, 31));
            }
        }

        // ── Save ──────────────────────────────────────────────────────────
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([out], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const fname = `${filename}.xlsx`;
        if (Capacitor.isNativePlatform()) {
            await saveNative(blob, fname);
        } else {
            webDownload(blob, fname);
            showToast('Excel downloaded!');
        }
    } catch (err) {
        console.error('exportToExcel error:', err);
        showToast('Export failed', true);
    }
}
