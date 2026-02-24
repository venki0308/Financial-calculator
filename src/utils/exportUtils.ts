import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (
    title: string,
    headers: string[],
    data: (string | number)[][],
    filename: string,
    chartImage?: string // Data URL from Chart.js
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
            const finalY = (doc as any).lastAutoTable.finalY + 15;

            // Check if we need a new page
            if (finalY > 200) {
                doc.addPage();
                doc.setFontSize(14);
                doc.setTextColor(15, 23, 42);
                doc.text("Visual Analysis", 14, 22);
                doc.addImage(chartImage, 'PNG', 14, 30, 180, 100);
            } else {
                doc.setFontSize(14);
                doc.setTextColor(15, 23, 42);
                doc.text("Visual Analysis", 14, finalY);
                doc.addImage(chartImage, 'PNG', 14, finalY + 10, 180, 100);
            }
        }

        // Add Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("FinCalix - Your Financial Companion", 14, 285);
            doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
        }

        doc.save(`${filename}.pdf`);
    } catch (error: any) {
        console.error('PDF Export Error:', error);
        alert('PDF Generation failed: ' + error.message);
    }
};

export const exportToExcel = (
    headers: string[],
    data: (string | number)[][],
    filename: string
) => {
    // Combine headers and data
    const worksheetData = [headers, ...data];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Results');

    // Save file
    XLSX.writeFile(wb, `${filename}.xlsx`);
};
