export const DEFAULT_LABEL_WIDTH_MM = 60
export const DEFAULT_LABEL_HEIGHT_MM = 40
export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297

export interface LabelPrintSize {
  widthMm?: number
  heightMm?: number
}

export interface DocumentPrintSize {
  widthMm?: number
  heightMm?: number
}

type PrintVariant = 'label' | 'invoice'

interface PrintOptions {
  widthMm: number
  heightMm: number
  variant: PrintVariant
}

function buildLabelCss(areaId: string, widthMm: number, heightMm: number): string {
  return `
  @page {
    size: ${widthMm}mm ${heightMm}mm;
    margin: 0;
  }

  html,
  body {
    width: ${widthMm}mm;
    margin: 0;
    padding: 0;
    background: #ffffff !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  #${areaId} {
    width: ${widthMm}mm;
  }

  #${areaId} .label-sheet {
    width: ${widthMm}mm;
    min-height: ${heightMm}mm;
    height: ${heightMm}mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }

  #${areaId} .label-sheet:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  #${areaId} .label-sheet > div {
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 3mm !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #ffffff !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #000000 !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  #${areaId} h2 {
    font-size: 15px;
    line-height: 1.2;
    margin: 0;
    color: #000000 !important;
  }

  #${areaId} p,
  #${areaId} span {
    font-size: 10px;
    line-height: 1.3;
    color: #000000 !important;
  }

  #${areaId} .mt-8 {
    margin-top: 2mm;
  }
  `
}

function buildInvoiceCss(areaId: string): string {
  return `
  @page {
    size: A4;
    margin: 12mm;
  }

  html,
  body {
    width: auto;
    margin: 0;
    padding: 0;
    background: #ffffff !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  #${areaId} {
    width: auto;
    right: 0;
  }

  #${areaId} .invoice-sheet {
    width: auto;
    min-height: 0;
    margin: 0;
    padding: 0;
    page-break-after: always;
    break-after: page;
  }

  #${areaId} .invoice-sheet:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  #${areaId} .invoice-sheet > div {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #ffffff !important;
    color: #000000 !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  #${areaId} * {
    color: #000000 !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  #${areaId} table {
    width: 100%;
    border-collapse: collapse;
  }

  #${areaId} thead {
    display: table-header-group;
  }

  #${areaId} tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  #${areaId} th,
  #${areaId} td {
    border-bottom: 1px solid #c7c7c7 !important;
  }
  `
}

function buildPrintCss({ widthMm, heightMm, variant }: PrintOptions, areaId: string): string {
  const variantCss =
    variant === 'invoice' ? buildInvoiceCss(areaId) : buildLabelCss(areaId, widthMm, heightMm)

  return `
  body * {
    visibility: hidden;
  }

  #${areaId},
  #${areaId} * {
    visibility: visible;
  }

  #${areaId} {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    margin: 0;
    padding: 0;
  }
  ${variantCss}
  `
}

function runPrint(areaId: string, options: PrintOptions): void {
  const cleanup = () => {
    document.getElementById('document-print-css')?.remove()
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)

  const style = document.createElement('style')
  style.id = 'document-print-css'
  style.textContent = buildPrintCss(options, areaId)
  document.head.appendChild(style)

  window.print()
}

/**
 * Injects the label print stylesheet and triggers the browser print dialog.
 * `areaId` must wrap one or more `.label-sheet` elements (each containing a
 * `LabelPrintCard`). The area is hidden on screen and revealed only for print.
 * Supports a single label or many (one sheet per page).
 */
export function runLabelPrint(areaId: string, size: LabelPrintSize = {}): void {
  runPrint(areaId, {
    widthMm: size.widthMm ?? DEFAULT_LABEL_WIDTH_MM,
    heightMm: size.heightMm ?? DEFAULT_LABEL_HEIGHT_MM,
    variant: 'label',
  })
}

/**
 * Prints one A4 page per invoice. `areaId` must wrap one or more
 * `.invoice-sheet` elements (each containing an `InvoicePrintCard`).
 */
export function runInvoicePrint(areaId: string, size: DocumentPrintSize = {}): void {
  runPrint(areaId, {
    widthMm: size.widthMm ?? A4_WIDTH_MM,
    heightMm: size.heightMm ?? A4_HEIGHT_MM,
    variant: 'invoice',
  })
}
