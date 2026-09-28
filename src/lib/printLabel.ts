export const DEFAULT_LABEL_WIDTH_MM = 60
export const DEFAULT_LABEL_HEIGHT_MM = 40

export interface LabelPrintSize {
  widthMm?: number
  heightMm?: number
}

function buildPrintCss(
  areaId: string,
  widthMm: number,
  heightMm: number
): string {
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
    width: ${widthMm}mm;
    margin: 0;
    padding: 0;
  }

  #${areaId} .label-sheet {
    width: ${widthMm}mm;
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

/**
 * Injects the label print stylesheet and triggers the browser print dialog.
 * `areaId` must wrap one or more `.label-sheet` elements (each containing a
 * `LabelPrintCard`). The area is hidden on screen and revealed only for print.
 * Supports a single label or many (one sheet per page).
 */
export function runLabelPrint(areaId: string, size: LabelPrintSize = {}): void {
  const widthMm = size.widthMm ?? DEFAULT_LABEL_WIDTH_MM
  const heightMm = size.heightMm ?? DEFAULT_LABEL_HEIGHT_MM

  const cleanup = () => {
    document.getElementById('label-print-css')?.remove()
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)

  const style = document.createElement('style')
  style.id = 'label-print-css'
  style.textContent = buildPrintCss(areaId, widthMm, heightMm)
  document.head.appendChild(style)

  window.print()
}
