export const LABEL_WIDTH_MM = 60
export const LABEL_HEIGHT_MM = 40

function buildPrintCss(areaId: string): string {
  return `
  @page {
    size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm;
    margin: 0;
  }

  html,
  body {
    width: ${LABEL_WIDTH_MM}mm;
    height: ${LABEL_HEIGHT_MM}mm;
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
    width: ${LABEL_WIDTH_MM}mm;
    height: ${LABEL_HEIGHT_MM}mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  #${areaId} > div {
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
 * Injects the 60×40mm label print stylesheet and triggers the browser print
 * dialog. `areaId` must be the id of the element wrapping a `LabelPrintCard`
 * (the area is hidden on screen and revealed only for printing).
 */
export function runLabelPrint(areaId: string): void {
  const cleanup = () => {
    document.getElementById('label-print-css')?.remove()
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)

  const style = document.createElement('style')
  style.id = 'label-print-css'
  style.textContent = buildPrintCss(areaId)
  document.head.appendChild(style)

  window.print()
}
