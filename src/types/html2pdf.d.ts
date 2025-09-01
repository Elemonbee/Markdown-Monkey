declare module 'html2pdf.js' {
  type Html2PdfInstance = {
    set: (opt: any) => Html2PdfInstance
    from: (el: HTMLElement | string) => Html2PdfInstance
    outputPdf: (type: 'blob' | 'datauristring') => Promise<Blob | string>
  }
  const html2pdf: () => Html2PdfInstance
  export default html2pdf
}


