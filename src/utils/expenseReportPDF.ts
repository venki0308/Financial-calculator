// ═══════════════════════════════════════════════════════════════════════════════
// FINCALIX — EXPENSE TRACKER PDF REPORTS
// ═══════════════════════════════════════════════════════════════════════════════
// Dedicated PDF report generators for the Expense Tracker subsystem.
// Independent of the calculator-side exportReport.ts. Uses jsPDF + jspdf-autotable
// directly with no html2canvas, no embedded chart images, no canvas hacks.
//
// Public API:
//   generateDailyPDF, generateWeeklyPDF, generateMonthlyPDF,
//   generateAnnualPDF, generateCustomPDF, generateHealthReportPDF
//
// Shared helpers:
//   formatINR, drawSectionHeader, drawStatBoxes, addPageHeaderFooter
// ═══════════════════════════════════════════════════════════════════════════════

import { Capacitor } from '@capacitor/core';
import { sanitizeForPDF } from './exportUtils';
import type { Entry, Budget, BankAccount, EntryType } from '../types/expense';
import type {
    PeriodSummary,
    FinancialHealthScore,
    NetWorthSummary,
} from './expenseCalculations';
import {
    calculateSummary,
    buildWeeklyBreakdown,
    MONTH_NAMES,
    getTodayStr,
} from './expenseCalculations';
import { getCategoryById } from './expenseStorage';

// ─── Lazy loader for jsPDF + autoTable ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getJsPDF(): Promise<{ jsPDF: any; autoTable: any }> {
    const [{ jsPDF }, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);
    return { jsPDF, autoTable: autoTableMod.default };
}

/** Yield to the event loop so the spinner can paint before heavy work blocks. */
const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0));

// ─── BRAND COLORS (RGB tuples for jsPDF) ───────────────────────────────────

const BRAND: [number, number, number] = [99, 71, 219];          // purple banner
const INCOME: [number, number, number] = [34, 197, 94];         // green
const EXPENSE: [number, number, number] = [239, 68, 68];        // red
const INVESTMENT: [number, number, number] = [139, 92, 246];    // purple
const MUTED: [number, number, number] = [100, 116, 139];        // slate-500
const TEXT: [number, number, number] = [30, 41, 59];            // slate-800
const HEADER_TEXT: [number, number, number] = [255, 255, 255];  // white
const BORDER: [number, number, number] = [226, 232, 240];       // slate-200
const ALT_ROW: [number, number, number] = [248, 250, 252];      // slate-50

// Soft tinted backgrounds for stat boxes
const TINT_INCOME: [number, number, number] = [220, 252, 231];     // green-100
const TINT_EXPENSE: [number, number, number] = [254, 226, 226];    // red-100
const TINT_INVESTMENT: [number, number, number] = [237, 233, 254]; // purple-100
const TINT_NEUTRAL: [number, number, number] = [241, 245, 249];    // slate-100
const TINT_BRAND: [number, number, number] = [237, 233, 254];      // purple-100 (today highlight)

// Hard cap on rows in transaction tables — prevents OOM on low-end Android
// when a user has 5000+ entries. Totals always reflect the FULL data set.
const MAX_TX_ROWS = 1500;

// ─── PUBLIC HELPERS ────────────────────────────────────────────────────────

/**
 * Format an amount in Indian numbering with "Rs. " prefix.
 * Negatives get a leading minus: -Rs. 1,000.
 * Always rounds to integer (no decimals in PDF reports).
 */
export function formatINR(n: number | undefined | null): string {
    if (n === undefined || n === null || Number.isNaN(n)) return 'Rs. 0';
    const abs = Math.abs(Math.round(n));
    const formatted = abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    return (n < 0 ? '-Rs. ' : 'Rs. ') + formatted;
}

/**
 * Strip emoji + non-Latin glyphs from any user-supplied string before drawing.
 * Also replaces a small set of common Unicode characters that jsPDF Helvetica
 * cannot render (arrows, en/em dashes, smart quotes) with ASCII equivalents.
 *
 * Without this, "9 Mar 2026 → 8 Apr 2026" was rendering as "9 Mar 2026 !' 8 Apr 2026"
 * because U+2192 RIGHTWARDS ARROW falls outside Helvetica's WinAnsi encoding.
 */
function s(text: string | number | undefined | null): string {
    if (text === undefined || text === null) return '';
    const cleaned = String(text)
        // Arrows → "to" / "-"
        .replace(/[\u2192\u2794\u27A1\u279C]/g, ' to ')   // → ➔ ➡ ➜
        .replace(/[\u2190\u2B05]/g, ' to ')               // ← ⬅
        .replace(/[\u2194\u21C4]/g, ' - ')                // ↔ ⇄
        // En/em dash → ASCII hyphen (Helvetica handles them but they look odd next to plain hyphens)
        .replace(/[\u2013\u2014]/g, '-')                  // – —
        // Smart quotes → ASCII
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")      // ' ' ‚ ‛
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')      // " " „ ‟
        // Bullet → asterisk
        .replace(/[\u2022\u2023]/g, '*')                  // • ‣
        // Ellipsis → three dots
        .replace(/\u2026/g, '...')
        // Collapse double spaces left over from " to " replacement
        .replace(/  +/g, ' ');
    return sanitizeForPDF(cleaned);
}

