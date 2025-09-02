declare module 'html2pdf.js' {
  export type Html2PdfOptions = {
    margin?: number | [number, number, number, number]
    filename?: string
    image?: { type?: 'jpeg' | 'png', quality?: number }
    html2canvas?: { scale?: number, useCORS?: boolean }
    jsPDF?: { unit?: 'mm' | 'pt' | 'in', format?: string | [number, number], orientation?: 'portrait' | 'landscape' }
  }

  export interface Html2PdfWorker {
    set: (opt: Html2PdfOptions) => Html2PdfWorker
    from: (source: HTMLElement | string) => Html2PdfWorker
    outputPdf: (type: 'blob' | 'datauristring') => Promise<Blob | string>
  }

  export interface Html2PdfInstance {
    set: (opt: Html2PdfOptions) => Html2PdfInstance
    from: (source: HTMLElement | string) => Html2PdfWorker
  }

  const html2pdf: () => Html2PdfInstance
  export default html2pdf
}


