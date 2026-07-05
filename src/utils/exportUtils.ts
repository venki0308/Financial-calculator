import { Capacitor } from '@capacitor/core';
import { useSettingsStore } from '../store/useSettingsStore';
import { darkColors, lightColors } from '../theme/colors';

// ─── Lazy loaders for heavy export libraries ─────────────────────────────────
// jsPDF (~250KB) + jspdf-autotable (~80KB) + xlsx (~430KB) are loaded only when
// the user actually triggers an export. This keeps the initial bundle small.

// Excel formula-injection guard (CWE-1236): user-entered text must not be
// interpreted as a formula when the exported file is opened in Excel.
// Defense-in-depth for '=' and '@' only; '+'/'-' are excluded because signed
// amounts (e.g. "+₹1,200", "-3.2%") are legitimate in financial exports and
// aoa_to_sheet stores strings as type-'s' cells Excel never evaluates.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeAoa<T extends any[][]>(rows: T): T {
    return rows.map(row =>
        row.map(cell =>
            typeof cell === 'string' && /^[=@\t\r]/.test(cell) ? `'${cell}` : cell
        )
    ) as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _jsPDFCached: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _autoTableCached: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _XLSXCached: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getJsPDF(): Promise<{ jsPDF: any; autoTable: any }> {
    if (_jsPDFCached) return { jsPDF: _jsPDFCached, autoTable: _autoTableCached };

    const [jspdfMod, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);
    const jsPDF = jspdfMod.jsPDF;

    // One-time monkey patch: sanitize all text to strip emoji jsPDF can't render
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalText = (jsPDF.prototype as any).text;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jsPDF.prototype as any).text = function (text: any, x: number, y: number, options?: any) {
        if (Array.isArray(text)) {
            text = text.map((t) => sanitizeForPDF(String(t)));
        } else {
            text = sanitizeForPDF(String(text));
        }
        return originalText.call(this, text, x, y, options);
    };

    _jsPDFCached = jsPDF;
    _autoTableCached = autoTableMod.default;
    return { jsPDF: _jsPDFCached, autoTable: _autoTableCached };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getXLSX(): Promise<any> {
    if (_XLSXCached) return _XLSXCached;
    _XLSXCached = await import('xlsx');
    return _XLSXCached;
}

// ─── Toast notification ────────────────────────────────────────────────────
// ─── PDF text sanitizer (strips emoji that jsPDF can't render) ─────────────
const stripEmoji = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .replace(/[\u{2600}-\u{27BF}]/gu, '')
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/[\uFE00-\uFE0F]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
};

