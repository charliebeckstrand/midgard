/**
 * `shiki` mock applied globally via `setup/module-mocks.ts`.
 *
 * Replaces shiki's async WASM highlighter with a synchronous-ish stub. The
 * markup is a superset of what both consumers assert: CodeBlock only needs a
 * `pre.shiki` wrapper, while Markdown asserts the resolved grammar via
 * `data-lang` (sourced from `options.lang`, defaulting to the text grammar).
 *
 * Global rather than per-file on purpose: markdown.test.tsx and
 * code-block.test.tsx previously each declared a divergent local
 * `vi.mock('shiki')` (see setup/module-mocks.ts). Whichever file loaded first
 * won the shared module registry, so Markdown's `data-lang` assertion
 * intermittently saw CodeBlock's attribute-less markup and timed out. One
 * global factory both agree on removes the order dependence.
 *
 * boundary/code-block-load-shiki.test.ts re-registers this same double with
 * `vi.doMock`. That file runs on forks, where a per-file mock reaches no
 * sibling, so the rule above does not bind it.
 */

import { vi } from 'vitest'

const codeToHtml = vi.fn(
	async (code: string, options?: { lang?: string }) =>
		`<pre class="shiki" data-lang="${options?.lang ?? 'text'}"><code>${code}</code></pre>`,
)

const shiki = { codeToHtml, default: { codeToHtml } }

export default shiki
