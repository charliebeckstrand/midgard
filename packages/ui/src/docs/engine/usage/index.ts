// The usage engine: seed → synthesized AST → printed code. React-free and
// Node-free, so the browser chrome and the golden tests import the same module.
// Live rendering (the AST → React-element walk) arrives in a later phase behind
// this same contract.

export type { Attr, Expr, Field, ImportLine, Stmt, UsageDoc } from './ast'
export type { Complexity, Knobs, UsageConfig } from './config'
export { KNOBS, resolveConfig } from './config'
export { printUsage } from './printer'
export { formatSeed, makeRng, parseSeed, type Rng, randomSeed } from './prng'
export { synthesize } from './synth'
export type { Domain } from './vocab'
