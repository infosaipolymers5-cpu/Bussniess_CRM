/**
 * Purchase Order & Gate Pass Document Generator.
 * Implements Feature 31:
 * - Supplier order document with customer-linked lines
 * - Rate visibility switch (Full PO vs Delivery Gate Pass)
 * - Selling-rate disclosure warning before share
 * - Delivery date and authorized signature section
 */

import { SimplePDFBuilder, type TableColumn } from './pdfBuilder';
import { computeSha256 } from './checksum';
import type { PurchaseOrderDocumentSnapshot } from './types';
import { formatPaise } from '@/lib/money';
import { formatDate } from '@/lib/dates';

export async function generatePurchaseOrderPdf(
  snapshot: PurchaseOrderDocumentSnapshot,
): Promise<{ bytes: Uint8Array; checksum: string }> {
  const isGatePass = snapshot.po.is_gate_pass || !snapshot.po.show_rates;

  const docTitle = isGatePass
    ? `Gate Pass / Delivery Challan - ${snapshot.po.order_number}`
    : `Purchase Order - ${snapshot.po.order_number}`;

  const doc = new SimplePDFBuilder({
    title: docTitle,
    author: snapshot.firm.name,
    subject: `Purchase Order ${snapshot.po.order_number} for ${snapshot.supplier.name}`,
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

  // Right-aligned Mode Badge
  if (isGatePass) {
    doc.drawBadge('GATE PASS / CHALLAN (RATES HIDDEN)', rightX - 180, y - 2, {
      bgColor: [0.93, 0.95, 0.98],
      textColor: [0.15, 0.25, 0.45],
      fontSize: 9,
    });
  } else {
    doc.drawBadge('PURCHASE ORDER (WITH RATES)', rightX - 160, y - 2, {
      bgColor: [0.9, 0.96, 0.9],
      textColor: [0.1, 0.5, 0.2],
      fontSize: 9,
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

  doc.drawText(
    isGatePass
      ? 'DELIVERY CHALLAN / GATE PASS (वस्तू वाहतूक पावती)'
      : 'PURCHASE ORDER (खरेदी आदेश)',
    leftX,
    y,
    { font: 'Helvetica-Bold', size: 12, color: [0.12, 0.2, 0.38] },
  );

  y -= 14;

  // 2. Supplier & Order Info Box
  const boxTop = y;
  const boxHeight = 56;
  doc.drawRect(leftX, boxTop - boxHeight, rightX - leftX, boxHeight, {
    fillColor: [0.97, 0.98, 0.99],
    strokeColor: [0.85, 0.88, 0.92],
    lineWidth: 0.5,
  });

  // Supplier info left
  const suppX = leftX + 10;
  let suppY = boxTop - 13;
  doc.drawText('ORDER ISSUED TO (पुरवठादार):', suppX, suppY, {
    font: 'Helvetica-Bold',
    size: 8,
    color: [0.45, 0.5, 0.55],
  });
  suppY -= 12;
  doc.drawText(snapshot.supplier.name, suppX, suppY, {
    font: 'Helvetica-Bold',
    size: 11,
    color: [0.1, 0.15, 0.25],
  });
  suppY -= 11;
  const suppSub = [
    snapshot.supplier.phone ? `Ph: ${snapshot.supplier.phone}` : null,
    snapshot.supplier.address,
    snapshot.supplier.gstin ? `GSTIN: ${snapshot.supplier.gstin}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
  doc.drawText(suppSub, suppX, suppY, {
    font: 'Helvetica',
    size: 8,
    color: [0.35, 0.4, 0.45],
  });

  // Order metadata right
  const poMetaX = rightX - 170;
  let metaY = boxTop - 13;
  doc.drawText(`PO Number: ${snapshot.po.order_number}`, poMetaX, metaY, {
    font: 'Helvetica-Bold',
    size: 9,
    color: [0.1, 0.15, 0.25],
  });
  metaY -= 12;
  doc.drawText(`Order Date: ${formatDate(snapshot.po.order_date)}`, poMetaX, metaY, {
    font: 'Helvetica',
    size: 8,
    color: [0.35, 0.4, 0.45],
  });
  metaY -= 11;
  doc.drawText(
    `Expected Delivery: ${snapshot.po.expected_delivery_date ? formatDate(snapshot.po.expected_delivery_date) : 'Immediate'}`,
    poMetaX,
    metaY,
    {
      font: 'Helvetica-Bold',
      size: 8,
      color: [0.15, 0.45, 0.25],
    },
  );

  y = boxTop - boxHeight - 16;

  // 3. Line Items Table (with optional rate columns)
  let tableColumns: TableColumn[];
  let tableRows: (string | number)[][];

  if (isGatePass) {
    // Gate pass mode: NO rates or monetary totals
    tableColumns = [
      { header: '#', width: 28, align: 'center' },
      { header: 'Product / Item (वस्तूचे नाव)', width: 260, align: 'left' },
      { header: 'Unit', width: 65, align: 'center' },
      { header: 'Quantity', width: 75, align: 'right' },
      {
        header: 'Customer Ref / Route',
        width: 95,
        align: 'left',
      },
    ];

    tableRows = snapshot.items.map((item, idx) => [
      idx + 1,
      item.product_name,
      item.unit,
      item.quantity,
      item.customer_reference || '-',
    ]);
  } else {
    // Full PO mode: includes purchase rates and totals
    tableColumns = [
      { header: '#', width: 26, align: 'center' },
      { header: 'Product / Item (वस्तूचे नाव)', width: 200, align: 'left' },
      { header: 'Unit', width: 50, align: 'center' },
      { header: 'Quantity', width: 55, align: 'right' },
      { header: 'Purchase Rate (₹)', width: 95, align: 'right' },
      { header: 'Total Cost (₹)', width: 97, align: 'right' },
    ];

    tableRows = snapshot.items.map((item, idx) => [
      idx + 1,
      item.product_name,
      item.unit,
      item.quantity,
      item.unit_price_paise !== undefined
        ? formatPaise(item.unit_price_paise).replace('₹', '')
        : '-',
      item.total_paise !== undefined
        ? formatPaise(item.total_paise).replace('₹', '')
        : '-',
    ]);
  }

  y = doc.renderTable(tableColumns, tableRows, y, {
    rowHeight: 18,
    zebra: true,
  });

  y -= 10;

  // 4. Totals (if not gate pass)
  if (
    !isGatePass &&
    snapshot.total_amount_paise !== null &&
    snapshot.total_amount_paise !== undefined
  ) {
    const totalsBoxX = rightX - 220;
    doc.drawText('Total Order Value (एकूण खरेदी रक्कम):', totalsBoxX, y, {
      font: 'Helvetica-Bold',
      size: 9,
      color: [0.35, 0.4, 0.45],
    });
    doc.drawText(formatPaise(snapshot.total_amount_paise), rightX - 6, y, {
      font: 'Helvetica-Bold',
      size: 11,
      align: 'right',
      color: [0.1, 0.15, 0.35],
    });
    y -= 22;
  }

  // 5. Notes & Signatures Section
  doc.checkPageBreak(100);
  y = doc.getY();

  // Notes left
  if (snapshot.notes) {
    doc.drawText('Notes / Instructions:', leftX, y, {
      font: 'Helvetica-Bold',
      size: 8,
      color: [0.4, 0.45, 0.5],
    });
    y -= 11;
    doc.drawText(snapshot.notes, leftX, y, {
      font: 'Helvetica',
      size: 8,
      color: [0.2, 0.25, 0.3],
    });
    y -= 20;
  }

  // Signature Blocks
  const sigY = y - 40;
  // Supplier receiver stamp
  doc.drawLine(leftX + 20, sigY, leftX + 170, sigY, {
    lineWidth: 0.5,
    color: [0.7, 0.75, 0.8],
  });
  doc.drawText('Supplier / Transporter Signature', leftX + 25, sigY - 12, {
    font: 'Helvetica',
    size: 8,
    color: [0.45, 0.5, 0.55],
  });

  // Authorised Signatory right
  doc.drawLine(rightX - 170, sigY, rightX - 20, sigY, {
    lineWidth: 0.5,
    color: [0.7, 0.75, 0.8],
  });
  doc.drawText(
    `For ${snapshot.firm.name} (Authorised Signatory)`,
    rightX - 165,
    sigY - 12,
    { font: 'Helvetica-Bold', size: 8, color: [0.15, 0.2, 0.3] },
  );

  // Footer notice
  doc.finalizePageFooters(
    snapshot.notice ||
      'This is an official purchase order / delivery gate pass issued by Rushi CRM.',
  );

  const bytes = doc.buildBytes();
  const checksum = await computeSha256(bytes);

  return { bytes, checksum };
}

/**
 * Validates whether a PO is safe to share with external suppliers without leaking customer selling prices.
 */
export function checkPoRateDisclosureSafety(snapshot: PurchaseOrderDocumentSnapshot): {
  isSafe: boolean;
  warningMessage: string | null;
} {
  if (snapshot.po.is_gate_pass || !snapshot.po.show_rates) {
    return { isSafe: true, warningMessage: null };
  }

  return {
    isSafe: false,
    warningMessage:
      'Selling Rate Disclosure Warning: This Purchase Order document includes financial rates. Confirm that you are sharing this with trusted suppliers/internal staff only. Customer retail selling prices and margins must never be disclosed to suppliers.',
  };
}