export function sanitizeForPDF(text: string): string {
    // Remove emoji + common unicode symbols outside Latin-1 range
    return stripEmoji(text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')).trim();
}

// jsPDF monkey-patch (sanitize text) is now applied inside getJsPDF() lazy loader.

function showToast(message: string, isError = false) {
    const isDark = useSettingsStore.getState().darkMode;
    const c = isDark ? darkColors : lightColors;
    const old = document.getElementById('fncx-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'fncx-toast';
    t.textContent = message;
    Object.assign(t.style, {
        position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)',
        background: c.card, color: c.text,
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${isError ? (isDark ? '#ef4444' : '#dc2626') : (isDark ? '#10B981' : '#059669')}`,
        padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
        zIndex: '99999', boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.1)', whiteSpace: 'nowrap',
        maxWidth: '90vw', textAlign: 'center',
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// ─── Shared PDF Disclaimer ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addPdfDisclaimer(doc: any) {
    const totalPages: number = (doc as any).internal.getNumberOfPages();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const disc = 'For informational purposes only. Consult a certified financial advisor before making decisions. Results are estimates.';
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(210, 210, 210);
        doc.line(14, ph - 19, pw - 14, ph - 19);
        doc.setFontSize(8); doc.setTextColor(100);
        doc.text('FinCalix — Your Financial Companion', 14, ph - 13);
        doc.text(`Page ${i} of ${totalPages}`, pw - 14, ph - 13, { align: 'right' });
        doc.setFontSize(6.5); doc.setTextColor(155);
        const dLines = doc.splitTextToSize(disc, pw - 28);
        doc.text(dLines, 14, ph - 8);
    }
}

// ─── Blob → base64 ────────────────────────────────────────────────────────
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ─── Native save — writes to Cache (always writable), then shares ───────────
async function saveOnNative(blob: Blob, filename: string): Promise<void> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { usePdfStore } = await import('../store/usePdfStore');

    const base64 = await blobToBase64(blob);

    // Cache dir is always writable on Android without external storage permission
    const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
    });

    // Show success toast first
    showToast(`✅ File ready`);

    // Pass URI and filename to our global Action Sheet store
    usePdfStore.getState().showActionSheet(writeResult.uri, filename);
}


// ─── Web browser download ─────────────────────────────────────────────────
function browserDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
}

// ─── Public: Export PDF ───────────────────────────────────────────────────
export const exportToPDF = async (
    title: string,
    headers: string[],
    data: (string | number)[][],
    filename: string,
    chartImage?: string,
    chartSummary?: { label: string; value: string; color?: [number, number, number] }[]
): Promise<void> => {
    try {
        const { jsPDF, autoTable } = await getJsPDF();
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text(title, 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated by FinCalix  •  ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 33, 196, 33);

        // ─── Sanitise data ────────────────────────────────────────────────
        // 1. Detect separator rows ('---') and split table into sections
        // 2. Replace ₹ with INR (jsPDF Latin font can't render the Rupee symbol)
        const sanitise = (cell: string | number) => {
            if (typeof cell !== 'string') return cell;
            // 1. Replace Rupee symbol with INR
            let text = cell.replace(/₹\s*/g, 'INR ').replace(/Rs\.\s*/g, 'INR ');
            // 2. Strip emojis/special characters that jspdf can't render
            return sanitizeForPDF(text);
        };

        // Split at separator rows — first section = inputs, second = results
        const separatorIdx = data.findIndex(r => String(r[0]).startsWith('---'));
        const inputRows = (separatorIdx >= 0 ? data.slice(0, separatorIdx) : data)
            .map(r => r.map(sanitise));
        const resultRows = separatorIdx >= 0
            ? data.slice(separatorIdx + 1).map(r => r.map(sanitise))
            : [];

        let currentY = 40;

        if (typeof autoTable === 'function') {
            // Calculate equal width for generic tables in mm (182mm printable width)
            const genericColWidth = headers.length > 0 ? 182 / headers.length : 'auto';
            const genericStyles = { fontSize: 9, cellPadding: 1.5, overflow: 'hidden' as const };
            
            // Input parameters table
            if (inputRows.length > 0) {
                const colsDef: any = {};
                for (let i = 0; i < (headers.length || inputRows[0]?.length || 1); i++) {
                    colsDef[i] = { cellWidth: genericColWidth };
                }
                
                autoTable(doc, {
                    startY: currentY,
                    head: headers.length ? [headers.map(sanitise)] : undefined,
                    body: inputRows,
                    theme: 'grid',
                    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: genericStyles,
                    columnStyles: colsDef,
                    margin: { left: 14, right: 14 },
                });
                currentY = (doc as any).lastAutoTable?.finalY ?? currentY;
            }

            // Results table (after divider)
            if (resultRows.length > 0) {
                currentY += 6;
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text('Results', 14, currentY);
                currentY += 3;

                const resultColsDef: any = {};
                for (let i = 0; i < (resultRows[0]?.length || 1); i++) {
                    resultColsDef[i] = { cellWidth: 182 / (resultRows[0]?.length || 1) };
                }

                autoTable(doc, {
                    startY: currentY,
                    head: [],
                    body: resultRows,
                    theme: 'grid',
                    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [240, 253, 244] },
                    styles: genericStyles,
                    columnStyles: resultColsDef,
                    bodyStyles: { fontStyle: 'bold' },
                    margin: { left: 14, right: 14 },
                    didParseCell: (d: any) => {
                        if (d.row.index === resultRows.length - 1) {
                            d.cell.styles.fillColor = [16, 185, 129];
                            d.cell.styles.textColor = [255, 255, 255];
                            d.cell.styles.fontStyle = 'bold';
                        }
                    },
                });
            }
        }

        if (chartImage) {
            const finalY: number = (doc as any).lastAutoTable?.finalY ?? 40;
            const needsNewPage = finalY + 135 > 285;
            if (needsNewPage) doc.addPage();
            const y = needsNewPage ? 20 : finalY + 15;

            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text('Visual Summary', 14, y);

            // Chart image — fixed 300x300pt (~106x106mm), centred horizontally
            const chartImgSize = 106;
            const chartX = (210 - chartImgSize) / 2;
            doc.addImage(chartImage, 'PNG', chartX, y + 8, chartImgSize, chartImgSize);

            // ─── Chart legend/summary labels ──────────────────────────────
            if (chartSummary && chartSummary.length > 0) {
                const legendBody = chartSummary.map(item => {
                    const sanitisedVal = item.value.replace(/₹\s*/g, 'INR ');
                    return ['', item.label.toUpperCase(), sanitisedVal];
                });

                // Legend widths based on: 24pt (~8.5mm), 200pt (~70.5mm), 120pt (~42.5mm)
                // Total width = 121.5mm. Centring it:
                const legendMarginLeft = (210 - 121.5) / 2;

                autoTable(doc, {
                    startY: y + 8 + chartImgSize + 10,
                    head: [],
                    body: legendBody,
                    theme: 'plain',
                    styles: { fontSize: 9, cellPadding: 1.5, overflow: 'hidden' },
                    columnStyles: {
                        0: { cellWidth: 8.5 },    // Dot column
                        1: { cellWidth: 70.5, textColor: [100, 100, 100] },  // Label
                        2: { cellWidth: 42.5, fontStyle: 'bold' } // Value
                    },
                    margin: { left: legendMarginLeft, right: legendMarginLeft },
                    didDrawCell: (d: any) => {
                        // Draw the colored dot in the first column
                        if (d.column.index === 0 && d.section === 'body') {
                            const rgb = chartSummary[d.row.index].color ?? [100, 100, 100];
                            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                            doc.circle(d.cell.x + 5, d.cell.y + (d.cell.height / 2), 2, 'F');
                        }
                    },
                    didParseCell: (d: any) => {
                         // Color the text of the trailing amount column
                         if (d.column.index === 2 && d.section === 'body') {
                             d.cell.styles.textColor = chartSummary[d.row.index].color ?? [15, 23, 42];
                         }
                    }
                });
            }
        }

        addPdfDisclaimer(doc);

        const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

        if (Capacitor.isNativePlatform()) {
            showToast('⏳ Generating PDF…');
            const pdfBlob = doc.output('blob');
            await saveOnNative(pdfBlob, pdfFilename);
        } else {
            doc.save(pdfFilename);
            showToast('✅ PDF downloaded!');
        }
    } catch (err: any) {
        console.error('[FinCalix] PDF Error:', err);
        showToast(`❌ PDF failed: ${err?.message ?? 'Unknown error'}`, true);
    }
};

// ─── Public: Export Excel ─────────────────────────────────────────────────
export const exportToExcel = async (
    headers: string[],
    data: (string | number)[][],
    filename: string
): Promise<void> => {
    try {
        const parseCell = (cell: string | number): string | number => {
            if (typeof cell === 'number') return cell;
            const s = String(cell);
            const stripped = s.replace(/[₹,\s]/g, '');
            if (stripped !== '' && !isNaN(Number(stripped))) return Number(stripped);
            return s;
        };

        const allRows: (string | number)[][] = [
            headers,
            ...data.map(row => row.map(parseCell)),
        ];

        const XLSX = await getXLSX();
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(sanitizeAoa(allRows));

        // Auto column widths — all values are strings now so no type issues
        const colWidths: number[] = headers.map((h, i) => {
            let max = String(h).length;
            for (const row of allRows) {
                const len = String(row[i] ?? '').length;
                if (len > max) max = len;
            }
            return Math.min(max + 2, 30);
        });
        ws['!cols'] = colWidths.map(w => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, ws, 'Results');

        const xlsxFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

        if (Capacitor.isNativePlatform()) {
            showToast('⏳ Generating Excel…');
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
            const blob = new Blob([buf], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            await saveOnNative(blob, xlsxFilename);
        } else {
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
            const blob = new Blob([buf], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            browserDownload(blob, xlsxFilename);
            showToast('✅ Excel downloaded!');
        }
    } catch (err: any) {
        console.error('[FinCalix] Excel Error:', err);
        showToast(`❌ Excel failed: ${err?.message ?? 'Unknown error'}`, true);
    }
};

// ─── Comparison PDF (multi-page) ──────────────────────────────────────────
interface AmortEntry { month: number; emi: number; principal: number; interest: number; balance: number; }
interface ComparisonScenario {
    label: string;
    principal: number;
    rate: number;
    years: number;
    emi: number;
    totalInterest: number;
    totalPayment: number;
    amortization: AmortEntry[];
}
interface ComparisonPDFParams {
    type: string;
    scenarioA: ComparisonScenario;
    scenarioB: ComparisonScenario;
    insights: string[];
    winner: string;
}

const sanitiseCell = (cell: string | number) => {
    if (typeof cell !== 'string') return String(cell);
    return cell.replace(/₹\s*/g, 'INR ').replace(/Rs\.\s*/g, 'INR ').replace(/[^\x00-\x7F]/g, '').trim();
};

export const formatForPDF = (v: number | string): string => {
    const num = typeof v === 'string' ? parseFloat(v.toString().replace(/[^0-9.-]+/g, '')) : v;
    if (isNaN(num)) return String(v);
    return `INR ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const exportComparisonPDF = async (params: ComparisonPDFParams): Promise<void> => {
    try {
        showToast('Generating comparison report...');
        const { scenarioA, scenarioB, insights, winner } = params;
        const { jsPDF, autoTable } = await getJsPDF();
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();

        // ─── PAGE 1: Branded Header + Comparison Summary ─────────────
        doc.setFillColor(13, 59, 46);
        doc.rect(0, 0, pw, 42, 'F');
        doc.setFontSize(18); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
        doc.text('FinCalix', 14, 17);
        doc.setFontSize(12); doc.setFont('helvetica', 'normal');
        doc.text('Loan Comparison Report', 14, 29);
        doc.setFontSize(9); doc.setTextColor(195, 230, 210);
        doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), pw - 14, 17, { align: 'right' });
        doc.text(`Winner: Scenario ${winner}`, pw - 14, 27, { align: 'right' });

        let y = 52;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Comparison Summary', 14, y); y += 3;

        autoTable(doc, {
            startY: y,
            head: [['Metric', 'Scenario A', 'Scenario B', 'Difference']],
            body: [
                ['Loan Amount', formatForPDF(scenarioA.principal), formatForPDF(scenarioB.principal), formatForPDF(Math.abs(scenarioA.principal - scenarioB.principal))],
                ['Interest Rate', `${scenarioA.rate}%`, `${scenarioB.rate}%`, `${Math.abs(scenarioA.rate - scenarioB.rate).toFixed(1)}%`],
                ['Tenure', `${scenarioA.years} years`, `${scenarioB.years} years`, `${Math.abs(scenarioA.years - scenarioB.years)} years`],
                ['Monthly EMI', formatForPDF(scenarioA.emi), formatForPDF(scenarioB.emi), formatForPDF(Math.abs(scenarioA.emi - scenarioB.emi))],
                ['Total Interest', formatForPDF(scenarioA.totalInterest), formatForPDF(scenarioB.totalInterest), formatForPDF(Math.abs(scenarioA.totalInterest - scenarioB.totalInterest))],
                ['Total Payment', formatForPDF(scenarioA.totalPayment), formatForPDF(scenarioB.totalPayment), formatForPDF(Math.abs(scenarioA.totalPayment - scenarioB.totalPayment))],
            ],
            theme: 'grid',
            headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            styles: { fontSize: 8, cellPadding: 3 },
            margin: { left: 14, right: 14 },
            didParseCell: (d: any) => {
                if (d.section === 'body' && d.column.index === (winner === 'A' ? 1 : 2) && d.row.index >= 3) {
                    d.cell.styles.textColor = [16, 185, 129]; d.cell.styles.fontStyle = 'bold';
                }
            },
        });

        y = (doc as any).lastAutoTable?.finalY ?? 130;
        doc.setFontSize(11); doc.setTextColor(16, 185, 129); doc.setFont('helvetica', 'bold');
        doc.text(`Scenario ${winner} saves ${formatForPDF(Math.abs(scenarioA.totalInterest - scenarioB.totalInterest))} in total interest.`, 14, y + 10);

        // ─── Visual Comparison Bars ──────────────────────────────────
        y += 25;
        if (y + 80 > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Visual Comparison', 14, y); y += 8;

        [{ label: 'Monthly EMI', a: scenarioA.emi, b: scenarioB.emi },
         { label: 'Total Interest', a: scenarioA.totalInterest, b: scenarioB.totalInterest },
         { label: 'Total Payment', a: scenarioA.totalPayment, b: scenarioB.totalPayment }].forEach(m => {
            const max = Math.max(m.a, m.b, 1); const bw = 120;
            doc.setFontSize(9); doc.setTextColor(60); doc.setFont('helvetica', 'bold'); doc.text(m.label, 14, y); y += 5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
            doc.setTextColor(100); doc.text('A', 14, y + 3.5);
            doc.setFillColor(16, 185, 129); doc.rect(22, y, (m.a / max) * bw, 5, 'F');
            doc.setTextColor(16, 185, 129); doc.text(formatForPDF(m.a), 22 + (m.a / max) * bw + 2, y + 3.5); y += 7;
            doc.setTextColor(100); doc.text('B', 14, y + 3.5);
            doc.setFillColor(245, 158, 11); doc.rect(22, y, (m.b / max) * bw, 5, 'F');
            doc.setTextColor(245, 158, 11); doc.text(formatForPDF(m.b), 22 + (m.b / max) * bw + 2, y + 3.5); y += 14;
        });

        // ─── Amortization Schedule A ─────────────────────────────────
        doc.addPage(); y = 20;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Amortization — Scenario A', 14, y);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
        doc.text(`${formatForPDF(scenarioA.principal)} | ${scenarioA.rate}% | ${scenarioA.years}yr | EMI: ${formatForPDF(scenarioA.emi)}`, 14, y + 5); y += 8;

        autoTable(doc, {
            startY: y,
            head: [['Month', 'EMI', 'Principal', 'Interest', 'Balance']],
            body: scenarioA.amortization.filter((_, i) => i % 6 === 0 || i === scenarioA.amortization.length - 1)
                .map(r => [String(r.month), formatForPDF(r.emi), formatForPDF(r.principal), formatForPDF(r.interest), formatForPDF(r.balance)]),
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            styles: { fontSize: 7, cellPadding: 1.5 }, margin: { left: 14, right: 14 },
        });

        // ─── Amortization Schedule B ─────────────────────────────────
        doc.addPage(); y = 20;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Amortization — Scenario B', 14, y);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
        doc.text(`${formatForPDF(scenarioB.principal)} | ${scenarioB.rate}% | ${scenarioB.years}yr | EMI: ${formatForPDF(scenarioB.emi)}`, 14, y + 5); y += 8;

        autoTable(doc, {
            startY: y,
            head: [['Month', 'EMI', 'Principal', 'Interest', 'Balance']],
            body: scenarioB.amortization.filter((_, i) => i % 6 === 0 || i === scenarioB.amortization.length - 1)
                .map(r => [String(r.month), formatForPDF(r.emi), formatForPDF(r.principal), formatForPDF(r.interest), formatForPDF(r.balance)]),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
            alternateRowStyles: { fillColor: [254, 252, 232] },
            styles: { fontSize: 7, cellPadding: 1.5 }, margin: { left: 14, right: 14 },
        });

        // ─── Financial Insights ──────────────────────────────────────
        doc.addPage(); y = 20;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Financial Insights', 14, y); y += 6;
        insights.forEach((text, i) => {
            const lines = doc.splitTextToSize(`${i + 1}. ${sanitiseCell(text)}`, 174);
            const bh = lines.length * 4.5 + 3;
            if (y + bh > 270) { doc.addPage(); y = 20; }
            doc.setFillColor(240, 253, 244); doc.roundedRect(14, y, 182, bh, 2, 2, 'F');
            doc.setFontSize(8); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'normal');
            doc.text(lines, 18, y + 4); y += bh + 3;
        });
        y += 5;
        doc.setFontSize(9); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Recommendations', 14, y); y += 6;
        ['Compare offers from at least 3 lenders before finalizing.', 'Consider making 1 extra EMI per year to reduce tenure.', 'A 0.5% rate reduction can save lakhs over long tenures.', 'Keep total EMI below 30% of monthly income.', 'Review terms annually and consider balance transfer.'].forEach((rec, i) => {
            doc.setFontSize(7.5); doc.setTextColor(80); doc.setFont('helvetica', 'normal');
            doc.text(`${i + 1}. ${rec}`, 18, y); y += 5;
        });

        addPdfDisclaimer(doc);

        const pdfFilename = 'FinCalix_Loan_Comparison.pdf';
        if (Capacitor.isNativePlatform()) { await saveOnNative(doc.output('blob'), pdfFilename); }
        else { doc.save(pdfFilename); showToast('Comparison PDF downloaded!'); }
    } catch (err: any) {
        console.error('[FinCalix] Comparison PDF Error:', err);
        showToast('PDF export failed', true);
    }
};

// ─── SIP Comparison PDF ───────────────────────────────────────────────────
interface SIPComparisonParams {
    scenarioA: { monthly: number; rate: number; years: number; invested: number; futureValue: number; returns: number; };
    scenarioB: { monthly: number; rate: number; years: number; invested: number; futureValue: number; returns: number; };
    insights: string[];
    winner: string;
}

export const exportSIPComparisonPDF = async (params: SIPComparisonParams): Promise<void> => {
    try {
        showToast('Generating SIP comparison report...');
        const { scenarioA, scenarioB, insights, winner } = params;
        const { jsPDF, autoTable } = await getJsPDF();
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();

        // Branded Header
        doc.setFillColor(13, 59, 46); doc.rect(0, 0, pw, 42, 'F');
        doc.setFontSize(18); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
        doc.text('FinCalix', 14, 17);
        doc.setFontSize(12); doc.setFont('helvetica', 'normal');
        doc.text('SIP Comparison Report', 14, 29);
        doc.setFontSize(9); doc.setTextColor(195, 230, 210);
        doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), pw - 14, 17, { align: 'right' });
        doc.text(`Winner: Scenario ${winner}`, pw - 14, 27, { align: 'right' });

        let y = 52;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Comparison Summary', 14, y); y += 3;

        autoTable(doc, {
            startY: y,
            head: [['Metric', 'Scenario A', 'Scenario B', 'Difference']],
            body: [
                ['Monthly SIP', formatForPDF(scenarioA.monthly), formatForPDF(scenarioB.monthly), formatForPDF(Math.abs(scenarioA.monthly - scenarioB.monthly))],
                ['Return Rate', `${scenarioA.rate}%`, `${scenarioB.rate}%`, `${Math.abs(scenarioA.rate - scenarioB.rate).toFixed(1)}%`],
                ['Duration', `${scenarioA.years} years`, `${scenarioB.years} years`, `${Math.abs(scenarioA.years - scenarioB.years)} years`],
                ['Total Invested', formatForPDF(scenarioA.invested), formatForPDF(scenarioB.invested), formatForPDF(Math.abs(scenarioA.invested - scenarioB.invested))],
                ['Future Value', formatForPDF(scenarioA.futureValue), formatForPDF(scenarioB.futureValue), formatForPDF(Math.abs(scenarioA.futureValue - scenarioB.futureValue))],
                ['Total Returns', formatForPDF(scenarioA.returns), formatForPDF(scenarioB.returns), formatForPDF(Math.abs(scenarioA.returns - scenarioB.returns))],
            ],
            theme: 'grid',
            headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            styles: { fontSize: 8, cellPadding: 3 }, margin: { left: 14, right: 14 },
        });

        // Year-wise Projections
        doc.addPage(); y = 20;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Year-wise SIP Projection', 14, y); y += 5;
        const projRows: string[][] = [];
        const maxYrs = Math.max(scenarioA.years, scenarioB.years);
        for (let yr = 1; yr <= maxYrs; yr++) {
            const rA = scenarioA.rate / 100 / 12; const nA = Math.min(yr, scenarioA.years) * 12;
            const fvA = rA === 0 ? scenarioA.monthly * nA : scenarioA.monthly * (((Math.pow(1 + rA, nA) - 1) / rA) * (1 + rA));
            const rB = scenarioB.rate / 100 / 12; const nB = Math.min(yr, scenarioB.years) * 12;
            const fvB = rB === 0 ? scenarioB.monthly * nB : scenarioB.monthly * (((Math.pow(1 + rB, nB) - 1) / rB) * (1 + rB));
            projRows.push([String(yr), formatForPDF(Math.round(fvA)), formatForPDF(Math.round(fvB)), formatForPDF(Math.abs(Math.round(fvA - fvB)))]);
        }
        autoTable(doc, {
            startY: y, head: [['Year', 'Scenario A Value', 'Scenario B Value', 'Difference']], body: projRows,
            theme: 'striped', headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            styles: { fontSize: 7, cellPadding: 1.5 }, margin: { left: 14, right: 14 },
        });

        // Insights
        doc.addPage(); y = 20;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Financial Insights', 14, y); y += 6;
        insights.forEach((text, i) => {
            const lines = doc.splitTextToSize(`${i + 1}. ${sanitiseCell(text)}`, 174);
            const bh = lines.length * 4.5 + 3;
            if (y + bh > 270) { doc.addPage(); y = 20; }
            doc.setFillColor(240, 253, 244); doc.roundedRect(14, y, 182, bh, 2, 2, 'F');
            doc.setFontSize(8); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'normal');
            doc.text(lines, 18, y + 4); y += bh + 3;
        });
        y += 5;
        doc.setFontSize(9); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('SIP Tips', 14, y); y += 6;
        ['Start SIP early — even small amounts compound significantly.', 'Increase SIP by 10% annually (Step-Up SIP) for potentially better long-term wealth creation.', 'Equity SIPs with a 7+ year horizon have historically delivered strong returns vs. FDs in India, but past performance is not indicative of future returns and equity carries market risk.', 'Use STP if investing lumpsum — may reduce market timing risk.'].forEach((rec, i) => {
            doc.setFontSize(7.5); doc.setTextColor(80); doc.setFont('helvetica', 'normal');
            doc.text(`${i + 1}. ${rec}`, 18, y); y += 5;
        });

        addPdfDisclaimer(doc);
        const pdfFilename = 'FinCalix_SIP_Comparison.pdf';
        if (Capacitor.isNativePlatform()) { await saveOnNative(doc.output('blob'), pdfFilename); }
        else { doc.save(pdfFilename); showToast('SIP Comparison PDF downloaded!'); }
    } catch (err: any) {
        console.error('[FinCalix] SIP Comparison PDF Error:', err);
        showToast('PDF export failed', true);
    }
};

