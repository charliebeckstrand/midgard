import path from 'node:path'

// Every docs benchmark and reporter anchors to the same two directories. They
// resolve here once, so no suite repeats the path arithmetic, and no suite
// drifts onto a different root.
//
// This module stays free of engine imports. `bundle-budget.ts` runs in CI and
// only walks the built assets; an import of the extraction engine would load
// ts-morph and cost that run about 2.4 seconds for a directory string.

/** The package's `src`, two levels above `src/__benchmarks__/docs`. */
export const srcDir = path.resolve(import.meta.dirname, '..', '..')

/** The package root, which holds `package.json`, the tsconfigs, and `node_modules`. */
export const pkgRoot = path.resolve(srcDir, '..')
