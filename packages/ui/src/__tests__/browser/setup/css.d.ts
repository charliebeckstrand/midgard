// The browser setup imports a Tailwind entry for its side effect (Vite injects
// the compiled stylesheet). Unlike the docs tree, the test tree is covered by
// the package tsconfig, so it needs the same `*.css` module shim `vite/client`
// would otherwise provide.
declare module '*.css'
