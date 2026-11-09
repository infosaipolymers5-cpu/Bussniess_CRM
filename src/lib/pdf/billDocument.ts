/**
 * Cattle Feed Commercial Bill Document Generator.
 * Implements Feature 20, 11, 28:
 * - Sequential FY bill number
 * - Prominent REVISED badge for revised bills
 * - Material duration / expected finish date alert
 * - Previous outstanding & total outstanding reconciliation
 * - Bank / UPI details
 * - Computer-generated notice (explicitly NOT a GST tax invoice)
 * - WhatsApp share text generation
 */

import { SimplePDFBuilder, type TableColumn } from './pdfBuilder';
import { computeSha256 } from './checksum';
import type { BillDocumentSnapshot } from './types';
import { formatPaise } from '@/lib/money';
import { formatDate } from '@/lib/dates';

export async function generateBillPdf(
  snapshot: BillDocumentSnapshot,
): Promise<{ bytes: Uint8Array; checksum: string }> {
  const doc = new SimplePDFBuilder({
    title: `Commercial Bill - ${snapshot.bill.bill_number}`,
    author: snapshot.firm.name,
    subject: `Cattle Feed Commercial Bill ${snapshot.bill.bill_number}`,
  });

  const leftX = doc.margin;
  const rightX = doc.pageWidth - doc.margin;
  let y = doc.getY();

  // 1. Top Firm Header
  doc.setFont('Helvetica-Bold', 18);
  doc.drawText(snapshot.firm.name, leftX, y, {
    font: 'Helvetica-Bold',
    size: 18,
    color: [0.1, 0.18, 0.35],
  });

  // Right-aligned Title & Badges
  if (snapshot.bill.is_revised || snapshot.bill.revision_number > 1) {
    doc.drawBadge('REVISED', rightX - 60, y - 2, {
      bgColor: [0.95, 0.85, 0.7],
      textColor: [0.65, 0.3, 0.05],
      fontSize: 10,
    });
  }

  y -= 14;
  if (snapshot.firm.tagline) {
    doc.drawText(snapshot.firm.tagline, leftX, y, {
      font: 'Helvetica',
      size: 9,
      color: [0.4, 0.45, 0.5],
    });
    y -= 12;
  }

  // Address & Contacts
  const contactParts: string[] = [];
  if (snapshot.firm.address) contactParts.push(snapshot.firm.address);
  if (snapshot.firm.phone) contactParts.push(`Ph: ${snapshot.firm.phone}`);
  if (snapshot.firm.gstin) contactParts.push(`GSTIN: ${snapshot.firm.gstin}`);

  doc.drawText(contactParts.join(' | '), leftX, y, {
    font: 'Helvetica',
    size: 8,
    color: [0.4, 0.45, 0.5],
  });

  // Document Title Header Bar
  y -= 14;
  doc.drawLine(leftX, y, rightX, y, {
    lineWidth: 1.5,
    color: [0.15, 0.25, 0.45],
  });
  y -= 16;

  doc.drawText('COMMERCIAL BILL (व्यापारी बिल)', leftX, y, {
    font: 'Helvetica-Bold',
    size: 12,
    color: [0.12, 0.2, 0.38],
  });

  if (snapshot.bill.status === 'cancelled') {
    doc.drawBadge('CANCELLED (रद्द)', rightX - 90, y - 2, {
      bgColor: [0.98, 0.85, 0.85],
      textColor: [0.8, 0.1, 0.1],
      fontSize: 9,
    });
  }

  y -= 14;

  // 2. Bill & Customer Metadata Card
  const boxTop = y;
  const boxHeight = 58;
  doc.drawRect(leftX, boxTop - boxHeight, rightX - leftX, boxHeight, {
    fillColor: [0.97, 0.98, 0.99],
    strokeColor: [0.85, 0.88, 0.92],
    lineWidth: 0.5,
  });

  // Left side: Customer details
  const custX = leftX + 10;
  let custY = boxTop - 14;
  doc.drawText('BILLED TO (ग्राहक):', custX, custY, {
    font: 'Helvetica-Bold',
    size: 8,
    color: [0.45, 0.5, 0.55],
  });
  custY -= 12;
  doc.drawText(snapshot.customer.name, custX, custY, {
    font: 'Helvetica-Bold',
    size: 11,
    color: [0.1, 0.15, 0.25],
  });
  custY -= 11;
  const custSub = [snapshot.customer.display_phone];
  if (snapshot.customer.area) custSub.push(`Area: ${snapshot.customer.area}`);
  doc.drawText(custSub.join(' | '), custX, custY, {
    font: 'Helvetica',
    size: 8,
    color: [0.35, 0.4, 0.45],
  });

  // Right side: Bill details
  const billMetaX = rightX - 160;
  let metaY = boxTop - 14;
  doc.drawText(`Bill No: ${snapshot.bill.bill_number}`, billMetaX, metaY, {
    font: 'Helvetica-Bold',
    size: 9,
    color: [0.1, 0.15, 0.25],
  });
  metaY -= 12;
  doc.drawText(`Bill Date: ${formatDate(snapshot.bill.bill_date)}`, billMetaX, metaY, {
    font: 'Helvetica',
    size: 8,
    color: [0.35, 0.4, 0.45],
  });
  metaY -= 11;
  doc.drawText(`Financial Year: ${snapshot.bill.financial_year}`, billMetaX, metaY, {
    font: 'Helvetica',
    size: 8,
    color: [0.35, 0.4, 0.45],
  });

  y = boxTop - boxHeight - 16;

  // 3. Line Items Table
  const tableColumns: TableColumn[] = [
    { header: '#', width: 26, align: 'center' },
    { header: 'Product / Item (वस्तूचे नाव)', width: 230, align: 'left' },
    { header: 'Unit', width: 55, align: 'center' },
    { header: 'Qty', width: 55, align: 'right' },
    { header: 'Rate (₹)', width: 75, align: 'right' },
    { header: 'Total (₹)', width: 82, align: 'right' },
  ];

  const tableRows = snapshot.items.map((item, idx) => [
    idx + 1,
    item.product_name,
    item.unit,
    item.quantity,
    formatPaise(item.unit_price_paise).replace('₹', ''),
    formatPaise(item.total_paise).replace('₹', ''),
  ]);

  y = doc.renderTable(tableColumns, tableRows, y, {
    rowHeight: 18,
    zebra: true,
  });

  y -= 8;

  // 4. Totals & Outstanding Section
  const totalsBoxX = rightX - 220;

  const renderTotalLine = (
    label: string,
    valueStr: string,
    isBold = false,
    color: [number, number, number] = [0.1, 0.15, 0.2],
  ) => {
    doc.drawText(label, totalsBoxX, y, {
      font: isBold ? 'Helvetica-Bold' : 'Helvetica',
      size: 9,
      color: [0.35, 0.4, 0.45],
    });
    doc.drawText(valueStr, rightX - 6, y, {
      font: isBold ? 'Helvetica-Bold' : 'Helvetica',
      size: 9,
      align: 'right',
      color,
    });
    y -= 13;
  };

  renderTotalLine('Subtotal (एकूण):', formatPaise(snapshot.totals.subtotal_paise));

  if (snapshot.totals.discount_paise > 0) {
    renderTotalLine(
      'Discount (सूट):',
      `- ${formatPaise(snapshot.totals.discount_paise)}`,
      false,
      [0.1, 0.5, 0.2],
    );
  }

  doc.drawLine(totalsBoxX, y + 4, rightX, y + 4, {
    lineWidth: 0.5,
    color: [0.8, 0.8, 0.8],
  });
  renderTotalLine(
    'Bill Total (बिल रक्कम):',
    formatPaise(snapshot.totals.total_amount_paise),
    true,
    [0.1, 0.15, 0.3],
  );

  renderTotalLine(
    'Paid Now (रोख जमा):',
    formatPaise(snapshot.totals.paid_now_paise),
    false,
    [0.1, 0.55, 0.25],
  );

  renderTotalLine(
    'Current Balance (या बिलाची शिल्लक):',
    formatPaise(snapshot.totals.balance_due_paise),
  );

  doc.drawLine(totalsBoxX, y + 4, rightX, y + 4, {
    lineWidth: 1,
    color: [0.2, 0.25, 0.35],
  });

  renderTotalLine(
    'Previous Balance (मागील बाकी):',
    formatPaise(snapshot.totals.previous_outstanding_paise),
  );

  renderTotalLine(
    'Total Payable (एकूण येणे बाकी):',
    formatPaise(snapshot.totals.total_outstanding_paise),
    true,
    [0.8, 0.15, 0.15],
  );

  // Left-side box: Material Finish Alert & Payment Instructions
  const leftBoxWidth = totalsBoxX - leftX - 16;
  let infoY = y + 70;

  if (snapshot.material_alert?.expected_finish_date) {
    doc.drawRect(leftX, infoY - 26, leftBoxWidth, 26, {
      fillColor: [0.99, 0.96, 0.9],
      strokeColor: [0.9, 0.78, 0.5],
      lineWidth: 0.5,
    });
    doc.drawText(
      'FEED CONSUMPTION FORECAST (चारा संपण्याचा अंदाज):',
      leftX + 6,
      infoY - 9,
      { font: 'Helvetica-Bold', size: 7.5, color: [0.65, 0.4, 0.05] },
    );
    doc.drawText(
      `Estimated Finish Date: ${formatDate(snapshot.material_alert.expected_finish_date)} (${snapshot.material_alert.estimated_duration_days || 0} days feed)`,
      leftX + 6,
      infoY - 20,
      { font: 'Helvetica', size: 8, color: [0.35, 0.25, 0.1] },
    );
    infoY -= 32;
  }

  // Bank & UPI Section
  if (snapshot.firm.upi_id || snapshot.firm.bank_account_no) {
    doc.drawRect(leftX, infoY - 34, leftBoxWidth, 34, {
      fillColor: [0.96, 0.98, 1],
      strokeColor: [0.8, 0.88, 0.95],
      lineWidth: 0.5,
    });
    doc.drawText('PAYMENT DETAILS (पैसे भरण्यासाठी):', leftX + 6, infoY - 9, {
      font: 'Helvetica-Bold',
      size: 7.5,
      color: [0.15, 0.3, 0.55],
    });
    if (snapshot.firm.upi_id) {
      doc.drawText(`UPI ID: ${snapshot.firm.upi_id}`, leftX + 6, infoY - 19, {
        font: 'Helvetica-Bold',
        size: 8,
        color: [0.1, 0.2, 0.4],
      });
    }
    if (snapshot.firm.bank_account_no) {
      const bankLine = `${snapshot.firm.bank_name || 'Bank'}: A/C ${snapshot.firm.bank_account_no} | IFSC: ${snapshot.firm.bank_ifsc || ''}`;
      doc.drawText(bankLine, leftX + 6, infoY - 28, {
        font: 'Helvetica',
        size: 7.5,
        color: [0.25, 0.35, 0.45],
      });
    }
  }

  // Footer notice
  doc.finalizePageFooters(
    snapshot.notice ||
      'This is a computer generated commercial bill, not a tax invoice. / हे संगणकीकृत व्यापारी बिल आहे.',
  );

  const bytes = doc.buildBytes();
  const checksum = await computeSha256(bytes);

  return { bytes, checksum };
}

