import { afterEach, describe, expect, it, vi } from 'vitest'
import { runInvoicePrint, runLabelPrint } from '@/lib/printDocument'

function styleText(): string {
  return document.getElementById('document-print-css')?.textContent ?? ''
}

afterEach(() => {
  document.getElementById('document-print-css')?.remove()
  vi.restoreAllMocks()
})

describe('runLabelPrint', () => {
  it('injects label page CSS and opens the print dialog', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})

    runLabelPrint('printLabel', { widthMm: 60, heightMm: 40 })

    expect(print).toHaveBeenCalledTimes(1)
    const css = styleText()
    expect(css).toContain('size: 60mm 40mm')
    expect(css).toContain('.label-sheet')
  })
})

describe('runInvoicePrint', () => {
  it('defaults to A4 and targets invoice sheets', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})

    runInvoicePrint('invoicePrintArea')

    expect(print).toHaveBeenCalledTimes(1)
    const css = styleText()
    expect(css).toContain('size: A4')
    expect(css).toContain('.invoice-sheet')
  })

  it('cleans up the injected style after printing', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {})
    runInvoicePrint('invoicePrintArea')
    expect(document.getElementById('document-print-css')).not.toBeNull()

    window.dispatchEvent(new Event('afterprint'))
    expect(document.getElementById('document-print-css')).toBeNull()
  })
})