// ─── FD Comparison PDF ────────────────────────────────────────────────────
interface FDComparisonParams {
    scenarioA: { principal: number; rate: number; years: number; maturity: number; interest: number; };
    scenarioB: { principal: number; rate: number; years: number; maturity: number; interest: number; };
    insights: string[];
    winner: string;
}

export const exportFDComparisonPDF = async (params: FDComparisonParams): Promise<void> => {
    try {
        showToast('Generating FD comparison report...');
        const { scenarioA, scenarioB, insights, winner } = params;
        const { jsPDF, autoTable } = await getJsPDF();
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();

        // Branded Header
        doc.setFillColor(13, 59, 46); doc.rect(0, 0, pw, 42, 'F');
        doc.setFontSize(18); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
        doc.text('FinCalix', 14, 17);
        doc.setFontSize(12); doc.setFont('helvetica', 'normal');
        doc.text('FD Comparison Report', 14, 29);
        doc.setFontSize(9); doc.setTextColor(195, 230, 210);
        doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), pw - 14, 17, { align: 'right' });
        doc.text(`Winner: Scenario ${winner}`, pw - 14, 27, { align: 'right' });

        let y = 52;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Comparison Summary', 14, y); y += 3;

        autoTable(doc, {
            startY: y,
            head: [['Metric', 'Scenario A', 'Scenario B', 'Difference']],
            body: [
                ['Principal', formatForPDF(scenarioA.principal), formatForPDF(scenarioB.principal), formatForPDF(Math.abs(scenarioA.principal - scenarioB.principal))],
                ['Interest Rate', `${scenarioA.rate}%`, `${scenarioB.rate}%`, `${Math.abs(scenarioA.rate - scenarioB.rate).toFixed(1)}%`],
                ['Tenure', `${scenarioA.years} years`, `${scenarioB.years} years`, `${Math.abs(scenarioA.years - scenarioB.years)} years`],
                ['Maturity Amount', formatForPDF(scenarioA.maturity), formatForPDF(scenarioB.maturity), formatForPDF(Math.abs(scenarioA.maturity - scenarioB.maturity))],
                ['Interest Earned', formatForPDF(scenarioA.interest), formatForPDF(scenarioB.interest), formatForPDF(Math.abs(scenarioA.interest - scenarioB.interest))],
                ['Effective Return', `${((scenarioA.maturity / scenarioA.principal - 1) * 100).toFixed(1)}%`, `${((scenarioB.maturity / scenarioB.principal - 1) * 100).toFixed(1)}%`, ''],
            ],
            theme: 'grid',
            headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            styles: { fontSize: 8, cellPadding: 3 }, margin: { left: 14, right: 14 },
        });

        // Year-wise Growth
        doc.addPage(); y = 20;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Year-wise FD Growth', 14, y); y += 5;
        const fdProjRows: string[][] = [];
        const maxFdYrs = Math.max(scenarioA.years, scenarioB.years);
        for (let yr = 1; yr <= maxFdYrs; yr++) {
            const matA = yr <= scenarioA.years ? scenarioA.principal * Math.pow(1 + scenarioA.rate / 400, yr * 4) : scenarioA.maturity;
            const matB = yr <= scenarioB.years ? scenarioB.principal * Math.pow(1 + scenarioB.rate / 400, yr * 4) : scenarioB.maturity;
            fdProjRows.push([String(yr), formatForPDF(Math.round(matA)), formatForPDF(Math.round(matB)), formatForPDF(Math.abs(Math.round(matA - matB)))]);
        }
        autoTable(doc, {
            startY: y, head: [['Year', 'Scenario A Value', 'Scenario B Value', 'Difference']], body: fdProjRows,
            theme: 'striped', headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            styles: { fontSize: 7, cellPadding: 1.5 }, margin: { left: 14, right: 14 },
        });

        // Insights
        doc.addPage(); y = 20;
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Financial Insights', 14, y); y += 6;
        insights.forEach((text, i) => {
            const lines = doc.splitTextToSize(`${i + 1}. ${sanitiseCell(text)}`, 174);
            const bh = lines.length * 4.5 + 3;
            if (y + bh > 270) { doc.addPage(); y = 20; }
            doc.setFillColor(240, 253, 244); doc.roundedRect(14, y, 182, bh, 2, 2, 'F');
            doc.setFontSize(8); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'normal');
            doc.text(lines, 18, y + 4); y += bh + 3;
        });
        y += 5;
        doc.setFontSize(9); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('FD Tips', 14, y); y += 6;
        ['Compare FD rates across banks — even 0.25% difference matters.', 'Senior citizens get 0.5% extra on FD rates at most banks.', 'Tax-saving FD (5-year lock-in) qualifies for 80C deduction up to 1.5L.', 'FD interest is taxable — consider your tax slab before investing.', 'For large amounts, spread across banks to stay within 5L DICGC insurance.'].forEach((rec, i) => {
            doc.setFontSize(7.5); doc.setTextColor(80); doc.setFont('helvetica', 'normal');
            doc.text(`${i + 1}. ${rec}`, 18, y); y += 5;
        });

        addPdfDisclaimer(doc);
        const pdfFilename = 'FinCalix_FD_Comparison.pdf';
        if (Capacitor.isNativePlatform()) { await saveOnNative(doc.output('blob'), pdfFilename); }
        else { doc.save(pdfFilename); showToast('FD Comparison PDF downloaded!'); }
    } catch (err: any) {
        console.error('[FinCalix] FD Comparison PDF Error:', err);
        showToast('PDF export failed', true);
    }
};

