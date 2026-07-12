import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { collectPatternViolations, srcDir } from '../helpers/walk-source'

// React warns that `useLayoutEffect` does nothing on the server: any shipped
// source that renders during SSR and calls it directly emits the warning.
// `hooks/use-isomorphic-layout-effect.ts` is the single sanctioned import
// site (it resolves to `useEffect` off the browser); everything else reaches
// `useIsomorphicLayoutEffect` instead. `docs/` is excluded — it is a
// client-only Vite SPA (`docs/main.tsx`), never server-rendered.

const FORBIDDEN_PATTERNS = [
	{ label: 'raw useLayoutEffect', regex: /\buseLayoutEffect\b/g },
] as const

describe('isomorphic layout effect boundary', () => {
	it('only the isomorphic helper imports useLayoutEffect directly from react', () => {
		const violations = collectPatternViolations({
			dir: srcDir,
			patterns: FORBIDDEN_PATTERNS,
		}).filter((violation) => {
			const [rel] = violation.split(' → ')

			return rel !== join('hooks', 'use-isomorphic-layout-effect.ts') && !rel?.startsWith('docs/')
		})

		expect(
			violations,
			`raw useLayoutEffect used outside the isomorphic helper (import useIsomorphicLayoutEffect from 'hooks/use-isomorphic-layout-effect' instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
