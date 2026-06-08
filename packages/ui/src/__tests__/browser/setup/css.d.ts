// `*.css` module shim: the browser setup imports a Tailwind entry for its side
// effect (Vite injects the compiled stylesheet), and the package tsconfig
// doesn't include `vite/client` to provide this shim automatically.
declare module '*.css'
