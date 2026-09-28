import { mergeConfig } from 'vitest/config'
import base from './vitest.bench.browser.config'
import { compileUiSource } from './vitest.compiler.preset'

/**
 * The browser benchmarks with the React Compiler on (`pnpm
 * bench:browser:compiler`). An app with `reactCompiler: true` compiles the `ui`
 * source that it imports, so this run measures the `ui` modules as such an app
 * ships them. Compare it with a plain `bench:browser` run to see what the
 * compiler gains or costs.
 *
 * The compiler reads the `ui` source only (`vitest.compiler.preset.ts`). The
 * bench harness under `__benchmarks__` stays plain, so both runs time the same
 * harness.
 */
export default mergeConfig(base, {
	plugins: [compileUiSource('__benchmarks__')],
	// The compiled modules import the compiler runtime. Pre-bundled with the rest
	// of the bench set, it is not found late, so the page does not reload
	// mid-run (see the base config).
	optimizeDeps: { include: ['react/compiler-runtime'] },
	test: {
		// Added to the setup of the base config. It stops the run when the
		// compiler does not compile the `ui` source.
		setupFiles: ['./src/__benchmarks__/browser/setup-compiler.ts'],
	},
})
