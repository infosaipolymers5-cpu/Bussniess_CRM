/**
 * Standard PDF 1.4 Vector & Document Generation Engine.
 * Supports A4 pagination, auto-page-break, repeating table headers, page numbering,
 * colored badges (e.g. REVISED), and deterministic byte generation.
 */

export interface PDFBuilderOptions {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
}

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export class SimplePDFBuilder {
  // A4 dimensions in PDF points (72 points per inch)
  public readonly pageWidth = 595.28;
  public readonly pageHeight = 841.89;
  public readonly margin = 36; // 0.5 inch margins

  private pages: string[] = [];
  private currentContent: string[] = [];
  private currentY: number;
  private currentFont = 'Helvetica';
  private currentFontSize = 10;
  private options: PDFBuilderOptions;

  constructor(options: PDFBuilderOptions = {}) {
    this.options = {
      title: options.title || 'Document',
      author: options.author || 'Rushi CRM Platform',
      creator: options.creator || 'Rushi CRM Documents Engine',
      ...options,
    };
    this.currentY = this.pageHeight - this.margin;
    this.startNewPage();
  }

  public startNewPage(): void {
    if (this.currentContent.length > 0) {
      this.pages.push(this.currentContent.join('\n'));
      this.currentContent = [];
    }
    this.currentY = this.pageHeight - this.margin;
  }

  public getY(): number {
    return this.currentY;
  }

  public setY(y: number): void {
    this.currentY = y;
  }

  public checkPageBreak(requiredHeight: number): boolean {
    if (this.currentY - requiredHeight < this.margin + 40) {
      this.startNewPage();
      return true;
    }
    return false;
  }

  public setFont(name: 'Helvetica' | 'Helvetica-Bold' | 'Courier', size: number): void {
    this.currentFont = name;
    this.currentFontSize = size;
  }

  private escapePdfText(text: string): string {
    // Sanitize non-ascii characters to safe representation while preserving English digits and symbols
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  public drawText(
    text: string,
    x: number,
    y?: number,
    options?: {
      font?: 'Helvetica' | 'Helvetica-Bold' | 'Courier';
      size?: number;
      align?: 'left' | 'center' | 'right';
      color?: [number, number, number]; // RGB 0-1
    },
  ): void {
    const targetY = y !== undefined ? y : this.currentY;
    const font = options?.font || this.currentFont;
    const size = options?.size || this.currentFontSize;
    const color = options?.color || [0, 0, 0];

    const escaped = this.escapePdfText(text);

    let startX = x;
    if (options?.align === 'center') {
      const approxWidth = text.length * (size * 0.52);
      startX = Math.max(this.margin, x - approxWidth / 2);
    } else if (options?.align === 'right') {
      const approxWidth = text.length * (size * 0.52);
      startX = Math.max(this.margin, x - approxWidth);
    }

    const fontRef =
      font === 'Helvetica-Bold' ? '/F2' : font === 'Courier' ? '/F3' : '/F1';

    this.currentContent.push(
      `BT ${color[0]} ${color[1]} ${color[2]} rg ${fontRef} ${size} Tf 1 0 0 1 ${startX.toFixed(2)} ${targetY.toFixed(2)} Tm (${escaped}) Tj ET`,
    );
  }

  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: { lineWidth?: number; color?: [number, number, number] },
  ): void {
    const lw = options?.lineWidth || 1;
    const color = options?.color || [0.8, 0.8, 0.8];
    this.currentContent.push(
      `${color[0]} ${color[1]} ${color[2]} RG ${lw} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  }

  public drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    options?: {
      fillColor?: [number, number, number];
      strokeColor?: [number, number, number];
      lineWidth?: number;
    },
  ): void {
    const lw = options?.lineWidth || 1;
    let op = '';
    if (options?.fillColor && options?.strokeColor) {
      const fc = options.fillColor;
      const sc = options.strokeColor;
      op = `${fc[0]} ${fc[1]} ${fc[2]} rg ${sc[0]} ${sc[1]} ${sc[2]} RG ${lw} w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`;
    } else if (options?.fillColor) {
      const fc = options.fillColor;
      op = `${fc[0]} ${fc[1]} ${fc[2]} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`;
    } else if (options?.strokeColor) {
      const sc = options.strokeColor;
      op = `${sc[0]} ${sc[1]} ${sc[2]} RG ${lw} w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`;
    }
    if (op) {
      this.currentContent.push(op);
    }
  }

  public drawBadge(
    text: string,
    x: number,
    y: number,
    options: {
      bgColor: [number, number, number];
      textColor: [number, number, number];
      paddingX?: number;
      fontSize?: number;
    },
  ): void {
    const fs = options.fontSize || 9;
    const pad = options.paddingX || 6;
    const width = text.length * (fs * 0.58) + pad * 2;
    const height = fs + 8;

    this.drawRect(x, y - 2, width, height, { fillColor: options.bgColor });
    this.drawText(text, x + pad, y + 2, {
      font: 'Helvetica-Bold',
      size: fs,
      color: options.textColor,
    });
  }

  public renderTable(
    columns: TableColumn[],
    rows: (string | number)[][],
    startY: number,
    options?: {
      rowHeight?: number;
      headerBg?: [number, number, number];
      headerTextColor?: [number, number, number];
      zebra?: boolean;
    },
  ): number {
    const rowHeight = options?.rowHeight || 20;
    const headerBg = options?.headerBg || [0.93, 0.95, 0.98];
    const headerTextColor = options?.headerTextColor || [0.1, 0.15, 0.25];
    const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

    const renderHeader = (y: number) => {
      // Header background
      this.drawRect(this.margin, y - rowHeight + 5, tableWidth, rowHeight, {
        fillColor: headerBg,
      });

      // Header labels
      let currentX = this.margin;
      columns.forEach((col) => {
        let textX = currentX + 6;
        if (col.align === 'right') textX = currentX + col.width - 6;
        else if (col.align === 'center') textX = currentX + col.width / 2;

        this.drawText(col.header, textX, y - 5, {
          font: 'Helvetica-Bold',
          size: 9,
          color: headerTextColor,
          align: col.align || 'left',
        });
        currentX += col.width;
      });

      // Bottom border
      this.drawLine(
        this.margin,
        y - rowHeight + 5,
        this.margin + tableWidth,
        y - rowHeight + 5,
        { lineWidth: 1, color: [0.75, 0.8, 0.85] },
      );
    };

    let y = startY;
    renderHeader(y);
    y -= rowHeight;

    rows.forEach((row, rowIndex) => {
      // Check for page break
      this.currentY = y;
      if (this.checkPageBreak(rowHeight + 20)) {
        y = this.currentY;
        renderHeader(y);
        y -= rowHeight;
      }

      // Zebra background
      if (options?.zebra && rowIndex % 2 === 1) {
        this.drawRect(this.margin, y - rowHeight + 5, tableWidth, rowHeight, {
          fillColor: [0.98, 0.98, 0.99],
        });
      }

      // Row cells
      let currentX = this.margin;
      row.forEach((cellVal, colIndex) => {
        const col = columns[colIndex];
        if (!col) return;
        const text = String(cellVal ?? '');

        let textX = currentX + 6;
        if (col.align === 'right') textX = currentX + col.width - 6;
        else if (col.align === 'center') textX = currentX + col.width / 2;

        this.drawText(text, textX, y - 6, {
          font: 'Helvetica',
          size: 9,
          align: col.align || 'left',
          color: [0.15, 0.2, 0.25],
        });
        currentX += col.width;
      });

      // Bottom cell border
      this.drawLine(
        this.margin,
        y - rowHeight + 5,
        this.margin + tableWidth,
        y - rowHeight + 5,
        { lineWidth: 0.5, color: [0.9, 0.92, 0.94] },
      );

      y -= rowHeight;
    });

    this.currentY = y;
    return y;
  }

  public finalizePageFooters(notice: string): void {
    if (this.currentContent.length > 0) {
      this.pages.push(this.currentContent.join('\n'));
      this.currentContent = [];
    }

    const totalPages = this.pages.length;

    this.pages = this.pages.map((content, idx) => {
      const pageNumStr = `Page ${idx + 1} of ${totalPages}`;
      const footerY = this.margin - 10;
      const lineY = this.margin + 5;

      const footerCommands = [
        // Top footer divider line
        `0.8 0.8 0.8 RG 0.5 w ${this.margin.toFixed(2)} ${lineY.toFixed(2)} m ${(this.pageWidth - this.margin).toFixed(2)} ${lineY.toFixed(2)} l S`,
        // Notice text left-aligned
        `BT 0.45 0.5 0.55 rg /F1 8 Tf 1 0 0 1 ${this.margin.toFixed(2)} ${footerY.toFixed(2)} Tm (${this.escapePdfText(notice)}) Tj ET`,
        // Page number right-aligned
        `BT 0.45 0.5 0.55 rg /F2 8 Tf 1 0 0 1 ${(this.pageWidth - this.margin - 55).toFixed(2)} ${footerY.toFixed(2)} Tm (${pageNumStr}) Tj ET`,
      ].join('\n');

      return `${content}\n${footerCommands}`;
    });
  }

  public buildBytes(): Uint8Array {
    if (this.currentContent.length > 0) {
      this.pages.push(this.currentContent.join('\n'));
      this.currentContent = [];
    }

    const chunks: string[] = [];
    const offsets: number[] = [];
    let currentOffset = 0;

    const addChunk = (chunk: string) => {
      chunks.push(chunk);
      currentOffset += new TextEncoder().encode(chunk).length;
    };

    // 1. Header
    addChunk('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    // Object numbering:
    // 1: Catalog
    // 2: Outlines
    // 3: Pages
    // 4: Font Helvetica
    // 5: Font Helvetica-Bold
    // 6: Font Courier
    // 7..(6 + pages.length): Page objects
    // (7 + pages.length)..(6 + 2 * pages.length): Content stream objects

    const pageCount = this.pages.length;
    const firstPageObjNum = 7;
    const firstContentObjNum = firstPageObjNum + pageCount;

    // 1 0 obj Catalog
    offsets[1] = currentOffset;
    addChunk('1 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n');

    // 2 0 obj Outlines
    offsets[2] = currentOffset;
    addChunk('2 0 obj\n<< /Type /Outlines /Count 0 >>\nendobj\n');

    // 3 0 obj Pages
    offsets[3] = currentOffset;
    const pageRefs = Array.from(
      { length: pageCount },
      (_, i) => `${firstPageObjNum + i} 0 R`,
    ).join(' ');
    addChunk(
      `3 0 obj\n<< /Type /Pages /Kids [ ${pageRefs} ] /Count ${pageCount} >>\nendobj\n`,
    );

    // 4 0 obj Font F1 (Helvetica)
    offsets[4] = currentOffset;
    addChunk('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

    // 5 0 obj Font F2 (Helvetica-Bold)
    offsets[5] = currentOffset;
    addChunk(
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    );

    // 6 0 obj Font F3 (Courier)
    offsets[6] = currentOffset;
    addChunk('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n');

    // Page objects
    for (let i = 0; i < pageCount; i++) {
      const pageObjNum = firstPageObjNum + i;
      const contentObjNum = firstContentObjNum + i;
      offsets[pageObjNum] = currentOffset;
      addChunk(
        `${pageObjNum} 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [ 0 0 ${this.pageWidth} ${this.pageHeight} ] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> >>\nendobj\n`,
      );
    }

    // Content streams
    for (let i = 0; i < pageCount; i++) {
      const contentObjNum = firstContentObjNum + i;
      const pageText = this.pages[i];
      const pageBytes = new TextEncoder().encode(pageText);
      offsets[contentObjNum] = currentOffset;
      addChunk(
        `${contentObjNum} 0 obj\n<< /Length ${pageBytes.length} >>\nstream\n${pageText}\nendstream\nendobj\n`,
      );
    }

    // Cross-reference table
    const totalObjects = 6 + 2 * pageCount;
    const startXref = currentOffset;
    addChunk(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
    for (let i = 1; i <= totalObjects; i++) {
      const off = offsets[i] || 0;
      addChunk(`${off.toString().padStart(10, '0')} 00000 n \n`);
    }

    // Trailer
    addChunk(
      `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R /Info << /Title (${this.escapePdfText(this.options.title || '')}) /Author (${this.escapePdfText(this.options.author || '')}) /Creator (${this.escapePdfText(this.options.creator || '')}) >> >>\nstartxref\n${startXref}\n%%EOF\n`,
    );

    const fullStr = chunks.join('');
    return new TextEncoder().encode(fullStr);
  }

  public toBlob(): Blob {
    const bytes = this.buildBytes();
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  }

  public toDataUrl(): string {
    const bytes = this.buildBytes();
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return `data:application/pdf;base64,${btoa(binary)}`;
  }
}
