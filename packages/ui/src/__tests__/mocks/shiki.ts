/**
 * `shiki` mock applied globally via `setup/module-mocks.ts`.
 *
 * Replaces shiki's async WASM highlighter with a synchronous-ish stub. The
 * markup is a superset of what both consumers assert: CodeBlock only needs a
 * `pre.shiki` wrapper, while Markdown asserts the resolved grammar via
 * `data-lang` (sourced from `options.lang`, defaulting to the text grammar).
 *
 * Global rather than per-file on purpose: markdown.test.tsx and
 * code-block.test.tsx are the only shiki consumers and previously each declared
 * a divergent local `vi.mock('shiki')` (see setup/module-mocks.ts). Whichever
 * file loaded first won the shared module registry, so Markdown's `data-lang`
 * assertion intermittently saw CodeBlock's attribute-less markup and timed out.
 * One global factory both agree on removes the order dependence.
 */

import { vi } from 'vitest'

const codeToHtml = vi.fn(
	async (code: string, options?: { lang?: string }) =>
		`<pre class="shiki" data-lang="${options?.lang ?? 'text'}"><code>${code}</code></pre>`,
)

const shiki = { codeToHtml, default: { codeToHtml } }

let importError: Error | null = null

/**
 * Makes `import('shiki')` reject until the error is cleared — the failure
 * `loadShiki`'s memo must survive (an offline chunk fetch, a post-deploy 404).
 *
 * A dynamic import settles with this object, and promise resolution adopts a
 * thenable, so a `then` that rejects turns the import itself into a rejection.
 * Assert that the import rejects, never on the error: a cold registry runs the
 * global factory, which rewrites the rejection with Vitest's own mocking hint.
 * Clear the error in a `finally` — one registry serves every file a worker runs.
 */
export function failShikiImport(error: Error | null) {
	importError = error
}

Object.defineProperty(shiki, 'then', {
	configurable: true,
	get: () =>
		importError
			? (_resolve: unknown, reject: (reason: unknown) => void) => reject(importError)
			: undefined,
})

export default shiki
