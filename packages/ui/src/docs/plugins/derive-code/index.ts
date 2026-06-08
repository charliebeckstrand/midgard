import path from 'node:path'
import type { Plugin } from 'vite'
import { collectHelpers } from './collect-helpers'

/**
 * Vite plugin that extracts each demo helper component's full source at
 * build time and attaches it as a `__code` static property on the component.
 *
 * The docs code-derivation walker reads `__code` at render time, producing a
 * snippet showing the helper's hooks, state setup, and JSX rather than an
 * opaque `<MyHelperDemo />` tag. The snippet is read statically — the
 * component is not invoked at derive-time.
 *
 * Scope is limited to `demos/*.tsx`; library components and unrelated docs
 * modules are not transformed.
 */
export function deriveCodePlugin(): Plugin {
	let demosDir = ''

	return {
		name: 'derive-code',

		enforce: 'pre',

		configResolved(config) {
			demosDir = path.resolve(config.root, 'demos')
		},

		transform(code, id) {
			const cleanId = id.split('?')[0] ?? ''

			if (!cleanId.startsWith(demosDir + path.sep)) return

			if (!cleanId.endsWith('.tsx')) return

			const helpers = collectHelpers(code)

			if (helpers.length === 0) return

			const tail = helpers
				.map(({ name, code }) => `;Object.assign(${name}, { __code: ${JSON.stringify(code)} });`)
				.join('\n')

			return { code: `${code}\n\n${tail}\n`, map: null }
		},
	}
}