// ─── Expense Tracker PDF ──────────────────────────────────────────────────
export interface ExpenseReportData {
    periodLabel: string;
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
    categoryData: { name: string; total: number; percentage: number }[];
    savingsTrend?: { month: string; saved: number; hasData: boolean }[];
    budgetVsActual?: { category: string; budget: number; actual: number }[];
    chartImage?: string;
    netWorth?: number;
    insights?: string[];
}

export const exportExpenseReportPDF = async (data: ExpenseReportData): Promise<void> => {
    try {
        showToast('Generating Expense Report…');
        const { jsPDF, autoTable } = await getJsPDF();
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();
        doc.setFont('helvetica', 'normal');

        // ── Branded Header ────────────────────────────────────────────────
        doc.setFillColor(13, 59, 46);
        doc.rect(0, 0, pw, 42, 'F');
        doc.setFontSize(18); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
        doc.text('FinCalix', 14, 17);
        doc.setFontSize(12); doc.setFont('helvetica', 'normal');
        doc.text('Expense & Budget Report', 14, 29);
        doc.setFontSize(9); doc.setTextColor(195, 230, 210);
        doc.text(stripEmoji(data.periodLabel), pw - 14, 17, { align: 'right' });
        doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), pw - 14, 27, { align: 'right' });

        let currentY = 52;

        // ── Key Financial Metrics ─────────────────────────────────────────
        doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
        doc.text('Key Financial Metrics', 14, currentY); currentY += 3;

        autoTable(doc, {
            startY: currentY,
            head: [['Metric', 'Amount', 'Note']],
            body: [
                ['Total Income', formatForPDF(data.income), ''],
                ['Total Expenses', formatForPDF(data.expenses), ''],
                ['Total Savings', formatForPDF(data.savings), `Savings Rate: ${data.savingsRate.toFixed(1)}%`],
                ...(data.netWorth !== undefined ? [['Estimated Net Worth', formatForPDF(data.netWorth), '']] : [])
            ],
            theme: 'grid',
            headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 14, right: 14 },
        });
        currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;

        // ── Category Breakdown ────────────────────────────────────────────
        if (data.categoryData.length > 0) {
            if (currentY + 20 > 270) { doc.addPage(); currentY = 20; }
            doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
            doc.text('Spending by Category', 14, currentY); currentY += 3;

            autoTable(doc, {
                startY: currentY,
                head: [['Category', 'Amount Spent', '% of Total']],
                body: data.categoryData.map(c => [
                    stripEmoji(c.name),
                    formatForPDF(c.total),
                    `${c.percentage.toFixed(1)}%`
                ]),
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
                alternateRowStyles: { fillColor: [240, 253, 244] },
                styles: { fontSize: 9, cellPadding: 2.5 },
                margin: { left: 14, right: 14 },
            });
            currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
        }

        // ── Spending Chart ────────────────────────────────────────────────
        if (data.chartImage) {
            if (currentY + 90 > 270) { doc.addPage(); currentY = 20; }
            doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
            doc.text('Spending Visualization', 14, currentY);
            const chartSize = 78;
            doc.addImage(data.chartImage, 'PNG', (pw - chartSize) / 2, currentY + 5, chartSize, chartSize);
            currentY += chartSize + 12;
        }

        // ── Budget vs Actual ──────────────────────────────────────────────
        if (data.budgetVsActual && data.budgetVsActual.length > 0) {
            if (currentY + 30 > 270) { doc.addPage(); currentY = 20; }
            doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
            doc.text('Budget vs Actual Analysis', 14, currentY); currentY += 3;

            autoTable(doc, {
                startY: currentY,
                head: [['Category', 'Budget', 'Actual', 'Status', 'Variance']],
                body: data.budgetVsActual.map(b => {
                    const variance = b.budget - b.actual;
                    return [stripEmoji(b.category), formatForPDF(b.budget), formatForPDF(b.actual),
                        variance >= 0 ? 'Under Budget' : 'Over Budget', formatForPDF(Math.abs(variance))];
                }),
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                alternateRowStyles: { fillColor: [240, 249, 255] },
                styles: { fontSize: 8, cellPadding: 2.5 },
                margin: { left: 14, right: 14 },
            });
            currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
        }

        // ── 6-Month Savings Trend ─────────────────────────────────────────
        if (data.savingsTrend && data.savingsTrend.length > 0) {
            if (currentY + 30 > 270) { doc.addPage(); currentY = 20; }
            doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
            doc.text('6-Month Savings Trend', 14, currentY); currentY += 3;

            autoTable(doc, {
                startY: currentY,
                head: [['Month', 'Amount Saved', 'Status']],
                body: data.savingsTrend.map(t => [
                    t.month,
                    formatForPDF(t.saved),
                    t.hasData ? (t.saved >= 0 ? 'Surplus' : 'Deficit') : 'No Data'
                ]),
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
                alternateRowStyles: { fillColor: [240, 253, 244] },
                styles: { fontSize: 9, cellPadding: 2.5 },
                margin: { left: 14, right: 14 },
            });
            currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
        }

        // ── Smart Financial Insights ──────────────────────────────────────
        if (data.insights && data.insights.length > 0) {
            if (currentY + 20 > 270) { doc.addPage(); currentY = 20; }
            doc.setFontSize(10); doc.setTextColor(13, 59, 46); doc.setFont('helvetica', 'bold');
            doc.text('Smart Financial Insights', 14, currentY); currentY += 5;

            data.insights.forEach(insight => {
                const cleanText = stripEmoji(insight);
                const lines = doc.splitTextToSize(cleanText, 174);
                const boxH = lines.length * 4.5 + 4;
                if (currentY + boxH > 270) { doc.addPage(); currentY = 20; }
                doc.setFillColor(240, 253, 244);
                doc.roundedRect(14, currentY, 182, boxH, 2, 2, 'F');
                doc.setFontSize(8); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'normal');
                doc.text(lines, 18, currentY + 4);
                currentY += boxH + 3;
            });
        }

        // ── Footer on every page ──────────────────────────────────────────
        const totalPages: number = (doc as any).internal.getNumberOfPages();
        const ph = doc.internal.pageSize.getHeight();
        const disc = 'For informational purposes only. Consult a certified financial advisor before making investment decisions. Results are estimates.';
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(210, 210, 210);
            doc.line(14, ph - 19, pw - 14, ph - 19);
            doc.setFontSize(8); doc.setTextColor(100); doc.setFont('helvetica', 'normal');
            doc.text('FinCalix — Your Financial Companion', 14, ph - 13);
            doc.text(`Page ${i} of ${totalPages}`, pw - 14, ph - 13, { align: 'right' });
            doc.setFontSize(6.5); doc.setTextColor(155);
            const dLines = doc.splitTextToSize(disc, pw - 28);
            doc.text(dLines, 14, ph - 8);
        }

        const safeLabel = stripEmoji(data.periodLabel).replace(/[\/\s]/g, '_');
        const pdfFilename = `FinCalix_Expense_Report_${safeLabel}.pdf`;

        if (Capacitor.isNativePlatform()) {
            const pdfBlob = doc.output('blob');
            await saveOnNative(pdfBlob, pdfFilename);
        } else {
            doc.save(pdfFilename);
            showToast('Expense Report PDF downloaded!');
        }
    } catch (err: any) {
        console.error('[FinCalix] Expense Report PDF Error:', err);
        showToast('PDF export failed', true);
    }
};

