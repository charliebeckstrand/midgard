// The usage engine: seed → synthesized AST → printed code. React-free and
// Node-free, so the browser chrome and the golden tests import the same module.
// The live AST → React-element walk (`render.tsx`) sits beside this, out of the
// barrel, since only the chrome needs React.

export type { Attr, Expr, Field, ImportLine, Stmt, UsageDoc } from './ast'
export type { UsageConfig } from './config'
export { resolveConfig } from './config'
export { printUsage } from './printer'
export { hashSeed, makeRng, type Rng } from './prng'
export { synthesize } from './synth'
export type { Domain } from './vocab'
