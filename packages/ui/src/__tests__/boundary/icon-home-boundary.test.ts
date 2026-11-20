// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	docsSites,
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Icon home boundary.
//
// An app can replace each icon that ui draws, through `<UIProvider icons>`
// (CONVENTIONS §5.13). The glyphs of `primitives/icons/icons.ts` read that map,
// and they are the only path from ui to lucide. A component that imports a
// glyph from `lucide-react` draws the Lucide icon in each app, and the icon of
// the app does not reach it. So no file of ui outside `primitives/icons`
// imports `lucide-react`. The docs site and the tests are users of ui, as an
// app is, so they stay out of the scan.

/** The folder that holds the glyphs, relative to `src`. */
const HOME = 'primitives/icons/'

/** An import or a re-export from `lucide-react`, static or dynamic. */
const LUCIDE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]lucide-react(?:\/[^'"]*)?['"]/

describe('icon home boundary', () => {
	const files = new Map<string, string>()

	walkSource(
		srcDir,
		(file, content) => {
			if (isSourceFile(file)) files.set(srcRelative(file), stripSourceComments(content))
		},
		docsSites,
	)

	it('reads the sources of ui and the home of the glyphs', () => {
		// A walk that read no file would pass the case below with an empty list.
		expect(files.size).toBeGreaterThan(500)

		expect(files.has(`${HOME}icons.ts`)).toBe(true)
	})

	it('imports lucide-react only in the home of the glyphs', () => {
		const violations = [...files]
			.filter(([file, code]) => !file.startsWith(HOME) && LUCIDE_IMPORT.test(code))
			.map(([file]) => file)

		expect(
			violations,
			`import each glyph from \`${HOME}icons\`, not from lucide-react:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('finds a static, a type, a dynamic, and a re-export import', () => {
		expect(
			[
				`import { X } from 'lucide-react'`,
				`import type { LucideIcon } from "lucide-react"`,
				`const icons = import('lucide-react')`,
				`export { X } from 'lucide-react'`,
				`import { X } from '../../primitives/icons/icons'`,
			].map((code) => LUCIDE_IMPORT.test(code)),
		).toEqual([true, true, true, true, false])
	})
})
