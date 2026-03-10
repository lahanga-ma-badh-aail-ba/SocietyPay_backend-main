import { jsPDF } from 'jspdf';

interface ReceiptData {
  receiptNumber: string;
  flatNumber: string;
  ownerName: string;
  month: number;
  year: number;
  amount: number;
  paymentMode: string;
  transactionId: string;
  paidAt: Date;
}

export const generateReceiptPDF = (data: ReceiptData): Buffer => {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(process.env.APP_NAME || 'Apartment Maintenance System', pageWidth / 2, 30, { align: 'center' });

  // Receipt Number
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${data.receiptNumber}`, 20, 45);
  doc.text(`Date: ${data.paidAt.toLocaleDateString()}`, pageWidth - 20, 45, { align: 'right' });

  // Divider
  doc.setLineWidth(0.5);
  doc.line(20, 50, pageWidth - 20, 50);

  // Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  
  let y = 65;
  const lineHeight = 10;

  doc.text('Flat Number:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.flatNumber, 80, y);

  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Owner Name:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.ownerName, 80, y);

  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Period:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${monthNames[data.month - 1]} ${data.year}`, 80, y);

  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`₹${data.amount.toFixed(2)}`, 80, y);

  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Mode:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentMode, 80, y);

  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction ID:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.transactionId, 80, y);

  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Date:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paidAt.toLocaleString(), 80, y);

  // Divider
  y += 15;
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);

  // Footer
  y += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, y, { align: 'center' });
  
  y += 10;
  doc.text('Thank you for your payment!', pageWidth / 2, y, { align: 'center' });

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
};