// ─── Overdraft PDF & Excel ──────────────────────────────────────────────────
export interface OverdraftReportData {
    limitNum: number;
    utilizedNum: number;
    rateNum: number;
    daysNum: number;
    utilPct: number;
    totalInterest: number;
    totalFees: number;
    totalPayableAmount: number;
    dailyInterest: number;
    isOverLimit: boolean;
    excess: number;
    monthsRemaining: number;
    penaltyPct: number;
    preclosureCharges: number;
    totalToClose: number;
    effectiveCost: number;
    odType: string;
}

export const exportOverdraftPDF = async (data: OverdraftReportData): Promise<void> => {
    try {
        showToast('⏳ Generating Overdraft Report…');
        const { jsPDF, autoTable } = await getJsPDF();
        const doc = new jsPDF();
        
        const formatRs = (val: number) => {
            return `INR ${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
        };

        const addHeaderFooter = (pageNum: number, totalPages: number) => {
            doc.setFillColor(30, 58, 138); 
            doc.rect(0, 0, 210, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('FinCalix - Smart Financial Tools', 14, 13);
            
            doc.setFillColor(248, 250, 252);
            doc.rect(0, 280, 210, 17, 'F');
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Generated by FinCalix App', 14, 289);
            doc.text(`Page ${pageNum} of ${totalPages}`, 180, 289);
        };

        // PAGE 1: Summary
        addHeaderFooter(1, 4);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Overdraft Assessment Report', 14, 35);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date of Report: ${new Date().toLocaleDateString('en-IN')}`, 14, 43);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Input Parameters', 14, 55);
        
        if (typeof autoTable === 'function') {
            autoTable(doc, {
                startY: 60,
                head: [['Parameter', 'Value']],
                body: [
                    ['OD Type', data.odType.toUpperCase()],
                    ['Sanctioned Limit', formatRs(data.limitNum)],
                    ['Utilized Amount', formatRs(data.utilizedNum)],
                    ['Interest Rate', `${data.rateNum}% p.a.`],
                    ['Duration', `${data.daysNum} days`],
                    ['Utilization Level', `${data.utilPct.toFixed(2)}%`]
                ],
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { font: 'helvetica' }
            });
            
            const finalY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Assessment Summary', 14, finalY);
            
            autoTable(doc, {
                startY: finalY + 5,
                head: [['Component', 'Amount']],
                body: [
                    ['Principal (Utilized)', formatRs(data.utilizedNum)],
                    ['Total Interest Accrued', formatRs(data.totalInterest)],
                    ['Total Fees & Charges', formatRs(data.totalFees)],
                    ['Total Amount Payable', formatRs(data.totalPayableAmount)]
                ],
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { font: 'helvetica' }
            });

            // PAGE 2: Interest Schedule
            doc.addPage();
            addHeaderFooter(2, 4);
            
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Daily Interest Schedule', 14, 35);
            
            const maxScheduleDays = Math.min(data.daysNum, 365); // Cap to avoid huge PDFs
            const fullScheduleRows = [];
            for(let i=1; i<=maxScheduleDays; i++) {
                let intOfDay = data.dailyInterest;
                if (data.isOverLimit) intOfDay += (data.excess * (data.rateNum + 2) / (365*100));
                fullScheduleRows.push([
                    `Day ${i}`,
                    formatRs(data.utilizedNum),
                    formatRs(intOfDay),
                    formatRs(intOfDay * i)
                ]);
            }
            
            autoTable(doc, {
                startY: 45,
                head: [['Day', 'Balance', 'Daily Interest', 'Cumulative Interest']],
                body: fullScheduleRows,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { font: 'helvetica' }
            });

            // PAGE 3: Pre-closure Summary
            doc.addPage();
            addHeaderFooter(3, 4);
            
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Pre-closure Analysis', 14, 35);
            
            autoTable(doc, {
                startY: 45,
                head: [['Detail', 'Value']],
                body: [
                    ['Months to Expiry', `${data.monthsRemaining} months`],
                    ['Pre-closure Penalty Rate', `${data.penaltyPct}%`],
                    ['Penalty Amount', formatRs(data.preclosureCharges)],
                    ['Outstanding Principal', formatRs(data.utilizedNum)],
                    ['Accrued Interest', formatRs(data.totalInterest)],
                    ['Total to Close OD', formatRs(data.totalToClose)]
                ],
                theme: 'striped',
                headStyles: { fillColor: [239, 68, 68] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { font: 'helvetica' }
            });

            // PAGE 4: Comparison & Tips
            doc.addPage();
            addHeaderFooter(4, 4);
            
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Overdraft vs. Personal Loan', 14, 35);
            
            autoTable(doc, {
                startY: 45,
                head: [['Feature', 'Overdraft (OD)', 'Personal Loan (PL)']],
                body: [
                    ['Interest Calculation', 'Daily on utilized limit', 'Monthly on disbursed amount'],
                    ['Flexibility', 'High (borrow/repay anytime)', 'Low (fixed EMIs)'],
                    ['Pre-closure Penalty', 'Usually Nil / Very low', 'High (2% - 5%)'],
                    ['Best Use Case', 'Short-term working capital', 'Lump-sum long-term expense']
                ],
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { font: 'helvetica' },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });
            
            const finalYPage4 = (doc as any).lastAutoTable.finalY + 20;
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Smart Optimization Tips', 14, finalYPage4);
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const tips = [
                "• Interest is calculated daily. Deposit idle cash back even on weekends.",
                "• Avoid breaching your sanctioned limit to prevent penal interest (typically +2% to 4%).",
                "• If utilization is constantly high, renegotiate rates with your bank.",
                "• Route incoming payments to the OD account directly to minimize outstanding balance."
            ];
            let yPos = finalYPage4 + 10;
            tips.forEach(tip => {
                const splitText = doc.splitTextToSize(tip, 180);
                doc.text(splitText, 14, yPos);
                yPos += (splitText.length * 6) + 4;
            });
        }

        addPdfDisclaimer(doc);
        const pdfFilename = `FinCalix_Overdraft_${new Date().toISOString().slice(0, 10)}.pdf`;
        if (Capacitor.isNativePlatform()) {
            const pdfBlob = doc.output('blob');
            await saveOnNative(pdfBlob, pdfFilename);
        } else {
            doc.save(pdfFilename);
            showToast('✅ OD PDF downloaded!');
        }
    } catch (err: any) {
        console.error('[FinCalix] Overdraft PDF Error:', err);
        showToast(`❌ PDF failed: ${err?.message ?? 'Unknown error'}`, true);
    }
};

export const exportOverdraftExcel = async (data: OverdraftReportData): Promise<void> => {
    try {
        const XLSX = await getXLSX();
        const wb = XLSX.utils.book_new();

        // SHEET 1: Summary
        const summaryData = [
            ['Overdraft Assessment Report'],
            [],
            ['Input Parameters'],
            ['OD Type', data.odType.toUpperCase()],
            ['Sanctioned Limit (Rs.)', data.limitNum],
            ['Utilized Amount (Rs.)', data.utilizedNum],
            ['Interest Rate (%)', data.rateNum],
            ['Duration (days)', data.daysNum],
            ['Utilization Level (%)', data.utilPct.toFixed(2) + '%'],
            [],
            ['Assessment Summary'],
            ['Total Interest (Rs.)', data.totalInterest],
            ['Total Fees (Rs.)', data.totalFees],
            ['Total Amount Payable (Rs.)', data.totalPayableAmount],
            ['Effective Cost (%)', data.effectiveCost.toFixed(2) + '%']
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(sanitizeAoa(summaryData));
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // SHEET 2: Daily Interest Schedule
        const maxScheduleDays = Math.min(data.daysNum, 365);
        const scheduleData: any[][] = [['Day', 'Balance (Rs.)', 'Daily Interest (Rs.)', 'Cumulative Interest (Rs.)']];
        for(let i=1; i<=maxScheduleDays; i++) {
            let intOfDay = data.dailyInterest;
            if (data.isOverLimit) intOfDay += (data.excess * (data.rateNum + 2) / (365*100));
            scheduleData.push([`Day ${i}`, data.utilizedNum, Number(intOfDay.toFixed(2)), Number((intOfDay * i).toFixed(2))]);
        }
        const wsSchedule = XLSX.utils.aoa_to_sheet(sanitizeAoa(scheduleData));
        XLSX.utils.book_append_sheet(wb, wsSchedule, 'Interest Schedule');

        // SHEET 3: Pre-closure Analysis
        const preclosureData = [
            ['Pre-closure Analysis'],
            [],
            ['Months to Expiry', data.monthsRemaining],
            ['Pre-closure Penalty Rate (%)', data.penaltyPct],
            ['Penalty Amount (Rs.)', data.preclosureCharges],
            ['Outstanding Principal (Rs.)', data.utilizedNum],
            ['Accrued Interest (Rs.)', data.totalInterest],
            ['Total to Close OD (Rs.)', data.totalToClose]
        ];
        const wsPreclosure = XLSX.utils.aoa_to_sheet(sanitizeAoa(preclosureData));
        XLSX.utils.book_append_sheet(wb, wsPreclosure, 'Pre-closure');

        const xlsxFilename = `FinCalix_Overdraft_${new Date().toISOString().slice(0, 10)}.xlsx`;

        if (Capacitor.isNativePlatform()) {
            showToast('⏳ Generating OD Excel…');
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            await saveOnNative(blob, xlsxFilename);
        } else {
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            browserDownload(blob, xlsxFilename);
            showToast('✅ OD Excel downloaded!');
        }
    } catch (err: any) {
        console.error('[FinCalix] Overdraft Excel Error:', err);
        showToast(`❌ Excel failed: ${err?.message ?? 'Unknown error'}`, true);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Dedicated Loan Report Exports (EMI Calculator) ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export interface LoanReportData {
    loanType: string;
    principal: number;
    rate: number;
    months: number;
    tenureYears: number;
    emi: number;
    totalInterest: number;
    totalPayment: number;
    method: string;
    schedule: Array<{
        month: number;
        openingBalance: number;
        emi: number;
        principal: number;
        interest: number;
        closingBalance: number;
        cumulativePrincipal: number;
        cumulativeInterest: number;
    }>;
    filename: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Format a number as "INR X,XX,XXX" (no rupee symbol, jsPDF-safe) */
function fmtINR(n: number): string {
    return 'INR ' + Math.round(n).toLocaleString('en-IN');
}

/** Build year-by-year summary from the month-by-month schedule */
function buildYearlyRows(schedule: LoanReportData['schedule']): Array<{
    year: number; opening: number; principalPaid: number;
    interestPaid: number; closing: number; cumInterest: number;
}> {
    const rows: ReturnType<typeof buildYearlyRows> = [];
    if (!schedule || schedule.length === 0) return rows;
    let idx = 0;
    let year = 1;
    while (idx < schedule.length) {
        const chunk = schedule.slice(idx, idx + 12);
        rows.push({
            year,
            opening: chunk[0].openingBalance,
            principalPaid: chunk.reduce((s, m) => s + m.principal, 0),
            interestPaid: chunk.reduce((s, m) => s + m.interest, 0),
            closing: chunk[chunk.length - 1].closingBalance,
            cumInterest: chunk[chunk.length - 1].cumulativeInterest,
        });
        idx += 12;
        year++;
    }
    return rows;
}

/** Draw a square pie chart on an offscreen 300×300 canvas and return PNG data-URL */
function drawLoanPieChart(principal: number, totalInterest: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const cx = 150, cy = 150, r = 120;
    const total = principal + totalInterest;
    const pAngle = (principal / total) * 2 * Math.PI;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 300, 300);

    // Principal slice — green
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + pAngle);
    ctx.closePath();
    ctx.fillStyle = '#10B981';
    ctx.fill();

    // Interest slice — orange-red
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI / 2 + pAngle, -Math.PI / 2 + 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#EF4444';
    ctx.fill();

    // White slice dividers
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();

    // White center donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    return canvas.toDataURL('image/png');
}

/** Add page footers with page numbers and disclaimer on every page */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addLoanPdfFooters(doc: any): void {
    const total: number = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.text('FinCalix — Your Financial Companion', 14, 283);
        doc.text(`Page ${i} / ${total}`, 196, 283, { align: 'right' });
        doc.setFontSize(6.5);
        doc.setTextColor(170);
        doc.text(
            'Disclaimer: This report is for informational purposes only and should not be considered financial advice.',
            14, 289
        );
    }
}

// ─── exportLoanPDF ────────────────────────────────────────────────────────
export const exportLoanPDF = async (data: LoanReportData): Promise<void> => {
    try {
        const {
            loanType, principal, rate, months, tenureYears,
            emi, totalInterest, totalPayment, method, schedule, filename,
        } = data;

        const { jsPDF, autoTable } = await getJsPDF();
        const doc = new jsPDF();
        const principalPct = ((principal / totalPayment) * 100).toFixed(1);
        const interestPct  = ((totalInterest / totalPayment) * 100).toFixed(1);

        // ── SECTION 1: Header ──────────────────────────────────────────
        doc.setFillColor(13, 59, 46);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('FinCalix', 14, 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        doc.text(`${loanType} - Full Report`, 14, 27);

        doc.setFontSize(9);
        doc.setTextColor(180, 230, 200);
        doc.text(
            `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
            14, 36
        );

        // Loan type badge (gold pill, top-right)
        const badgeLabel = loanType.toUpperCase();
        const badgeW = Math.max(badgeLabel.length * 2.1 + 12, 30);
        const badgeX = 196 - badgeW;
        doc.setFillColor(212, 160, 23);
        doc.roundedRect(badgeX, 13, badgeW, 10, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(13, 59, 46);
        doc.text(badgeLabel, badgeX + badgeW / 2, 19.5, { align: 'center' });

        let y = 48;

        // ── SECTION 2: Loan Summary Table ─────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(13, 59, 46);
        doc.text('Loan Summary', 14, y);
        y += 4;

        const summaryRows: string[][] = [
            ['Loan Type',                 loanType],
            ['Loan Amount',               fmtINR(principal)],
            ['Interest Rate (p.a.)',      `${rate}%`],
            ['Loan Tenure',               `${months} months (${tenureYears} ${tenureYears === 1 ? 'year' : 'years'})`],
            ['Interest Method',           method === 'flat' ? 'Flat Rate' : 'Reducing Balance'],
            ['Monthly EMI',               fmtINR(emi)],
            ['Total Interest Payable',    fmtINR(totalInterest)],
            ['Total Amount Payable',      fmtINR(totalPayment)],
            ['Principal Share',           `${principalPct}%`],
            ['Interest Share',            `${interestPct}%`],
        ];
        if (method === 'flat') {
            summaryRows.splice(4, 0, ['Effective Reducing Rate (approx.)', `${(rate * 1.83).toFixed(2)}% p.a.`]);
        }

        autoTable(doc, {
            startY: y,
            head: [['Parameter', 'Value']],
            body: summaryRows,
            theme: 'grid',
            headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
            alternateRowStyles: { fillColor: [240, 250, 244] },
            styles: { fontSize: 9.5, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 85, fontStyle: 'bold', textColor: [40, 40, 40] },
                1: { cellWidth: 97, textColor: [15, 23, 42] },
            },
            margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 10;

        // ── SECTION 3: Visual Summary (Pie Chart) ─────────────────────
        const chartH = 86;   // 80mm chart + 6mm padding
        const legendH = 36;  // 3-row legend
        if (y + 16 + chartH + legendH > 278) {
            doc.addPage();
            y = 16;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(13, 59, 46);
        doc.text('Visual Summary — Principal vs Interest', 14, y);
        y += 6;

        const pieImg = drawLoanPieChart(principal, totalInterest);
        if (pieImg) {
            const sz = 80;
            doc.addImage(pieImg, 'PNG', (210 - sz) / 2, y, sz, sz);
        }
        y += chartH;

        const legendColors = [[16, 185, 129], [239, 68, 68], [79, 70, 229]] as const;
        autoTable(doc, {
            startY: y,
            head: [],
            body: [
                ['', 'Principal Amount', fmtINR(principal), `${principalPct}%`],
                ['', 'Total Interest',   fmtINR(totalInterest), `${interestPct}%`],
                ['', 'Total Payable',    fmtINR(totalPayment), '100%'],
            ],
            theme: 'plain',
            styles: { fontSize: 9.5, cellPadding: 2.5 },
            columnStyles: {
                0: { cellWidth: 9 },
                1: { cellWidth: 72, fontStyle: 'bold', textColor: [40, 40, 40] },
                2: { cellWidth: 55, fontStyle: 'bold' },
                3: { cellWidth: 24, textColor: [100, 100, 100] },
            },
            margin: { left: (210 - 160) / 2, right: (210 - 160) / 2 },
            didDrawCell: (d: any) => {
                if (d.column.index === 0 && d.section === 'body' && d.row.index < 3) {
                    const [r, g, b] = legendColors[d.row.index];
                    doc.setFillColor(r, g, b);
                    doc.circle(d.cell.x + 5, d.cell.y + d.cell.height / 2, 2.5, 'F');
                }
            },
            didParseCell: (d: any) => {
                if (d.column.index === 2 && d.section === 'body' && d.row.index < 3) {
                    const [r, g, b] = legendColors[d.row.index];
                    d.cell.styles.textColor = [r, g, b];
                }
            },
        });

        // ── SECTION 4: Yearly Breakdown ───────────────────────────────
        doc.addPage();
        y = 16;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(13, 59, 46);
        doc.text('Yearly Breakdown', 14, y);
        y += 4;

        const yearlyData = buildYearlyRows(schedule);
        autoTable(doc, {
            startY: y,
            head: [['Year', 'Opening Balance', 'Principal Paid', 'Interest Paid', 'Closing Balance', 'Cumulative Interest']],
            body: yearlyData.map(r => [
                `Year ${r.year}`,
                fmtINR(r.opening),
                fmtINR(r.principalPaid),
                fmtINR(r.interestPaid),
                fmtINR(r.closing),
                fmtINR(r.cumInterest),
            ]),
            theme: 'grid',
            headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
            alternateRowStyles: { fillColor: [240, 250, 244] },
            styles: { fontSize: 8, cellPadding: 2.5 },
            columnStyles: {
                0: { cellWidth: 18, fontStyle: 'bold' },
                1: { cellWidth: 34 },
                2: { cellWidth: 33 },
                3: { cellWidth: 33 },
                4: { cellWidth: 34 },
                5: { cellWidth: 30 },
            },
            margin: { left: 14, right: 14 },
        });

        // ── SECTION 5: Full Amortization Schedule ─────────────────────
        doc.addPage();
        y = 16;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(13, 59, 46);
        doc.text('Full Amortization Schedule (Month-by-Month)', 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Month', 'EMI', 'Principal', 'Interest', 'Balance']],
            body: (schedule || []).map(row => [
                String(row.month),
                fmtINR(row.emi),
                fmtINR(row.principal),
                fmtINR(row.interest),
                fmtINR(row.closingBalance),
            ]),
            theme: 'grid',
            headStyles: { fillColor: [13, 59, 46], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: [240, 250, 244] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
                1: { cellWidth: 41 },
                2: { cellWidth: 41 },
                3: { cellWidth: 41 },
                4: { cellWidth: 41 },
            },
            margin: { left: 14, right: 14 },
        });

        // ── Footers on every page ──────────────────────────────────────
        addLoanPdfFooters(doc);

        // ── Save ──────────────────────────────────────────────────────
        const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        if (Capacitor.isNativePlatform()) {
            showToast('⏳ Generating PDF…');
            await saveOnNative(doc.output('blob'), pdfFilename);
        } else {
            doc.save(pdfFilename);
            showToast('✅ PDF downloaded!');
        }
    } catch (err: any) {
        console.error('[FinCalix] Loan PDF Error:', err);
        showToast(`❌ PDF failed: ${err?.message ?? 'Unknown error'}`, true);
    }
};

// ─── exportLoanExcel ─────────────────────────────────────────────────────
export const exportLoanExcel = async (data: LoanReportData): Promise<void> => {
    try {
        const {
            loanType, principal, rate, months, tenureYears,
            emi, totalInterest, totalPayment, method, schedule, filename,
        } = data;

        const round = (n: number) => Math.round(n);
        const XLSX = await getXLSX();
        const wb = XLSX.utils.book_new();

        // ── Sheet 1: Summary ──────────────────────────────────────────
        const principalPct = +((principal / totalPayment) * 100).toFixed(2);
        const interestPct  = +((totalInterest / totalPayment) * 100).toFixed(2);
        const summaryRows: (string | number)[][] = [
            ['FinCalix — Loan Report'],
            [],
            ['Parameter', 'Value'],
            ['Loan Type',                   loanType],
            ['Loan Amount (INR)',            round(principal)],
            ['Interest Rate (% p.a.)',       rate],
            ['Loan Tenure (months)',         months],
            ['Loan Tenure (years)',          tenureYears],
            ['Interest Method',             method === 'flat' ? 'Flat Rate' : 'Reducing Balance'],
            ['Monthly EMI (INR)',            round(emi)],
            ['Total Interest Payable (INR)', round(totalInterest)],
            ['Total Amount Payable (INR)',   round(totalPayment)],
            ['Principal Share (%)',          principalPct],
            ['Interest Share (%)',           interestPct],
            [],
            ['Generated by FinCalix', new Date().toLocaleDateString('en-IN')],
        ];
        if (method === 'flat') {
            summaryRows.splice(9, 0, ['Effective Reducing Rate (approx. % p.a.)', +((rate * 1.83).toFixed(2))]);
        }

        const ws1 = XLSX.utils.aoa_to_sheet(sanitizeAoa(summaryRows));
        ws1['!cols'] = [{ wch: 38 }, { wch: 24 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

        // ── Sheet 2: Yearly Breakdown ──────────────────────────────────
        const yearlyData = buildYearlyRows(schedule);
        const yHeaders = [
            'Year', 'Opening Balance (INR)', 'Principal Paid (INR)',
            'Interest Paid (INR)', 'Closing Balance (INR)', 'Cumulative Interest (INR)',
        ];
        const yRows = yearlyData.map(r => [
            `Year ${r.year}`, round(r.opening), round(r.principalPaid),
            round(r.interestPaid), round(r.closing), round(r.cumInterest),
        ]);
        const ws2 = XLSX.utils.aoa_to_sheet(sanitizeAoa([yHeaders, ...yRows]));
        ws2['!cols'] = yHeaders.map((h, i) => {
            let max = h.length;
            for (const row of yRows) max = Math.max(max, String(row[i]).length);
            return { wch: Math.min(max + 3, 30) };
        });
        XLSX.utils.book_append_sheet(wb, ws2, 'Yearly Breakdown');

        // ── Sheet 3: Amortization Schedule ────────────────────────────
        const aHeaders = ['Month', 'EMI (INR)', 'Principal (INR)', 'Interest (INR)', 'Outstanding Balance (INR)'];
        const aRows = (schedule || []).map(row => [
            row.month, round(row.emi), round(row.principal),
            round(row.interest), round(row.closingBalance),
        ]);
        const ws3 = XLSX.utils.aoa_to_sheet(sanitizeAoa([aHeaders, ...aRows]));
        ws3['!cols'] = aHeaders.map((h, i) => {
            let max = h.length;
            for (const row of aRows) max = Math.max(max, String(row[i]).length);
            return { wch: Math.min(max + 3, 30) };
        });
        XLSX.utils.book_append_sheet(wb, ws3, 'Amortization Schedule');

        // ── Save ──────────────────────────────────────────────────────
        const xlsxFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        if (Capacitor.isNativePlatform()) {
            showToast('⏳ Generating Excel…');
            await saveOnNative(blob, xlsxFilename);
        } else {
            browserDownload(blob, xlsxFilename);
            showToast('✅ Excel downloaded!');
        }
    } catch (err: any) {
        console.error('[FinCalix] Loan Excel Error:', err);
        showToast(`❌ Excel failed: ${err?.message ?? 'Unknown error'}`, true);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Dedicated Loan Report Exports (EMI Calculator) ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export interface LoanReportData {
    loanType: string;
    principal: number;
    rate: number;
    months: number;
    tenureYears: number;
    emi: number;
    totalInterest: number;
    totalPayment: number;
    method: string;
    schedule: Array<{
        month: number;
        openingBalance: number;
        emi: number;
        principal: number;
        interest: number;
        closingBalance: number;
        cumulativePrincipal: number;
        cumulativeInterest: number;
    }>;
    filename: string;
}

