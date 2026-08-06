import path from 'node:path'

// Every docs benchmark measures one tree: this package's `src`, and the
// tsconfig that `openProject` resolves beside it. They live here so a suite
// cannot drift onto a different root, and so adding a suite needs no path
// arithmetic of its own.

/** The package's `src`, two levels above `src/__benchmarks__/docs`. */
export const srcDir = path.resolve(import.meta.dirname, '..', '..')

/** The `tsconfig.json` a ts-morph Project opens, one level above {@link srcDir}. */
export const tsConfigFilePath = path.resolve(srcDir, '..', 'tsconfig.json')