/** Date tag for filenames: "08042026" */
function dateTag(d: Date = new Date()): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}${mm}${d.getFullYear()}`;
}

/** "08042026" from a YYYY-MM-DD string */
function dateTagFromStr(yyyymmdd: string): string {
    const [y, m, d] = yyyymmdd.split('-');
    return `${d}${m}${y}`;
}

/** "Apr 2026" from year+month */
function monShortYear(year: number, month: number): string {
    return `${MONTH_NAMES[month - 1]}${year}`;
}

/** "Wed, 8 Apr 2026" from a YYYY-MM-DD string */
function fullDate(yyyymmdd: string): string {
    const d = new Date(yyyymmdd + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
}

/** "8 Apr" from a YYYY-MM-DD string */
function shortDate(yyyymmdd: string): string {
    const d = new Date(yyyymmdd + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Looks up the human category label for an entry, falls back to the raw id. */
function categoryName(catId: string): string {
    return getCategoryById(catId)?.name ?? catId;
}

/** Maps an entry type to its display label */
function typeLabel(t: EntryType): string {
    if (t === 'expense') return 'Expense';
    if (t === 'income') return 'Income';
    if (t === 'investment') return 'Investment';
    return 'Transfer';
}

/**
 * Returns a clean description for an entry. When the user didn't enter a
 * custom description, the storage layer defaults it to the category name —
 * which makes the PDF look like "Food & Dining / Food & Dining" with the
 * same string twice. We collapse those to "—" so the table reads cleanly.
 */
function descriptionFor(entry: Entry): string {
    const desc = entry.description?.trim() || '';
    const cat = categoryName(entry.category);
    if (!desc || desc === cat) return '—';
    return desc;
}

/** Maps a type label back to its display color tuple. */
function typeColor(label: string): [number, number, number] {
    if (label === 'Expense') return EXPENSE;
    if (label === 'Income') return INCOME;
    if (label === 'Investment') return INVESTMENT;
    return MUTED;
}

/** Savings rate grade label */
function savingsGrade(rate: number): string {
    if (rate >= 30) return 'Excellent';
    if (rate >= 20) return 'Good';
    if (rate >= 10) return 'Fair';
    return 'Needs Improvement';
}

// ─── DATA INTERFACES ───────────────────────────────────────────────────────

export interface DailyReportData {
    date: string;             // YYYY-MM-DD
    entries: Entry[];
    budget?: Budget;
}

export interface WeeklyReportData {
    startDate: string;        // YYYY-MM-DD (Mon)
    endDate: string;          // YYYY-MM-DD (Sun)
    rangeLabel: string;       // "1 Apr - 7 Apr 2026"
    entries: Entry[];
    prevWeekEntries?: Entry[];
}

export interface MonthlyReportData {
    year: number;
    month: number;            // 1-12
    monthLabel: string;       // "April 2026"
    entries: Entry[];
    budget?: Budget;
    accounts?: BankAccount[];
}

export interface AnnualReportData {
    year: number;
    entries: Entry[];
    budget?: Budget;
}

export interface CustomReportData {
    startDate: string;
    endDate: string;
    rangeLabel: string;       // "1 Mar 2026 to 8 Apr 2026"
    entries: Entry[];
    budget?: Budget;
    accounts?: BankAccount[];
}

export interface HealthReportData {
    monthLabel: string;
    summary: PeriodSummary;
    health: FinancialHealthScore;
    netWorth: NetWorthSummary;
    /** Pre-translated insight rows (i18n is owned by the caller). */
    insights: Array<{ title: string; description: string; value?: string; tone: 'warning' | 'positive' | 'info' }>;
}

// ─── PDF DOC INTERNALS (typed loose because jsPDF lacks first-class types) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDoc = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutoTable = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CellHook = (data: any) => void;

// ─── PAGE HEADER + FOOTER ─────────────────────────────────────────────────

/**
 * Draws the brand header banner + meta line on the CURRENT page.
 * Banner = purple bar (0..22mm). Meta = small muted line at y=28mm.
 * Body content starts at y=35mm.
 *
 * The right-side text (report type + period) is auto-shrunk to fit the
 * available width. Without this, long custom range labels like
 * "Custom Report - 9 Mar 2026 to 8 Apr 2026" got clipped at the right edge.
 */
function drawHeader(doc: PDFDoc, reportType: string, periodLabel: string): void {
    const pw = doc.internal.pageSize.getWidth();

    // Purple banner
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, pw, 22, 'F');

    // Brand (left)
    doc.setTextColor(...HEADER_TEXT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const leftText = 'FinCalix - Expense Tracker';
    doc.text(leftText, 15, 12);
    const leftWidth = doc.getTextWidth(leftText);

    // Right-side text — auto-shrink to fit the gap between left brand and right margin.
    // Reserve a 6mm safety gap so the two texts never collide.
    doc.setFont('helvetica', 'normal');
    const rightText = s(`${reportType} - ${periodLabel}`);
    const maxRightWidth = pw - 15 - (15 + leftWidth + 6); // pageWidth - rightMargin - (leftStart + leftWidth + gap)

    let fontSize = 9;
    doc.setFontSize(fontSize);
    let textWidth = doc.getTextWidth(rightText);
    while (textWidth > maxRightWidth && fontSize > 6) {
        fontSize -= 0.5;
        doc.setFontSize(fontSize);
        textWidth = doc.getTextWidth(rightText);
    }
    doc.text(rightText, pw - 15, 12, { align: 'right' });

    // Meta line just below the banner
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    const ts = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
    doc.text(`Generated on: ${ts}`, 15, 28);
    doc.text('All data is stored locally on your device.', pw - 15, 28, { align: 'right' });

    // Reset for body
    doc.setTextColor(...TEXT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
}

/**
 * Walks every page in the doc and draws the footer line + page numbers + disclaimer.
 * Must be called once at the very end (after all content is drawn).
 */
function drawFooters(doc: PDFDoc): void {
    const total: number = doc.internal.getNumberOfPages();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= total; i++) {
        doc.setPage(i);

        doc.setDrawColor(...BORDER);
        doc.line(15, ph - 15, pw - 15, ph - 15);

        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.setFont('helvetica', 'normal');

        doc.text('FinCalix - Your Financial Companion', 15, ph - 9);
        doc.text('For informational purposes only. Not financial advice.', pw / 2, ph - 9, { align: 'center' });
        doc.text(`Page ${i} of ${total}`, pw - 15, ph - 9, { align: 'right' });
    }
}

/**
 * Returns a `didDrawPage` hook that draws the header on every NEW page automatically.
 * Page 1 is pre-marked as drawn so callers can render their own page-1 header
 * (so stat boxes / summaries can sit above the first table without overlap).
 */
function makeHeaderHook(doc: PDFDoc, reportType: string, periodLabel: string): CellHook {
    const drawn = new Set<number>([1]); // page 1 is drawn manually
    return () => {
        const current = doc.internal.getCurrentPageInfo().pageNumber;
        if (drawn.has(current)) return;
        drawn.add(current);
        drawHeader(doc, reportType, periodLabel);
    };
}

// ─── SECTION HEADER + STAT BOXES ──────────────────────────────────────────

/**
 * Draws "▌ Section Title" with a purple left-bar accent. Returns the new yPos.
 * Auto-paginates if there's not enough room before the next section.
 */
export function drawSectionHeader(doc: PDFDoc, title: string, yPos: number): number {
    let y = ensureRoom(doc, yPos, 12);

    // Purple accent bar
    doc.setFillColor(...BRAND);
    doc.rect(15, y - 4, 3, 8, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(s(title), 21, y + 2);

    // Reset
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    y += 9;
    return y;
}

/**
 * Draws a row of colored stat boxes (label + bold value).
 * `tone` controls the background tint and the value text color.
 * Returns yPos after the boxes.
 */
export function drawStatBoxes(
    doc: PDFDoc,
    boxes: Array<{ label: string; value: string; tone: 'income' | 'expense' | 'investment' | 'neutral' }>,
    yPos: number,
): number {
    if (boxes.length === 0) return yPos;
    const pw = doc.internal.pageSize.getWidth();
    const margin = 15;
    const gap = 4;
    const totalWidth = pw - margin * 2;
    const boxWidth = (totalWidth - gap * (boxes.length - 1)) / boxes.length;
    const boxHeight = 22;

    const TONE: Record<typeof boxes[number]['tone'], { fill: [number, number, number]; text: [number, number, number] }> = {
        income: { fill: TINT_INCOME, text: INCOME },
        expense: { fill: TINT_EXPENSE, text: EXPENSE },
        investment: { fill: TINT_INVESTMENT, text: INVESTMENT },
        neutral: { fill: TINT_NEUTRAL, text: TEXT },
    };

    boxes.forEach((b, i) => {
        const x = margin + i * (boxWidth + gap);
        const t = TONE[b.tone];

        doc.setFillColor(...t.fill);
        doc.roundedRect(x, yPos, boxWidth, boxHeight, 2.5, 2.5, 'F');

        doc.setTextColor(...MUTED);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(s(b.label.toUpperCase()), x + 4, yPos + 7);

        doc.setTextColor(...t.text);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(s(b.value), x + 4, yPos + 17);
    });

    // Reset
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    return yPos + boxHeight + 6;
}

/**
 * Convenience: ensures `needed` mm of room remains on the current page.
 * Adds a new page (header drawn via header hook on next table) if not.
 */
function ensureRoom(doc: PDFDoc, yPos: number, needed: number): number {
    const ph = doc.internal.pageSize.getHeight();
    if (yPos + needed > ph - 22) {
        doc.addPage();
        // Manually draw the header on the freshly added page (no autoTable involved here)
        drawHeader(doc, doc.__fc_reportType || 'Report', doc.__fc_periodLabel || '');
        return 35;
    }
    return yPos;
}

/**
 * Draws the full disclaimer block at the end of a report.
 * Renders as a bordered box with purple-tinted background, bold title,
 * and wrapped body text. Auto-paginates if the block doesn't fit.
 *
 * Combines the expense module's privacy disclaimer with a general "estimates
 * only / not financial advice" notice for full legal coverage. This is the
 * SAME message used by the in-app DisclaimerComponent so the PDF stays
 * consistent with what the user sees in the UI.
 */
function drawDisclaimerBlock(doc: PDFDoc, yPos: number): number {
    const pw = doc.internal.pageSize.getWidth();
    const margin = 15;
    const boxWidth = pw - margin * 2;
    const padding = 5;

    const title = 'Disclaimer';
    const body =
        'All expense data is stored completely locally on your device. FinCalix does not '
        + 'transmit, collect, or store your financial habits. The calculations and reports '
        + 'provided are estimates for informational and planning purposes only and should '
        + 'not be considered formal financial advice. Please verify specific figures with '
        + 'your financial institution and consult a certified financial advisor before '
        + 'making major financial decisions.';

    // Compute the wrapped text height first so we know the box height
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const textWidth = boxWidth - padding * 2;
    const wrapped: string[] = doc.splitTextToSize(s(body), textWidth);
    const lineHeight = 3.6;
    const titleHeight = 6;
    const bodyHeight = wrapped.length * lineHeight;
    const boxHeight = padding + titleHeight + bodyHeight + padding;

    // Make sure the whole block fits — push to a new page otherwise
    let y = ensureRoom(doc, yPos, boxHeight + 6);

    // Outer box with soft tinted background and border accent
    doc.setFillColor(248, 250, 252);             // slate-50
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, 'FD');

    // Purple left accent bar (3mm wide, full height)
    doc.setFillColor(...BRAND);
    doc.rect(margin, y, 1.5, boxHeight, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND);
    doc.text(title, margin + padding, y + padding + 4);

    // Body text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(wrapped, margin + padding, y + padding + titleHeight + 2);

    // Reset
    doc.setTextColor(...TEXT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    return y + boxHeight + 6;
}

/**
 * Tracks "current report context" on the doc itself so ensureRoom() can
 * draw the header on manually-added pages without re-passing args everywhere.
 */
function setReportContext(doc: PDFDoc, reportType: string, periodLabel: string): void {
    doc.__fc_reportType = reportType;
    doc.__fc_periodLabel = periodLabel;
}

// ─── AUTO-TABLE WRAPPER ────────────────────────────────────────────────────

/**
 * Thin wrapper around autoTable that:
 *  - applies our standard theme/colors
 *  - hooks the header onto every new page via makeHeaderHook
 *  - color-codes the Amount column based on the row's Type cell when an
 *    `amountColIdx` AND `typeColIdx` are passed (mixed-type tables)
 *  - or applies a UNIFORM color to the Amount column when `amountColIdx`
 *    AND `amountTone` are passed (single-type tables like Top Expenses)
 *  - rowPageBreak: 'avoid' keeps individual rows intact
 *  - When `keepTogether: true` is passed, the entire table will move to
 *    a new page if it can't fit on the current one (good for short tables
 *    that we don't want to orphan)
 */
function table(
    doc: PDFDoc,
    autoTable: AutoTable,
    cfg: {
        head: string[][];
        body: (string | number)[][];
        startY: number;
        headerHook: CellHook;
        amountColIdx?: number;
        typeColIdx?: number;
        amountTone?: 'expense' | 'income' | 'investment';
        keepTogether?: boolean;
        columnStyles?: Record<number, { halign?: 'left' | 'center' | 'right'; cellWidth?: number | 'auto' | 'wrap'; fontStyle?: string }>;
    },
): void {
    const TONE_MAP: Record<NonNullable<typeof cfg.amountTone>, [number, number, number]> = {
        expense: EXPENSE,
        income: INCOME,
        investment: INVESTMENT,
    };
    const uniformAmountColor = cfg.amountTone ? TONE_MAP[cfg.amountTone] : undefined;

    autoTable(doc, {
        head: cfg.head,
        body: cfg.body,
        startY: cfg.startY,
        theme: 'grid',
        pageBreak: cfg.keepTogether ? 'avoid' : 'auto',
        rowPageBreak: 'avoid',
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 2.5,
            textColor: TEXT,
            lineColor: BORDER,
            lineWidth: 0.1,
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: BRAND,
            textColor: HEADER_TEXT,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'left',
        },
        alternateRowStyles: { fillColor: ALT_ROW },
        columnStyles: cfg.columnStyles,
        margin: { top: 35, left: 15, right: 15, bottom: 22 },
        didDrawPage: cfg.headerHook,
        // Color-code the amount column based on the type cell, OR uniformly
        // by amountTone, plus highlight TOTAL rows.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
            if (data.section !== 'body') return;
            // Highlight the TOTAL row (when present) in bold
            const firstCell = data.row.raw?.[0];
            if (typeof firstCell === 'string' && firstCell.toUpperCase().startsWith('TOTAL')) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [240, 237, 252]; // soft purple
            }
            if (cfg.amountColIdx === undefined) return;
            if (data.column.index !== cfg.amountColIdx) return;

            // Mixed-type table: color amount by per-row type
            if (cfg.typeColIdx !== undefined) {
                const type = String(data.row.raw?.[cfg.typeColIdx] || '');
                const c = typeColor(type);
                data.cell.styles.textColor = c;
                data.cell.styles.fontStyle = 'bold';
                return;
            }

            // Single-type table: color uniformly via amountTone
            if (uniformAmountColor) {
                // Don't recolor TOTAL rows — they already have their own bold styling
                if (typeof firstCell === 'string' && firstCell.toUpperCase().startsWith('TOTAL')) return;
                data.cell.styles.textColor = uniformAmountColor;
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });
}

// ─── FILE SAVE ─────────────────────────────────────────────────────────────

function showToast(msg: string, isError = false): void {
    const old = document.getElementById('fncx-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'fncx-toast';
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)',
        background: isError ? '#dc2626' : '#059669', color: '#ffffff',
        padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
        zIndex: '99999', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
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

async function savePDF(doc: PDFDoc, filename: string): Promise<void> {
    const blob: Blob = doc.output('blob');

    if (Capacitor.isNativePlatform()) {
        try {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const { usePdfStore } = await import('../store/usePdfStore');
            const base64 = await blobToBase64(blob);
            const result = await Filesystem.writeFile({
                path: filename, data: base64, directory: Directory.Cache, recursive: true,
            });
            showToast('Report ready');
            usePdfStore.getState().showActionSheet(result.uri, filename);
        } catch (err) {
            console.error('Native PDF save failed:', err);
            showToast('Could not save PDF', true);
            throw err;
        }
        return;
    }

    // Web download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    showToast('Report downloaded');
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. DAILY REPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function generateDailyPDF(data: DailyReportData): Promise<void> {
    const { jsPDF, autoTable } = await getJsPDF();
    await yieldToUI();

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const reportType = 'Daily Financial Report';
    const periodLabel = fullDate(data.date);

    setReportContext(doc, reportType, periodLabel);
    drawHeader(doc, reportType, periodLabel);
    const headerHook = makeHeaderHook(doc, reportType, periodLabel);

    let yPos = 36;

    // Sort by createdAt (closest thing we have to entry time)
    const dayEntries = [...data.entries].sort((a, b) =>
        (a.createdAt || '').localeCompare(b.createdAt || ''),
    );

    const summary = calculateSummary(dayEntries, data.budget);

    // ── SUMMARY BANNER ──────────────────────────────────────────────────
    yPos = drawStatBoxes(doc, [
        { label: 'Total Earned', value: formatINR(summary.totalIncome), tone: 'income' },
        { label: 'Total Spent', value: formatINR(summary.totalExpenses), tone: 'expense' },
        { label: 'Net', value: formatINR(summary.totalIncome - summary.totalExpenses), tone: summary.totalIncome - summary.totalExpenses >= 0 ? 'income' : 'expense' },
    ], yPos);

    if (summary.totalInvestments > 0) {
        yPos = drawStatBoxes(doc, [
            { label: 'Invested Today', value: formatINR(summary.totalInvestments), tone: 'investment' },
            { label: 'Active Entries', value: String(summary.entryCount), tone: 'neutral' },
            { label: 'Categories Used', value: String(summary.expenseByCategory.length + summary.incomeByCategory.length), tone: 'neutral' },
        ], yPos);
    }

    // ── SECTION 1: TRANSACTION LOG ──────────────────────────────────────
    yPos = drawSectionHeader(doc, `All Transactions - ${fullDate(data.date)}`, yPos);

    if (dayEntries.length === 0) {
        table(doc, autoTable, {
            head: [['Time', 'Category', 'Type', 'Description', 'Amount']],
            body: [['—', '—', '—', 'No transactions recorded for this day', '—']],
            startY: yPos,
            headerHook,
        });
    } else {
        const txBody = dayEntries.map((e) => [
            timeOf(e.createdAt),
            categoryName(e.category),
            typeLabel(e.type),
            descriptionFor(e),
            formatINR(e.amount),
        ]);
        table(doc, autoTable, {
            head: [['Time', 'Category', 'Type', 'Description', 'Amount']],
            body: txBody,
            startY: yPos,
            headerHook,
            amountColIdx: 4,
            typeColIdx: 2,
            keepTogether: txBody.length <= 10,
            columnStyles: {
                0: { cellWidth: 18 },
                4: { halign: 'right', cellWidth: 28 },
            },
        });
    }
    yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;

    // ── SECTION 2: SPENDING BY CATEGORY ─────────────────────────────────
    if (summary.expenseByCategory.length > 0) {
        yPos = drawSectionHeader(doc, 'Spending by Category', yPos);
        const catBody: (string | number)[][] = summary.expenseByCategory.map((c) => [
            c.categoryName,
            formatINR(c.amount),
            `${c.percentage.toFixed(1)}%`,
        ]);
        catBody.push(['TOTAL', formatINR(summary.totalExpenses), '100.0%']);
        table(doc, autoTable, {
            head: [['Category', 'Amount', "% of Day's Spending"]],
            body: catBody,
            startY: yPos,
            headerHook,
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 3: BUDGET CHECK (if budget set) ─────────────────────────
    if (data.budget && data.budget.categoryLimits.length > 0) {
        yPos = drawSectionHeader(doc, 'Budget Check', yPos);

        // For a daily view, budget limits are monthly — show daily share of monthly limit
        const daysInMonth = new Date(
            new Date(data.date).getFullYear(),
            new Date(data.date).getMonth() + 1,
            0,
        ).getDate();

        const budgetBody = data.budget.categoryLimits.map((cl) => {
            const cat = summary.expenseByCategory.find((c) => c.categoryId === cl.categoryId);
            const spent = cat?.amount ?? 0;
            const dailyShare = cl.monthlyLimit / daysInMonth;
            const remaining = dailyShare - spent;
            const status = spent === 0 ? 'No Activity' : spent > dailyShare ? 'Over Budget' : 'Within Budget';
            return [
                getCategoryById(cl.categoryId)?.name ?? cl.categoryId,
                formatINR(dailyShare),
                formatINR(spent),
                formatINR(remaining),
                status,
            ];
        });

        table(doc, autoTable, {
            head: [['Category', 'Daily Limit', 'Spent', 'Remaining', 'Status']],
            body: budgetBody,
            startY: yPos,
            headerHook,
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // Disclaimer block at the end of every report
    drawDisclaimerBlock(doc, (doc as PDFDoc).lastAutoTable.finalY + 8);

    drawFooters(doc);
    await savePDF(doc, `FinCalix_Daily_${dateTagFromStr(data.date)}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. WEEKLY REPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function generateWeeklyPDF(data: WeeklyReportData): Promise<void> {
    const { jsPDF, autoTable } = await getJsPDF();
    await yieldToUI();

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const reportType = 'Weekly Financial Report';
    const periodLabel = data.rangeLabel;

    setReportContext(doc, reportType, periodLabel);
    drawHeader(doc, reportType, periodLabel);
    const headerHook = makeHeaderHook(doc, reportType, periodLabel);

    let yPos = 36;

    const summary = calculateSummary(data.entries);
    const today = getTodayStr();

    // Days in this week up to & including today (skip future days)
    const daysInWeek: { date: string; dayName: string; isToday: boolean }[] = [];
    const start = new Date(data.startDate + 'T00:00:00');
    const end = new Date(data.endDate + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (ds > today) continue;
        daysInWeek.push({
            date: ds,
            dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
            isToday: ds === today,
        });
    }

    // Daily totals lookup
    const dailyMap = new Map(summary.dailyTotals.map((d) => [d.date, d]));
    const activeDays = daysInWeek.length;

    // Comparison vs last week (if data provided)
    let weekChange: string | null = null;
    if (data.prevWeekEntries) {
        const prev = calculateSummary(data.prevWeekEntries);
        if (prev.totalExpenses > 0) {
            const pct = ((summary.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100;
            const sign = pct >= 0 ? '+' : '';
            weekChange = `${sign}${pct.toFixed(0)}%`;
        }
    }

    // ── SUMMARY BANNER (4 boxes + comparison) ───────────────────────────
    yPos = drawStatBoxes(doc, [
        { label: 'Total Income', value: formatINR(summary.totalIncome), tone: 'income' },
        { label: 'Total Expenses', value: formatINR(summary.totalExpenses), tone: 'expense' },
        { label: 'Total Invested', value: formatINR(summary.totalInvestments), tone: 'investment' },
        { label: 'Net Saved', value: formatINR(summary.netSavings), tone: summary.netSavings >= 0 ? 'income' : 'expense' },
    ], yPos);

    yPos = drawStatBoxes(doc, [
        { label: 'Daily Average', value: formatINR(activeDays > 0 ? summary.totalExpenses / activeDays : 0), tone: 'neutral' },
        { label: 'Active Days', value: String(activeDays), tone: 'neutral' },
        { label: weekChange ? 'vs Last Week' : 'Entries', value: weekChange || String(summary.entryCount), tone: 'neutral' },
    ], yPos);

    // ── SECTION 1: DAY-BY-DAY ───────────────────────────────────────────
    yPos = drawSectionHeader(doc, `Day-by-Day Summary - ${data.rangeLabel}`, yPos);

    let totalI = 0, totalE = 0, totalIn = 0;
    const dayBody: (string | number)[][] = daysInWeek.map((d) => {
        const dt = dailyMap.get(d.date);
        const inc = dt?.income ?? 0;
        const exp = dt?.expenses ?? 0;
        const inv = dt?.investments ?? 0;
        totalI += inc; totalE += exp; totalIn += inv;
        return [
            d.dayName + (d.isToday ? ' (Today)' : ''),
            shortDate(d.date),
            formatINR(inc),
            formatINR(exp),
            formatINR(inv),
            formatINR(inc - exp),
        ];
    });
    dayBody.push(['TOTAL', '', formatINR(totalI), formatINR(totalE), formatINR(totalIn), formatINR(totalI - totalE)]);

    table(doc, autoTable, {
        head: [['Day', 'Date', 'Income', 'Expenses', 'Investments', 'Net']],
        body: dayBody,
        startY: yPos,
        headerHook,
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });
    yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;

    // ── SECTION 2: TRANSACTION LOG ──────────────────────────────────────
    yPos = drawSectionHeader(doc, 'Transaction Log', yPos);

    if (data.entries.length === 0) {
        table(doc, autoTable, {
            head: [['Date', 'Day', 'Category', 'Type', 'Description', 'Amount']],
            body: [['—', '—', '—', '—', 'No transactions recorded this week', '—']],
            startY: yPos,
            headerHook,
        });
    } else {
        const sorted = [...data.entries].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
        const trimmed = sorted.length > MAX_TX_ROWS ? sorted.slice(0, MAX_TX_ROWS) : sorted;
        const txBody = trimmed.map((e) => [
            shortDate(e.date),
            new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }),
            categoryName(e.category),
            typeLabel(e.type),
            descriptionFor(e),
            formatINR(e.amount),
        ]);
        table(doc, autoTable, {
            head: [['Date', 'Day', 'Category', 'Type', 'Description', 'Amount']],
            body: txBody,
            startY: yPos,
            headerHook,
            amountColIdx: 5,
            typeColIdx: 3,
            keepTogether: txBody.length <= 10,
            columnStyles: { 5: { halign: 'right' } },
        });
    }
    yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;

    // ── SECTION 3: SPENDING BY CATEGORY ─────────────────────────────────
    if (summary.expenseByCategory.length > 0) {
        yPos = drawSectionHeader(doc, 'Weekly Spending by Category', yPos);
        const catBody: (string | number)[][] = summary.expenseByCategory.map((c) => [
            c.categoryName,
            formatINR(c.amount),
            `${c.percentage.toFixed(1)}%`,
            formatINR(activeDays > 0 ? c.amount / activeDays : 0),
        ]);
        catBody.push(['TOTAL', formatINR(summary.totalExpenses), '100.0%', formatINR(activeDays > 0 ? summary.totalExpenses / activeDays : 0)]);
        table(doc, autoTable, {
            head: [['Category', 'Total Spent', '% of Week', 'Daily Avg']],
            body: catBody,
            startY: yPos,
            headerHook,
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 4: INCOME SOURCES ───────────────────────────────────────
    const incomeEntries = data.entries.filter((e) => e.type === 'income');
    if (incomeEntries.length > 0) {
        yPos = drawSectionHeader(doc, 'Income Sources This Week', yPos);
        const incBody = incomeEntries
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => [shortDate(e.date), categoryName(e.category), descriptionFor(e), formatINR(e.amount)]);
        table(doc, autoTable, {
            head: [['Date', 'Source', 'Description', 'Amount']],
            body: incBody,
            startY: yPos,
            headerHook,
            amountColIdx: 3,
            amountTone: 'income',
            keepTogether: incBody.length <= 8,
            columnStyles: { 3: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 5: INVESTMENTS ──────────────────────────────────────────
    const investmentEntries = data.entries.filter((e) => e.type === 'investment');
    if (investmentEntries.length > 0) {
        yPos = drawSectionHeader(doc, 'Investments This Week', yPos);
        const invBody = investmentEntries
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => [shortDate(e.date), categoryName(e.category), formatINR(e.amount), descriptionFor(e)]);
        table(doc, autoTable, {
            head: [['Date', 'Category', 'Amount', 'Note']],
            body: invBody,
            startY: yPos,
            headerHook,
            amountColIdx: 2,
            amountTone: 'investment',
            keepTogether: invBody.length <= 8,
            columnStyles: { 2: { halign: 'right' } },
        });
    }

    drawDisclaimerBlock(doc, (doc as PDFDoc).lastAutoTable.finalY + 8);
    drawFooters(doc);

    const fileSafe = (s: string) => s.replace(/[^\w]/g, '');
    const fname = `FinCalix_Weekly_${fileSafe(shortDate(data.startDate))}_to_${fileSafe(shortDate(data.endDate))}_${dateTagFromStr(data.startDate).slice(2)}.pdf`;
    await savePDF(doc, fname);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MONTHLY REPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function generateMonthlyPDF(data: MonthlyReportData): Promise<void> {
    const { jsPDF, autoTable } = await getJsPDF();
    await yieldToUI();

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const reportType = 'Monthly Financial Report';
    const periodLabel = data.monthLabel;

    setReportContext(doc, reportType, periodLabel);
    drawHeader(doc, reportType, periodLabel);
    const headerHook = makeHeaderHook(doc, reportType, periodLabel);

    let yPos = 36;

    const summary = calculateSummary(data.entries, data.budget);

    // ── PAGE 1: EXECUTIVE SUMMARY ───────────────────────────────────────
    yPos = drawSectionHeader(doc, `${data.monthLabel} Financial Summary`, yPos);

    yPos = drawStatBoxes(doc, [
        { label: 'Total Income', value: formatINR(summary.totalIncome), tone: 'income' },
        { label: 'Total Expenses', value: formatINR(summary.totalExpenses), tone: 'expense' },
    ], yPos);
    yPos = drawStatBoxes(doc, [
        { label: 'Total Invested', value: formatINR(summary.totalInvestments), tone: 'investment' },
        { label: 'Net Savings', value: formatINR(summary.netSavings), tone: summary.netSavings >= 0 ? 'income' : 'expense' },
    ], yPos);

    // Savings Rate badge + progress bar
    yPos = ensureRoom(doc, yPos, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text('Savings Rate:', 15, yPos);
    const rateText = `${summary.savingsRate.toFixed(1)}%   -   ${savingsGrade(summary.savingsRate)}`;
    doc.setTextColor(...(summary.savingsRate >= 20 ? INCOME : summary.savingsRate >= 10 ? [202, 138, 4] as [number, number, number] : EXPENSE));
    doc.text(rateText, 42, yPos);

    // Progress bar (background + fill)
    const barX = 15, barY = yPos + 3, barW = 180, barH = 5;
    doc.setFillColor(...BORDER);
    doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F');
    const fillW = Math.max(0, Math.min(100, summary.savingsRate)) / 100 * barW;
    doc.setFillColor(...(summary.savingsRate >= 20 ? INCOME : summary.savingsRate >= 10 ? [202, 138, 4] as [number, number, number] : EXPENSE));
    doc.roundedRect(barX, barY, fillW, barH, 1, 1, 'F');
    yPos = barY + barH + 6;
    doc.setTextColor(...TEXT);
    doc.setFont('helvetica', 'normal');

    // ── SECTION 1: CASH FLOW OVERVIEW ───────────────────────────────────
    yPos = drawSectionHeader(doc, `${data.monthLabel} Cash Flow`, yPos);

    const fixedExp = data.budget?.fixedExpenses.reduce((s, f) => s + f.amount, 0) ?? 0;
    const variableExp = Math.max(0, summary.totalExpenses - fixedExp);
    const investPct = summary.totalIncome > 0 ? (summary.totalInvestments / summary.totalIncome) * 100 : 0;

    table(doc, autoTable, {
        head: [['Metric', 'Amount', 'Notes']],
        body: [
            ['Total Income', formatINR(summary.totalIncome), `${summary.incomeCount} entries`],
            ['Fixed Expenses', formatINR(fixedExp), data.budget ? 'Rent, bills, EMIs (from budget)' : 'No budget set'],
            ['Variable Expenses', formatINR(variableExp), 'Category spending'],
            ['Total Expenses', formatINR(summary.totalExpenses), `${summary.expenseCount} entries`],
            ['Investments', formatINR(summary.totalInvestments), `${investPct.toFixed(1)}% of income`],
            ['Net Savings', formatINR(summary.netSavings), summary.netSavings >= 0 ? 'Positive' : 'Negative'],
            ['Savings Rate', `${summary.savingsRate.toFixed(1)}%`, 'Target: 20%'],
        ],
        startY: yPos,
        headerHook,
        columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
    });
    yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;

    // ── SECTION 2: WEEK-BY-WEEK (only completed/in-progress weeks) ──────
    const allWeeks = buildWeeklyBreakdown(data.entries, data.year, data.month);
    const today = getTodayStr();
    const visibleWeeks = allWeeks.filter((w) => w.startDate <= today);

    if (visibleWeeks.length > 0) {
        yPos = drawSectionHeader(doc, 'Week-by-Week Summary', yPos);
        let wI = 0, wE = 0, wIn = 0;
        const wBody: (string | number)[][] = visibleWeeks.map((w) => {
            wI += w.income; wE += w.expenses; wIn += w.investments;
            return [
                `Week ${w.weekNumber}`,
                w.label,
                formatINR(w.income),
                formatINR(w.expenses),
                formatINR(w.investments),
                formatINR(w.net),
            ];
        });
        wBody.push(['TOTAL', '', formatINR(wI), formatINR(wE), formatINR(wIn), formatINR(wI - wE)]);

        table(doc, autoTable, {
            head: [['Week', 'Period', 'Income', 'Expenses', 'Investments', 'Net']],
            body: wBody,
            startY: yPos,
            headerHook,
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 3: SPENDING BY CATEGORY ─────────────────────────────────
    if (summary.expenseByCategory.length > 0) {
        yPos = drawSectionHeader(doc, 'Spending by Category', yPos);
        // Daily-average denominator: use day-of-month for current month, full month otherwise
        const monthLastDay = new Date(data.year, data.month, 0).getDate();
        const isCurrentMonth = today.startsWith(`${data.year}-${String(data.month).padStart(2, '0')}`);
        const daysSoFar = isCurrentMonth
            ? Math.max(1, parseInt(today.split('-')[2], 10))
            : monthLastDay;

        const catBody: (string | number)[][] = summary.expenseByCategory.map((c, i) => [
            i + 1,
            c.categoryName,
            formatINR(c.amount),
            `${c.percentage.toFixed(1)}%`,
            formatINR(c.amount / daysSoFar),
        ]);
        catBody.push(['', 'TOTAL', formatINR(summary.totalExpenses), '100.0%', formatINR(summary.totalExpenses / daysSoFar)]);

        table(doc, autoTable, {
            head: [['Rank', 'Category', 'Amount', '% of Total', 'Daily Avg']],
            body: catBody,
            startY: yPos,
            headerHook,
            columnStyles: { 0: { halign: 'center', cellWidth: 14 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 4: TOP EXPENSES ─────────────────────────────────────────
    const topExpenses = data.entries
        .filter((e) => e.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

    if (topExpenses.length > 0) {
        yPos = drawSectionHeader(doc, 'Top Expenses This Month', yPos);
        const topBody = topExpenses.map((e) => [
            shortDate(e.date),
            categoryName(e.category),
            descriptionFor(e),
            formatINR(e.amount),
        ]);
        table(doc, autoTable, {
            head: [['Date', 'Category', 'Description', 'Amount']],
            body: topBody,
            startY: yPos,
            headerHook,
            amountColIdx: 3,
            amountTone: 'expense',
            keepTogether: topBody.length <= 8,
            columnStyles: { 3: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 5: INCOME SOURCES ───────────────────────────────────────
    const incomeEntries = data.entries.filter((e) => e.type === 'income');
    if (incomeEntries.length > 0) {
        yPos = drawSectionHeader(doc, 'Income Sources', yPos);
        const incBody = incomeEntries
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => [shortDate(e.date), categoryName(e.category), formatINR(e.amount)]);
        table(doc, autoTable, {
            head: [['Date', 'Source', 'Amount']],
            body: incBody,
            startY: yPos,
            headerHook,
            amountColIdx: 2,
            amountTone: 'income',
            keepTogether: incBody.length <= 8,
            columnStyles: { 2: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 6: INVESTMENT SUMMARY ───────────────────────────────────
    const investmentEntries = data.entries.filter((e) => e.type === 'investment');
    if (investmentEntries.length > 0) {
        yPos = drawSectionHeader(doc, 'Investments This Month', yPos);
        const invBody = investmentEntries
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => [shortDate(e.date), categoryName(e.category), formatINR(e.amount), descriptionFor(e)]);
        table(doc, autoTable, {
            head: [['Date', 'Category', 'Amount', 'Note']],
            body: invBody,
            startY: yPos,
            headerHook,
            amountColIdx: 2,
            amountTone: 'investment',
            keepTogether: invBody.length <= 8,
            columnStyles: { 2: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 7: BUDGET PERFORMANCE ───────────────────────────────────
    if (data.budget && data.budget.categoryLimits.length > 0) {
        yPos = drawSectionHeader(doc, 'Budget vs Actual', yPos);
        let totalLimit = 0, totalSpent = 0;
        const budgetBody: (string | number)[][] = data.budget.categoryLimits.map((cl) => {
            const cat = summary.expenseByCategory.find((c) => c.categoryId === cl.categoryId);
            const spent = cat?.amount ?? 0;
            const variance = cl.monthlyLimit - spent;
            const pct = cl.monthlyLimit > 0 ? (spent / cl.monthlyLimit) * 100 : 0;
            const status = spent === 0 ? 'On Track' : pct > 100 ? 'Over Budget' : pct > 80 ? 'On Track' : 'Under Budget';
            totalLimit += cl.monthlyLimit;
            totalSpent += spent;
            return [
                getCategoryById(cl.categoryId)?.name ?? cl.categoryId,
                formatINR(cl.monthlyLimit),
                formatINR(spent),
                formatINR(variance),
                status,
            ];
        });
        budgetBody.push([
            'TOTAL',
            formatINR(totalLimit),
            formatINR(totalSpent),
            formatINR(totalLimit - totalSpent),
            totalSpent > totalLimit ? 'Over Budget' : 'Under Budget',
        ]);
        table(doc, autoTable, {
            head: [['Category', 'Budget', 'Actual', 'Variance', 'Status']],
            body: budgetBody,
            startY: yPos,
            headerHook,
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 8: COMPLETE TRANSACTION LOG ─────────────────────────────
    yPos = drawSectionHeader(doc, `Complete Transaction Log - ${data.monthLabel}`, yPos);

    if (data.entries.length === 0) {
        table(doc, autoTable, {
            head: [['Date', 'Category', 'Type', 'Description', 'Amount']],
            body: [['—', '—', '—', 'No transactions recorded', '—']],
            startY: yPos,
            headerHook,
        });
    } else {
        const sorted = [...data.entries].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
        const trimmed = sorted.length > MAX_TX_ROWS ? sorted.slice(0, MAX_TX_ROWS) : sorted;
        const txBody = trimmed.map((e) => [
            shortDate(e.date),
            categoryName(e.category),
            typeLabel(e.type),
            descriptionFor(e),
            formatINR(e.amount),
        ]);
        table(doc, autoTable, {
            head: [['Date', 'Category', 'Type', 'Description', 'Amount']],
            body: txBody,
            startY: yPos,
            headerHook,
            amountColIdx: 4,
            typeColIdx: 2,
            keepTogether: txBody.length <= 10,
            columnStyles: { 4: { halign: 'right' } },
        });

        if (sorted.length > MAX_TX_ROWS) {
            const finalY = (doc as PDFDoc).lastAutoTable.finalY + 4;
            doc.setFontSize(7);
            doc.setTextColor(...MUTED);
            doc.text(
                `Note: showing ${MAX_TX_ROWS} of ${sorted.length} entries. All totals reflect the FULL dataset.`,
                15, finalY,
            );
            doc.setTextColor(...TEXT);
        }
    }

    // ── ACCOUNT BALANCES (optional appendix) ────────────────────────────
    if (data.accounts && data.accounts.length > 0) {
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
        yPos = drawSectionHeader(doc, 'Account Balances Snapshot', yPos);
        const accBody = data.accounts.map((a) => [a.name, a.bankName || '—', a.accountType, formatINR(a.manualBalance)]);
        const totalBalance = data.accounts.reduce((s, a) => s + a.manualBalance, 0);
        accBody.push(['TOTAL', '', '', formatINR(totalBalance)]);
        table(doc, autoTable, {
            head: [['Account', 'Bank', 'Type', 'Balance']],
            body: accBody,
            startY: yPos,
            headerHook,
            columnStyles: { 3: { halign: 'right' } },
        });
    }

    drawDisclaimerBlock(doc, (doc as PDFDoc).lastAutoTable.finalY + 8);
    drawFooters(doc);
    await savePDF(doc, `FinCalix_Monthly_${monShortYear(data.year, data.month)}_${dateTag()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ANNUAL REPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function generateAnnualPDF(data: AnnualReportData): Promise<void> {
    const { jsPDF, autoTable } = await getJsPDF();
    await yieldToUI();

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const reportType = 'Annual Financial Report';
    const periodLabel = String(data.year);

    setReportContext(doc, reportType, periodLabel);
    drawHeader(doc, reportType, periodLabel);
    const headerHook = makeHeaderHook(doc, reportType, periodLabel);

    let yPos = 36;

    const summary = calculateSummary(data.entries);
    const today = getTodayStr();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // ── PAGE 1: ANNUAL SUMMARY ──────────────────────────────────────────
    yPos = drawSectionHeader(doc, `${data.year} Annual Financial Report`, yPos);

    yPos = drawStatBoxes(doc, [
        { label: 'Total Income', value: formatINR(summary.totalIncome), tone: 'income' },
        { label: 'Total Expenses', value: formatINR(summary.totalExpenses), tone: 'expense' },
    ], yPos);
    yPos = drawStatBoxes(doc, [
        { label: 'Total Investments', value: formatINR(summary.totalInvestments), tone: 'investment' },
        { label: 'Total Savings', value: formatINR(summary.netSavings), tone: summary.netSavings >= 0 ? 'income' : 'expense' },
    ], yPos);

    // Annual savings rate label
    yPos = ensureRoom(doc, yPos, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text('Annual Savings Rate:', 15, yPos);
    doc.setTextColor(...(summary.savingsRate >= 20 ? INCOME : summary.savingsRate >= 10 ? [202, 138, 4] as [number, number, number] : EXPENSE));
    doc.text(`${summary.savingsRate.toFixed(1)}%   -   ${savingsGrade(summary.savingsRate)}`, 60, yPos);
    yPos += 8;
    doc.setTextColor(...TEXT);
    doc.setFont('helvetica', 'normal');

    // ── SECTION 1: MONTH-BY-MONTH ───────────────────────────────────────
    const lastMonthToShow = data.year === currentYear ? currentMonth : 12;

    type MonthRow = { m: number; label: string; inc: number; exp: number; inv: number; net: number; rate: number; isCurrent: boolean };
    const monthRows: MonthRow[] = [];
    for (let m = 1; m <= lastMonthToShow; m++) {
        const monthStr = `${data.year}-${String(m).padStart(2, '0')}`;
        const mEntries = data.entries.filter((e) => e.date.startsWith(monthStr));
        const mSum = calculateSummary(mEntries);
        monthRows.push({
            m,
            label: MONTH_NAMES[m - 1],
            inc: mSum.totalIncome,
            exp: mSum.totalExpenses,
            inv: mSum.totalInvestments,
            net: mSum.netSavings,
            rate: mSum.savingsRate,
            isCurrent: data.year === currentYear && m === currentMonth,
        });
    }

    yPos = drawSectionHeader(doc, 'Month-by-Month Breakdown', yPos);

    let aI = 0, aE = 0, aIn = 0;
    const monthBody: (string | number)[][] = monthRows.map((r) => {
        aI += r.inc; aE += r.exp; aIn += r.inv;
        return [
            r.label + (r.isCurrent ? ' (Current)' : ''),
            formatINR(r.inc),
            formatINR(r.exp),
            formatINR(r.inv),
            formatINR(r.net),
            `${r.rate.toFixed(1)}%`,
        ];
    });
    const completedMonths = monthRows.length;
    monthBody.push([
        'TOTAL',
        formatINR(aI),
        formatINR(aE),
        formatINR(aIn),
        formatINR(aI - aE),
        `${(aI > 0 ? ((aI - aE) / aI) * 100 : 0).toFixed(1)}%`,
    ]);
    monthBody.push([
        'AVERAGE / MONTH',
        formatINR(aI / completedMonths),
        formatINR(aE / completedMonths),
        formatINR(aIn / completedMonths),
        formatINR((aI - aE) / completedMonths),
        '',
    ]);

    table(doc, autoTable, {
        head: [['Month', 'Income', 'Expenses', 'Investments', 'Net Savings', 'Savings Rate']],
        body: monthBody,
        startY: yPos,
        headerHook,
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });
    yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;

    // ── SECTION 2: TOP SPENDING CATEGORIES ──────────────────────────────
    if (summary.expenseByCategory.length > 0) {
        yPos = drawSectionHeader(doc, 'Annual Spending by Category', yPos);
        const catBody: (string | number)[][] = summary.expenseByCategory.map((c, i) => [
            i + 1,
            c.categoryName,
            formatINR(c.amount),
            formatINR(c.amount / completedMonths),
            `${c.percentage.toFixed(1)}%`,
        ]);
        catBody.push(['', 'TOTAL', formatINR(summary.totalExpenses), formatINR(summary.totalExpenses / completedMonths), '100.0%']);
        table(doc, autoTable, {
            head: [['Rank', 'Category', 'Annual Total', 'Monthly Avg', '% of Expenses']],
            body: catBody,
            startY: yPos,
            headerHook,
            columnStyles: { 0: { halign: 'center', cellWidth: 14 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 3: SAVINGS RATE TREND ───────────────────────────────────
    yPos = drawSectionHeader(doc, 'Monthly Savings Rate Trend', yPos);
    const trendBody: (string | number)[][] = monthRows.map((r, i) => {
        const prev = monthRows[i - 1];
        const change = prev && i > 0
            ? `${(r.rate - prev.rate >= 0 ? '+' : '')}${(r.rate - prev.rate).toFixed(1)} pts`
            : '—';
        const grade = r.rate > 20 ? 'Excellent' : r.rate >= 10 ? 'Good' : r.inc === 0 && r.exp === 0 ? 'No data' : 'Needs Improvement';
        return [r.label, `${r.rate.toFixed(1)}%`, grade, change];
    });
    table(doc, autoTable, {
        head: [['Month', 'Savings Rate', 'Grade', 'vs Previous Month']],
        body: trendBody,
        startY: yPos,
        headerHook,
        columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
    });
    yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;

    // ── SECTION 4: TOP 10 ANNUAL EXPENSES ──────────────────────────────
    const topExpenses = data.entries
        .filter((e) => e.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    if (topExpenses.length > 0) {
        yPos = drawSectionHeader(doc, 'Top 10 Expenses of the Year', yPos);
        const topBody = topExpenses.map((e) => [
            new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            categoryName(e.category),
            descriptionFor(e),
            formatINR(e.amount),
        ]);
        table(doc, autoTable, {
            head: [['Date', 'Category', 'Description', 'Amount']],
            body: topBody,
            startY: yPos,
            headerHook,
            amountColIdx: 3,
            amountTone: 'expense',
            keepTogether: topBody.length <= 8,
            columnStyles: { 3: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 5: INVESTMENT SUMMARY ──────────────────────────────────
    if (summary.totalInvestments > 0) {
        yPos = drawSectionHeader(doc, 'Investment Summary', yPos);

        // Build month-by-month investment table
        const invByMonth: (string | number)[][] = [];
        let totalInvAll = 0;
        for (let m = 1; m <= lastMonthToShow; m++) {
            const monthStr = `${data.year}-${String(m).padStart(2, '0')}`;
            const mInvs = data.entries.filter((e) => e.date.startsWith(monthStr) && e.type === 'investment');
            if (mInvs.length === 0) continue;
            const total = mInvs.reduce((s, e) => s + e.amount, 0);
            totalInvAll += total;
            const cats = Array.from(new Set(mInvs.map((e) => categoryName(e.category)))).join(', ');
            invByMonth.push([MONTH_NAMES[m - 1], formatINR(total), cats]);
        }
        invByMonth.push(['TOTAL', formatINR(totalInvAll), '']);
        table(doc, autoTable, {
            head: [['Month', 'Total Invested', 'Categories']],
            body: invByMonth,
            startY: yPos,
            headerHook,
            columnStyles: { 1: { halign: 'right' } },
        });
    }

    drawDisclaimerBlock(doc, (doc as PDFDoc).lastAutoTable.finalY + 8);
    drawFooters(doc);
    await savePDF(doc, `FinCalix_Annual_${data.year}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. CUSTOM DATE RANGE REPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function generateCustomPDF(data: CustomReportData): Promise<void> {
    const { jsPDF, autoTable } = await getJsPDF();
    await yieldToUI();

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const days = Math.max(1, daysBetween(data.startDate, data.endDate) + 1);
    const reportType = 'Custom Report';
    const periodLabel = `${data.rangeLabel} (${days} days)`;

    setReportContext(doc, reportType, periodLabel);
    drawHeader(doc, reportType, periodLabel);
    const headerHook = makeHeaderHook(doc, reportType, periodLabel);

    let yPos = 36;

    const summary = calculateSummary(data.entries, data.budget);

    // ── EXECUTIVE SUMMARY ───────────────────────────────────────────────
    yPos = drawSectionHeader(doc, `Custom Range Summary - ${data.rangeLabel}`, yPos);

    yPos = drawStatBoxes(doc, [
        { label: 'Total Income', value: formatINR(summary.totalIncome), tone: 'income' },
        { label: 'Total Expenses', value: formatINR(summary.totalExpenses), tone: 'expense' },
    ], yPos);
    yPos = drawStatBoxes(doc, [
        { label: 'Total Invested', value: formatINR(summary.totalInvestments), tone: 'investment' },
        { label: 'Net Savings', value: formatINR(summary.netSavings), tone: summary.netSavings >= 0 ? 'income' : 'expense' },
    ], yPos);
    yPos = drawStatBoxes(doc, [
        { label: 'Days', value: String(days), tone: 'neutral' },
        { label: 'Daily Average', value: formatINR(summary.totalExpenses / days), tone: 'neutral' },
        { label: 'Entries', value: String(summary.entryCount), tone: 'neutral' },
    ], yPos);

    // ── CASH FLOW OVERVIEW ──────────────────────────────────────────────
    yPos = drawSectionHeader(doc, 'Cash Flow Overview', yPos);
    table(doc, autoTable, {
        head: [['Metric', 'Amount', 'Notes']],
        body: [
            ['Total Income', formatINR(summary.totalIncome), `${summary.incomeCount} entries`],
            ['Total Expenses', formatINR(summary.totalExpenses), `${summary.expenseCount} entries`],
            ['Investments', formatINR(summary.totalInvestments), `${summary.investmentCount} entries`],
            ['Net Savings', formatINR(summary.netSavings), summary.netSavings >= 0 ? 'Positive' : 'Negative'],
            ['Savings Rate', `${summary.savingsRate.toFixed(1)}%`, 'Target: 20%'],
        ],
        startY: yPos,
        headerHook,
        columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
    });
    yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;

    // ── DAY-BY-DAY SUMMARY ──────────────────────────────────────────────
    if (summary.dailyTotals.length > 0) {
        yPos = drawSectionHeader(doc, 'Day-by-Day Summary', yPos);
        let dI = 0, dE = 0, dIn = 0;
        const dayBody: (string | number)[][] = summary.dailyTotals.map((d) => {
            dI += d.income; dE += d.expenses; dIn += d.investments;
            return [
                fullDate(d.date),
                formatINR(d.income),
                formatINR(d.expenses),
                formatINR(d.investments),
                formatINR(d.income - d.expenses),
            ];
        });
        dayBody.push(['TOTAL', formatINR(dI), formatINR(dE), formatINR(dIn), formatINR(dI - dE)]);
        table(doc, autoTable, {
            head: [['Date', 'Income', 'Expenses', 'Investments', 'Net']],
            body: dayBody,
            startY: yPos,
            headerHook,
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SPENDING BY CATEGORY ────────────────────────────────────────────
    if (summary.expenseByCategory.length > 0) {
        yPos = drawSectionHeader(doc, 'Spending by Category', yPos);
        const catBody: (string | number)[][] = summary.expenseByCategory.map((c, i) => [
            i + 1,
            c.categoryName,
            formatINR(c.amount),
            `${c.percentage.toFixed(1)}%`,
            formatINR(c.amount / days),
        ]);
        catBody.push(['', 'TOTAL', formatINR(summary.totalExpenses), '100.0%', formatINR(summary.totalExpenses / days)]);
        table(doc, autoTable, {
            head: [['Rank', 'Category', 'Amount', '% of Total', 'Daily Avg']],
            body: catBody,
            startY: yPos,
            headerHook,
            columnStyles: { 0: { halign: 'center', cellWidth: 14 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── TOP EXPENSES ────────────────────────────────────────────────────
    const topExpenses = data.entries
        .filter((e) => e.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    if (topExpenses.length > 0) {
        yPos = drawSectionHeader(doc, 'Top Expenses in Range', yPos);
        const topBody = topExpenses.map((e) => [
            shortDate(e.date),
            categoryName(e.category),
            descriptionFor(e),
            formatINR(e.amount),
        ]);
        table(doc, autoTable, {
            head: [['Date', 'Category', 'Description', 'Amount']],
            body: topBody,
            startY: yPos,
            headerHook,
            amountColIdx: 3,
            amountTone: 'expense',
            keepTogether: topBody.length <= 8,
            columnStyles: { 3: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── INCOME SOURCES ──────────────────────────────────────────────────
    const incomeEntries = data.entries.filter((e) => e.type === 'income');
    if (incomeEntries.length > 0) {
        yPos = drawSectionHeader(doc, 'Income Sources', yPos);
        const incBody = incomeEntries
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => [shortDate(e.date), categoryName(e.category), formatINR(e.amount)]);
        table(doc, autoTable, {
            head: [['Date', 'Source', 'Amount']],
            body: incBody,
            startY: yPos,
            headerHook,
            amountColIdx: 2,
            amountTone: 'income',
            keepTogether: incBody.length <= 8,
            columnStyles: { 2: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── INVESTMENTS ────────────────────────────────────────────────────
    const investmentEntries = data.entries.filter((e) => e.type === 'investment');
    if (investmentEntries.length > 0) {
        yPos = drawSectionHeader(doc, 'Investments in Range', yPos);
        const invBody = investmentEntries
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => [shortDate(e.date), categoryName(e.category), formatINR(e.amount), descriptionFor(e)]);
        table(doc, autoTable, {
            head: [['Date', 'Category', 'Amount', 'Note']],
            body: invBody,
            startY: yPos,
            headerHook,
            amountColIdx: 2,
            amountTone: 'investment',
            keepTogether: invBody.length <= 8,
            columnStyles: { 2: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── TRANSACTION LOG ────────────────────────────────────────────────
    if (data.entries.length > 0) {
        yPos = drawSectionHeader(doc, 'Complete Transaction Log', yPos);
        const sorted = [...data.entries].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
        const trimmed = sorted.length > MAX_TX_ROWS ? sorted.slice(0, MAX_TX_ROWS) : sorted;
        const txBody = trimmed.map((e) => [
            shortDate(e.date),
            categoryName(e.category),
            typeLabel(e.type),
            descriptionFor(e),
            formatINR(e.amount),
        ]);
        // Short transaction logs (≤10 rows) keepTogether to avoid the 5/1 orphan
        // we saw with 6 entries breaking awkwardly across page 2/3.
        table(doc, autoTable, {
            head: [['Date', 'Category', 'Type', 'Description', 'Amount']],
            body: txBody,
            startY: yPos,
            headerHook,
            amountColIdx: 4,
            typeColIdx: 2,
            keepTogether: txBody.length <= 10,
            columnStyles: { 4: { halign: 'right' } },
        });
        if (sorted.length > MAX_TX_ROWS) {
            const finalY = (doc as PDFDoc).lastAutoTable.finalY + 4;
            doc.setFontSize(7);
            doc.setTextColor(...MUTED);
            doc.text(`Note: showing ${MAX_TX_ROWS} of ${sorted.length} entries. All totals reflect the FULL dataset.`, 15, finalY);
            doc.setTextColor(...TEXT);
        }
    }

    drawDisclaimerBlock(doc, (doc as PDFDoc).lastAutoTable.finalY + 8);
    drawFooters(doc);
    const fname = `FinCalix_Custom_${dateTagFromStr(data.startDate)}_to_${dateTagFromStr(data.endDate)}.pdf`;
    await savePDF(doc, fname);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. FINANCIAL HEALTH REPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function generateHealthReportPDF(data: HealthReportData): Promise<void> {
    const { jsPDF, autoTable } = await getJsPDF();
    await yieldToUI();

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const reportType = 'Financial Health Report';
    const periodLabel = data.monthLabel;

    setReportContext(doc, reportType, periodLabel);
    drawHeader(doc, reportType, periodLabel);
    const headerHook = makeHeaderHook(doc, reportType, periodLabel);

    let yPos = 36;

    // ── SECTION 1: HEALTH SCORE ─────────────────────────────────────────
    yPos = drawSectionHeader(doc, 'Financial Health Score', yPos);

    const grade = data.health.grade;
    const overall = data.health.overall;
    yPos = drawStatBoxes(doc, [
        { label: 'Overall Score', value: `${overall} / 100`, tone: 'investment' },
        { label: 'Grade', value: grade, tone: overall >= 70 ? 'income' : overall >= 45 ? 'neutral' : 'expense' },
        { label: 'Savings Rate', value: `${data.health.metrics.savingsRate.toFixed(1)}%`, tone: data.health.metrics.savingsRate >= 20 ? 'income' : 'expense' },
    ], yPos);

    yPos = drawStatBoxes(doc, [
        { label: 'Debt-to-Income', value: `${data.health.metrics.debtToIncomeRatio.toFixed(1)}%`, tone: data.health.metrics.debtToIncomeRatio <= 30 ? 'income' : 'expense' },
        { label: 'Investment Rate', value: `${data.health.metrics.investmentRate.toFixed(1)}%`, tone: data.health.metrics.investmentRate >= 10 ? 'income' : 'neutral' },
        { label: 'Emergency Fund', value: `${data.health.metrics.emergencyFundMonths.toFixed(1)} mo`, tone: data.health.metrics.emergencyFundMonths >= 3 ? 'income' : 'expense' },
    ], yPos);

    // Sub-scores table
    yPos = drawSectionHeader(doc, 'Score Breakdown', yPos);
    table(doc, autoTable, {
        head: [['Category', 'Score', 'Max', 'Status']],
        body: [
            ['Savings Rate', String(data.health.breakdown.savingsScore), '25', scoreStatus(data.health.breakdown.savingsScore, 25)],
            ['Debt Control', String(data.health.breakdown.debtScore), '25', scoreStatus(data.health.breakdown.debtScore, 25)],
            ['Investments', String(data.health.breakdown.investmentScore), '25', scoreStatus(data.health.breakdown.investmentScore, 25)],
            ['Budget Adherence', String(data.health.breakdown.budgetScore), '25', scoreStatus(data.health.breakdown.budgetScore, 25)],
            ['TOTAL', String(overall), '100', `Grade ${grade}`],
        ],
        startY: yPos,
        headerHook,
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
    });
    yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;

    // ── SECTION 2: NET WORTH ────────────────────────────────────────────
    yPos = drawSectionHeader(doc, 'Assets vs Liabilities', yPos);

    yPos = drawStatBoxes(doc, [
        { label: 'Total Assets', value: formatINR(data.netWorth.totalAssets), tone: 'income' },
        { label: 'Total Liabilities', value: formatINR(data.netWorth.totalLiabilities), tone: 'expense' },
        { label: 'Net Worth', value: formatINR(data.netWorth.netWorth), tone: data.netWorth.netWorth >= 0 ? 'income' : 'expense' },
    ], yPos);

    if (data.netWorth.assetBreakdown.length > 0 || data.netWorth.liabilityBreakdown.length > 0) {
        const rows: (string | number)[][] = [];
        data.netWorth.assetBreakdown.forEach((a) => {
            rows.push(['Asset', a.label.replace(/^expenses\./, ''), formatINR(a.value)]);
        });
        data.netWorth.liabilityBreakdown.forEach((l) => {
            rows.push(['Liability', l.label.replace(/^expenses\./, ''), formatINR(l.value)]);
        });
        rows.push(['NET WORTH', '', formatINR(data.netWorth.netWorth)]);

        table(doc, autoTable, {
            head: [['Type', 'Item', 'Amount']],
            body: rows,
            startY: yPos,
            headerHook,
            columnStyles: { 2: { halign: 'right' } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 3: SMART INSIGHTS ───────────────────────────────────────
    if (data.insights.length > 0) {
        yPos = drawSectionHeader(doc, 'Personalized Insights', yPos);
        const insBody = data.insights.map((i) => [
            i.tone === 'warning' ? 'Action Needed' : i.tone === 'positive' ? 'On Track' : 'Note',
            i.title,
            i.description,
            i.value || '—',
        ]);
        table(doc, autoTable, {
            head: [['Impact', 'Insight', 'Detail', 'Value']],
            body: insBody,
            startY: yPos,
            headerHook,
            columnStyles: { 0: { cellWidth: 28 }, 3: { halign: 'right', cellWidth: 24 } },
        });
        yPos = (doc as PDFDoc).lastAutoTable.finalY + 10;
    }

    // ── SECTION 4: SPENDING BREAKDOWN ───────────────────────────────────
    if (data.summary.expenseByCategory.length > 0) {
        yPos = drawSectionHeader(doc, 'Spending Breakdown', yPos);
        const catBody: (string | number)[][] = data.summary.expenseByCategory.map((c) => [
            c.categoryName,
            formatINR(c.amount),
            `${c.percentage.toFixed(1)}%`,
        ]);
        catBody.push(['TOTAL', formatINR(data.summary.totalExpenses), '100.0%']);
        table(doc, autoTable, {
            head: [['Category', 'Amount', '% of Total']],
            body: catBody,
            startY: yPos,
            headerHook,
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        });
    }

    drawDisclaimerBlock(doc, (doc as PDFDoc).lastAutoTable.finalY + 8);
    drawFooters(doc);
    await savePDF(doc, `FinCalix_Health_${data.monthLabel.replace(/\s+/g, '')}_${dateTag()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MISC PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Approximate "time" string from an ISO createdAt timestamp. Falls back to "—". */
function timeOf(iso: string | undefined): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return '—';
    }
}

/** Number of full days between two YYYY-MM-DD strings (end - start). */
function daysBetween(startStr: string, endStr: string): number {
    const s = new Date(startStr + 'T00:00:00').getTime();
    const e = new Date(endStr + 'T00:00:00').getTime();
    return Math.round((e - s) / 86400000);
}

/** Score → status text */
function scoreStatus(score: number, max: number): string {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'Excellent';
    if (pct >= 60) return 'Good';
    if (pct >= 40) return 'Fair';
    return 'Needs Work';
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC RE-EXPORTS for ergonomic helpers (so callers can drop drawSection and
// drawStatBoxes into custom one-off pages without re-importing types)
// ═══════════════════════════════════════════════════════════════════════════

export const addPageHeaderFooter = {
    header: drawHeader,
    footer: drawFooters,
};

// ═══════════════════════════════════════════════════════════════════════════
// CSV EXPORT — accountant-friendly raw data dump
// ═══════════════════════════════════════════════════════════════════════════
//
// CSV is what 99% of accountants and external tools want. PDFs are great for
// reading, CSV is great for re-importing into Excel/Tally/Zoho/QuickBooks.
//
// Format follows RFC 4180:
//   - Header row first
//   - Comma separator
//   - Fields with commas/quotes/newlines wrapped in double-quotes
//   - Internal double-quotes escaped by doubling
//   - CRLF line endings (Excel-friendly)
//
// Amount column is RAW number (no currency prefix) so spreadsheets can sum it.
// Type column is the literal "expense" / "income" / "investment" so users can
// filter or pivot. Date is YYYY-MM-DD (ISO) for sortability.

export interface CSVExportData {
    /** Pretty label for the date range — used in the filename */
    rangeLabel: string;
    /** Range start (YYYY-MM-DD) — used in the filename */
    startDate: string;
    /** Range end (YYYY-MM-DD) — used in the filename */
    endDate: string;
    /** Entries already filtered to the date range */
    entries: Entry[];
}

/** RFC-4180 escape: wrap in quotes if value contains comma/quote/newline,
 *  and double any embedded quotes. */
function csvEscape(value: string | number): string {
    const str = String(value ?? '');
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/** Build a CSV string from an array of entries. */
export function buildExpenseCSV(entries: Entry[]): string {
    const headers = [
        'Date',
        'Type',
        'Category',
        'Description',
        'Amount',
        'Payment Method',
        'Account',
        'Created At',
        'Updated At',
    ];

    const rows = entries
        .slice()
        .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        })
        .map((e) => [
            e.date,
            e.type,
            categoryName(e.category),
            e.description || '',
            // Raw number — spreadsheets will treat as numeric
            Math.round(e.amount),
            e.paymentMethod,
            e.accountId || '',
            e.createdAt || '',
            e.updatedAt || '',
        ]);

    const lines: string[] = [];
    lines.push(headers.map(csvEscape).join(','));
    rows.forEach((row) => {
        lines.push(row.map(csvEscape).join(','));
    });

    // CRLF line endings — Excel handles these reliably across Windows/Mac
    return lines.join('\r\n') + '\r\n';
}

/** Generate + download an expense CSV for the given date range.
 *  Uses the same Capacitor-vs-web save path as the PDF generators. */
export async function generateExpenseCSV(data: CSVExportData): Promise<void> {
    await yieldToUI();

    const csv = buildExpenseCSV(data.entries);
    // BOM lets Excel detect UTF-8 properly (so Indian rupee, Hindi, etc. render)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const filename = `FinCalix_Expenses_${dateTagFromStr(data.startDate)}_to_${dateTagFromStr(data.endDate)}.csv`;

    if (Capacitor.isNativePlatform()) {
        try {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const { usePdfStore } = await import('../store/usePdfStore');
            const base64 = await blobToBase64(blob);
            const result = await Filesystem.writeFile({
                path: filename, data: base64, directory: Directory.Cache, recursive: true,
            });
            showToast('CSV ready');
            usePdfStore.getState().showActionSheet(result.uri, filename);
        } catch (err) {
            console.error('Native CSV save failed:', err);
            showToast('Could not save CSV', true);
            throw err;
        }
        return;
    }

    // Web download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    showToast('CSV downloaded');
}
