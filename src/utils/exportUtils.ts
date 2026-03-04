import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';

/**
 * Save a blob as a file — works in both browser and Capacitor WebView.
 * On native Android, uses the Filesystem + Share API to trigger download.
 */
async function saveBlobOnNative(blob: Blob, filename: string, mimeType: string) {
    try {
        // Convert blob to base64
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
                const result = reader.result as string;
                // Strip data URL prefix to get pure base64
                resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        // Write to cache directory
        const writeResult = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Cache,
        });

        // Open share sheet so user can save/open the file
        await Share.share({
            title: filename,
            url: writeResult.uri,
            dialogTitle: 'Save or open your file',
        });
    } catch (err) {
        console.error('[FinCalix] Native file save failed, falling back:', err);
        // Fallback: try blob URL download
        triggerBrowserDownload(blob, filename, mimeType);
    }
}

function triggerBrowserDownload(blob: Blob, filename: string, _mimeType: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 300);
}

export const exportToPDF = async (
    title: string,
    headers: string[],
    data: (string | number)[][],
    filename: string,
    chartImage?: string
) => {
    try {
        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text(title, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);

        // Add Header horizontal line
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 35, 196, 35);

        // Add Table
        const sanitizedData = data.map(row =>
            row.map(cell => typeof cell === 'string' ? cell.replace(/\u20B9/g, 'Rs.').replace(/₹/g, 'Rs.') : cell)
        );

        if (typeof autoTable === 'function') {
            autoTable(doc, {
                startY: 45,
                head: [headers],
                body: sanitizedData,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
                styles: { fontSize: 9 },
                margin: { top: 40 }
            });
        }

        // Add Chart if provided
        if (chartImage) {
            const finalY = (doc as any).lastAutoTable?.finalY ?? 45;
            const chartY = finalY + 15;
            if (chartY > 200) {
                doc.addPage();
                doc.setFontSize(14);
                doc.setTextColor(15, 23, 42);
                doc.text('Visual Analysis', 14, 22);
                doc.addImage(chartImage, 'PNG', 35, 30, 140, 90);
            } else {
                doc.setFontSize(14);
                doc.setTextColor(15, 23, 42);
                doc.text('Visual Analysis', 14, chartY);
                doc.addImage(chartImage, 'PNG', 35, chartY + 8, 140, 90);
            }
        }

        // Add Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('FinCalix - Your Financial Companion', 14, 285);
            doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
        }

        const pdfFilename = `${filename}.pdf`;

        if (Capacitor.isNativePlatform()) {
            // On Android, use filesystem + share
            const pdfBlob = doc.output('blob');
            await saveBlobOnNative(pdfBlob, pdfFilename, 'application/pdf');
        } else {
            // On web, use jsPDF .save() directly
            doc.save(pdfFilename);
        }
    } catch (error: any) {
        console.error('PDF Export Error:', error);
        alert('PDF Generation failed: ' + error.message);
    }
};

export const exportToExcel = async (
    headers: string[],
    data: (string | number)[][],
    filename: string
) => {
    try {
        const worksheetData = [headers, ...data];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(wb, ws, 'Results');

        const xlsxFilename = `${filename}.xlsx`;

        if (Capacitor.isNativePlatform()) {
            // Write to array buffer then convert to blob for native share
            const wbArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbArrayBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            await saveBlobOnNative(blob, xlsxFilename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } else {
            // On web, use XLSX writeFile directly
            XLSX.writeFile(wb, xlsxFilename);
        }
    } catch (error: any) {
        console.error('Excel Export Error:', error);
        alert('Excel export failed: ' + error.message);
    }
};
