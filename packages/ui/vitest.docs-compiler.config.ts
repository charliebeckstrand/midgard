import { mergeConfig } from 'vitest/config'
import { compileUiSource } from './vitest.compiler.preset.ts'
import docs from './vitest.docs.config.ts'

// The `docs` project of the compiled run (`vitest.compiler.config.ts`). A
// project in a file of its own inherits no plugin and no option of that run, so
// this file adds the compiler and the flag that the run sets. The module cache
// of the run reaches this project too, because a project with no cache path of
// its own uses the cache path of the root config.
export default mergeConfig(docs, {
	plugins: [compileUiSource('__tests__')],
	test: { env: { REACT_COMPILER: '1' } },
})
