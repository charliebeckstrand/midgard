// Types the Vite `?url` import of the pdf.js worker, whose default export is the
// emitted asset URL fed to `GlobalWorkerOptions.workerSrc`.
declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
	const workerUrl: string
	export default workerUrl
}