/**
 * Builds formatted text message for reviewed manual WhatsApp handoff.
 */
export function buildBillWhatsAppText(snapshot: BillDocumentSnapshot): string {
  const isRevised = snapshot.bill.is_revised || snapshot.bill.revision_number > 1;
  const header = isRevised
    ? `*${snapshot.firm.name} — सुधारित व्यापारी बिल (REVISED)*`
    : `*${snapshot.firm.name} — व्यापारी बिल*`;

  const itemsList = snapshot.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.product_name} - ${item.quantity} ${item.unit} x ${formatPaise(item.unit_price_paise)} = ${formatPaise(item.total_paise)}`,
    )
    .join('\n');

  const lines = [
    header,
    `बिल नं: ${snapshot.bill.bill_number}`,
    `तारीख: ${formatDate(snapshot.bill.bill_date)}`,
    `ग्राहक: ${snapshot.customer.name}`,
    `--------------------------`,
    itemsList,
    `--------------------------`,
    `एकूण रक्कम: ${formatPaise(snapshot.totals.total_amount_paise)}`,
    `रोख जमा: ${formatPaise(snapshot.totals.paid_now_paise)}`,
    `या बिलाची शिल्लक: ${formatPaise(snapshot.totals.balance_due_paise)}`,
    `मागील बाकी: ${formatPaise(snapshot.totals.previous_outstanding_paise)}`,
    `*एकूण येणे बाकी: ${formatPaise(snapshot.totals.total_outstanding_paise)}*`,
  ];

  if (snapshot.material_alert?.expected_finish_date) {
    lines.push(
      `--------------------------`,
      `चारा संपण्याचा अंदाज: ${formatDate(snapshot.material_alert.expected_finish_date)}`,
    );
  }

  if (snapshot.firm.upi_id) {
    lines.push(`\nGoogle Pay / PhonePe (UPI): ${snapshot.firm.upi_id}`);
  }

  lines.push(`\nधन्यवाद! 🙏`);

  return lines.join('\n');
}
