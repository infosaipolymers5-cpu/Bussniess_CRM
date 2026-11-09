/**
 * Khate Utara (Customer Account Statement) Document Generator.
 * Implements Feature 27 & 41:
 * - Direct ledger-derived statement
 * - Bilingual English/Marathi templates
 * - English digits for Marathi numeric rendering
 * - Running balance column and opening/closing reconciliation
 * - Multi-page A4 with repeating headers and page numbering
 */

import { SimplePDFBuilder, type TableColumn } from './pdfBuilder';
import { computeSha256 } from './checksum';
import type { KhateUtaraDocumentSnapshot } from './types';
import { formatPaise } from '@/lib/money';
import { formatDate } from '@/lib/dates';

export async function generateStatementPdf(
  snapshot: KhateUtaraDocumentSnapshot,
): Promise<{ bytes: Uint8Array; checksum: string }> {
  const isMr = snapshot.language === 'mr';

  const docTitle = isMr
    ? `खाते उतारा - ${snapshot.customer.name}`
    : `Account Statement - ${snapshot.customer.name}`;

  const doc = new SimplePDFBuilder({
    title: docTitle,
    author: snapshot.firm.name,
    subject: `Khate Utara Customer Ledger Statement for ${snapshot.customer.name}`,
  });

  const leftX = doc.margin;
  const rightX = doc.pageWidth - doc.margin;
  let y = doc.getY();

  // 1. Firm Header
  doc.setFont('Helvetica-Bold', 18);
  doc.drawText(snapshot.firm.name, leftX, y, {
    font: 'Helvetica-Bold',
    size: 18,
    color: [0.1, 0.18, 0.35],
  });

  y -= 14;
  if (snapshot.firm.tagline) {
    doc.drawText(snapshot.firm.tagline, leftX, y, {
      font: 'Helvetica',
      size: 9,
      color: [0.4, 0.45, 0.5],
    });
    y -= 12;
  }

  const contactLine = [
    snapshot.firm.address,
    snapshot.firm.phone ? `Ph: ${snapshot.firm.phone}` : null,
    snapshot.firm.gstin ? `GSTIN: ${snapshot.firm.gstin}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  if (contactLine) {
    doc.drawText(contactLine, leftX, y, {
      font: 'Helvetica',
      size: 8,
      color: [0.4, 0.45, 0.5],
    });
    y -= 14;
  }

  // Document Title Bar
  doc.drawLine(leftX, y, rightX, y, {
    lineWidth: 1.5,
    color: [0.15, 0.25, 0.45],
  });
  y -= 16;

  const headerTitle = isMr
    ? 'KHATE UTARA (खाते उतारा - लेजर विवरण)'
    : 'CUSTOMER ACCOUNT STATEMENT (KHATE UTARA)';

  doc.drawText(headerTitle, leftX, y, {
    font: 'Helvetica-Bold',
    size: 12,
    color: [0.12, 0.2, 0.38],
  });

  y -= 14;

  // 2. Customer & Period Details Box
  const boxTop = y;
  const boxHeight = 52;
  doc.drawRect(leftX, boxTop - boxHeight, rightX - leftX, boxHeight, {
    fillColor: [0.97, 0.98, 0.99],
    strokeColor: [0.85, 0.88, 0.92],
    lineWidth: 0.5,
  });

  // Customer info left
  const custX = leftX + 10;
  let custY = boxTop - 13;
  doc.drawText(isMr ? 'ग्राहक तपशील:' : 'CUSTOMER DETAILS:', custX, custY, {
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

  // Statement period info right
  const periodX = rightX - 180;
  let perY = boxTop - 13;
  doc.drawText(isMr ? 'कालावधी (Period):' : 'STATEMENT PERIOD:', periodX, perY, {
    font: 'Helvetica-Bold',
    size: 8,
    color: [0.45, 0.5, 0.55],
  });
  perY -= 12;
  doc.drawText(
    `${formatDate(snapshot.period.from_date)} to ${formatDate(snapshot.period.to_date)}`,
    periodX,
    perY,
    { font: 'Helvetica-Bold', size: 9, color: [0.1, 0.15, 0.25] },
  );
  perY -= 11;
  doc.drawText(
    `Report Date: ${formatDate(snapshot.period.generated_date)}`,
    periodX,
    perY,
    { font: 'Helvetica', size: 8, color: [0.35, 0.4, 0.45] },
  );

  y = boxTop - boxHeight - 16;

  // 3. Opening Balance Highlight Box
  doc.drawRect(leftX, y - 24, rightX - leftX, 24, {
    fillColor: [0.93, 0.95, 0.98],
    strokeColor: [0.8, 0.85, 0.92],
    lineWidth: 0.5,
  });

  const openLabel = isMr
    ? `आरंभीची शिल्लक (Opening Balance prior to ${formatDate(snapshot.period.from_date)}):`
    : `Opening Balance (Prior to ${formatDate(snapshot.period.from_date)}):`;

  doc.drawText(openLabel, leftX + 10, y - 15, {
    font: 'Helvetica-Bold',
    size: 9,
    color: [0.15, 0.25, 0.4],
  });

  doc.drawText(formatPaise(snapshot.opening_balance_paise), rightX - 10, y - 15, {
    font: 'Helvetica-Bold',
    size: 10,
    align: 'right',
    color: snapshot.opening_balance_paise > 0 ? [0.8, 0.15, 0.15] : [0.1, 0.5, 0.2],
  });

  y -= 34;

  // 4. Running Ledger Table
  const tableColumns: TableColumn[] = [
    { header: isMr ? 'तारीख (Date)' : 'Date', width: 68, align: 'left' },
    { header: isMr ? 'संदर्भ (Ref)' : 'Voucher No', width: 85, align: 'left' },
    {
      header: isMr ? 'तपशील (Particulars)' : 'Description / Notes',
      width: 175,
      align: 'left',
    },
    {
      header: isMr ? 'नावे / बिल (Debit ₹)' : 'Billed (Debit ₹)',
      width: 65,
      align: 'right',
    },
    {
      header: isMr ? 'जमा / रोख (Credit ₹)' : 'Paid (Credit ₹)',
      width: 65,
      align: 'right',
    },
    {
      header: isMr ? 'शिल्लक (Balance ₹)' : 'Balance (₹)',
      width: 65,
      align: 'right',
    },
  ];

  const tableRows = snapshot.entries.map((entry) => [
    formatDate(entry.date),
    entry.voucher_number || '-',
    entry.particulars,
    entry.debit_paise > 0 ? formatPaise(entry.debit_paise).replace('₹', '') : '-',
    entry.credit_paise > 0 ? formatPaise(entry.credit_paise).replace('₹', '') : '-',
    formatPaise(entry.running_balance_paise).replace('₹', ''),
  ]);

  y = doc.renderTable(tableColumns, tableRows, y, {
    rowHeight: 18,
    zebra: true,
  });

  y -= 10;

  // 5. Statement Totals & Closing Balance Reconciliation
  doc.checkPageBreak(90);
  y = doc.getY();

  const totalsBoxX = rightX - 250;

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
    y -= 14;
  };

  renderTotalLine(
    isMr ? 'एकूण नावे (Total Debits / Billed):' : 'Total Billed (Debits):',
    formatPaise(snapshot.total_debit_paise),
  );

  renderTotalLine(
    isMr ? 'एकूण जमा (Total Credits / Paid):' : 'Total Paid (Credits):',
    formatPaise(snapshot.total_credit_paise),
    false,
    [0.1, 0.55, 0.25],
  );

  doc.drawLine(totalsBoxX, y + 4, rightX, y + 4, {
    lineWidth: 1,
    color: [0.2, 0.25, 0.35],
  });

  renderTotalLine(
    isMr ? 'अखेरची शिल्लक (Closing Net Balance):' : 'Closing Net Balance Due:',
    formatPaise(snapshot.closing_balance_paise),
    true,
    snapshot.closing_balance_paise > 0 ? [0.85, 0.1, 0.1] : [0.1, 0.55, 0.25],
  );

  // Bank & UPI Section at bottom
  if (snapshot.firm.upi_id) {
    const infoY = y + 36;
    doc.drawRect(leftX, infoY - 22, 220, 22, {
      fillColor: [0.96, 0.98, 1],
      strokeColor: [0.8, 0.88, 0.95],
      lineWidth: 0.5,
    });
    doc.drawText(`Pay via UPI: ${snapshot.firm.upi_id}`, leftX + 8, infoY - 14, {
      font: 'Helvetica-Bold',
      size: 8,
      color: [0.1, 0.25, 0.5],
    });
  }

  // Footer notice
  doc.finalizePageFooters(
    snapshot.notice ||
      'This is a computer generated account statement derived from verified customer ledger. / संगणकीकृत लेजर खाते उतारा.',
  );

  const bytes = doc.buildBytes();
  const checksum = await computeSha256(bytes);

  return { bytes, checksum };
}

/**
 * Builds formatted text summary for reviewed manual WhatsApp statement sharing.
 */
export function buildStatementWhatsAppText(snapshot: KhateUtaraDocumentSnapshot): string {
  const isMr = snapshot.language === 'mr';
  const header = isMr
    ? `*${snapshot.firm.name} — खाते उतारा (लेजर सारांश)*`
    : `*${snapshot.firm.name} — Customer Account Statement*`;

  const lines = [
    header,
    `ग्राहक: ${snapshot.customer.name}`,
    `कालावधी: ${formatDate(snapshot.period.from_date)} ते ${formatDate(snapshot.period.to_date)}`,
    `--------------------------`,
    `आरंभीची शिल्लक: ${formatPaise(snapshot.opening_balance_paise)}`,
    `एकूण खरेदी (नावे): ${formatPaise(snapshot.total_debit_paise)}`,
    `एकूण जमा (भरणा): ${formatPaise(snapshot.total_credit_paise)}`,
    `--------------------------`,
    `*अखेरची शिल्लक (एकूण येणे): ${formatPaise(snapshot.closing_balance_paise)}*`,
  ];

  if (snapshot.firm.upi_id) {
    lines.push(`\nGoogle Pay / PhonePe (UPI): ${snapshot.firm.upi_id}`);
  }

  lines.push(`\nकोणतीही शंका असल्यास संपर्क करा. धन्यवाद! 🙏`);

  return lines.join('\n');
}
