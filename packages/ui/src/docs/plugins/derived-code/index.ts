import path from 'node:path'
import type { Plugin } from 'vite'
import { collectHelpers } from './collect-helpers'

/**
 * Vite plugin that extracts each demo helper component's full source at
 * build time and attaches it as a `__code` static property on the component.
 *
 * The docs code-derivation walker reads `__code` at render time so that
 * `<Example><MyHelperDemo /></Example>` produces a snippet showing the
 * helper's hooks, state setup, and JSX — not just a `<MyHelperDemo />` tag,
 * and without invoking the component at derive-time (which would trigger
 * React's rules-of-hooks warning when hooks run inside `useMemo`).
 *
 * Scope is limited to `demos/*.tsx` so the transform has no reach into
 * library components or unrelated docs modules.
 */
export function derivedCodePlugin(): Plugin {
	let demosDir: string

	return {
		name: 'derived-code',

		enforce: 'pre',

		configResolved(config) {
			demosDir = path.resolve(config.root, 'demos')
		},

		transform(code, id) {
			const cleanId = id.split('?')[0]

			if (!cleanId.startsWith(demosDir + path.sep)) return

			if (!cleanId.endsWith('.tsx')) return

			const helpers = collectHelpers(code)

			if (helpers.length === 0) return

			const tail = helpers
				.map(
					({ name, code }) =>
						`;(${name} as unknown as { __code?: string }).__code = ${JSON.stringify(code)};`,
				)
				.join('\n')

			return { code: `${code}\n\n${tail}\n`, map: null }
		},
	}
}
