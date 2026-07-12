import { relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { srcDir, walkSource } from '../helpers/walk-source'

const REACT_USE_LAYOUT_EFFECT = /import\s+\{[^}]*\buseLayoutEffect\b[^}]*\}\s+from\s+['"]react['"]/

function isSanctioned(rel: string): boolean {
	return rel === 'hooks/use-isomorphic-layout-effect.ts'
}

describe('isomorphic layout effect boundary', () => {
	// React warns that `useLayoutEffect` does nothing on the server: any shipped
	// source that renders during SSR and calls it directly emits the warning.
	// `hooks/use-isomorphic-layout-effect.ts` is the single sanctioned import
	// site (it resolves to `useEffect` off the browser); everything else reaches
	// `useIsomorphicLayoutEffect` instead. `docs/` is skipped — it is a
	// client-only Vite SPA (`docs/main.tsx`), never server-rendered.
	it('useLayoutEffect is imported from react only in the isomorphic helper', () => {
		const violations: string[] = []

		walkSource(
			srcDir,
			(path, source) => {
				if (!/\.tsx?$/.test(path)) return

				const rel = relative(srcDir, path)

				if (!REACT_USE_LAYOUT_EFFECT.test(source)) return

				if (isSanctioned(rel)) return

				violations.push(rel)
			},
			new Set(['docs']),
		)

		expect(
			violations,
			`useLayoutEffect imported from 'react' outside the isomorphic helper (import useIsomorphicLayoutEffect from 'hooks/use-isomorphic-layout-effect' instead): ${violations.join(', ')}`,
		).toEqual([])
	})
})
