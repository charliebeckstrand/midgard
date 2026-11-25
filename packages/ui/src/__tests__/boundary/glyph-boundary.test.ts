// @vitest-environment node
import * as lucide from 'lucide-react'
import { describe, expect, it } from 'vitest'
import {
	docsSites,
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Glyph boundary.
//
// An app can replace each icon that ui draws, through `<UIProvider icons>`
// (CONVENTIONS §5.13). `Glyph` reads that map. A component that renders a
// Lucide icon as a JSX tag draws the Lucide icon in each app, and the icon of
// the app does not reach it. So a file of ui gives a Lucide icon to `Glyph` or
// to `Icon` as a value, and never renders it as a tag. The `IconName` list
// types the map of an app, so it holds each Lucide icon that ui imports. The
// docs site and the tests are users of ui, as an app is, so they stay out of
// the scan.

/** The file that lists the names of the icons that ui draws, relative to `src`. */
const TYPES = 'primitives/glyph/types.ts'

/** A static import from `lucide-react`, with its clause. */
const LUCIDE_IMPORT = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g

/** The value imports of a file from `lucide-react`, as `[own name, local name]`. */
function lucideImports(code: string): [name: string, local: string][] {
	return [...code.matchAll(LUCIDE_IMPORT)].flatMap(([, typeOnly, clause]) =>
		typeOnly
			? []
			: (clause as string)
					.split(',')
					.map((part) => part.trim())
					.filter((part) => part && !part.startsWith('type '))
					.map((part) => {
						const [name, local] = part.split(/\s+as\s+/)

						return [name as string, local ?? (name as string)] as [string, string]
					}),
	)
}

/** The local names of `imports` that `code` renders as a JSX tag or through `createElement`. */
function renderedTags(code: string, imports: [string, string][]): string[] {
	return imports
		.map(([, local]) => local)
		.filter((local) => new RegExp(`<${local}[\\s/>]|createElement\\(\\s*${local}\\b`).test(code))
}

describe('glyph boundary', () => {
	const files = new Map<string, string>()

	walkSource(
		srcDir,
		(file, content) => {
			if (isSourceFile(file)) files.set(srcRelative(file), stripSourceComments(content))
		},
		docsSites,
	)

	const listed = [...(files.get(TYPES) ?? '').matchAll(/\|\s*'(\w+)'/g)].map((match) => match[1])

	it('reads the sources of ui and the list of icon names', () => {
		// A walk that read no file would pass the cases below with an empty list.
		expect(files.size).toBeGreaterThan(500)

		expect(listed.length).toBeGreaterThan(50)
	})

	it('renders no Lucide icon as a JSX tag', () => {
		const violations = [...files].flatMap(([file, code]) =>
			renderedTags(code, lucideImports(code)).map((local) => `${file}: <${local}>`),
		)

		expect(
			violations,
			`give the icon to \`Glyph\` or \`Icon\` as \`icon={X}\`:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('lists each Lucide icon that ui imports in IconName, and no other', () => {
		const imported = [
			...new Set([...files.values()].flatMap((code) => lucideImports(code).map(([name]) => name))),
		].sort()

		expect([...listed].sort()).toEqual(imported)
	})

	it('lists each icon by the own name that Lucide gives it', () => {
		const icons = lucide as unknown as Record<string, { displayName?: string } | undefined>

		expect(listed.filter((name) => icons[name as string]?.displayName !== name)).toEqual([])
	})

	it('finds a tag, a self-closed tag, and a createElement call, and passes a value', () => {
		const imports: [string, string][] = [['X', 'X']]

		expect(
			[
				'<X className="size-4" />',
				'<X/>',
				'createElement(X, props)',
				'<Glyph icon={X} />',
				'<Icon icon={X} />',
				'<XCircle />',
			].map((code) => renderedTags(code, imports).length > 0),
		).toEqual([true, true, true, false, false, false])
	})

	it('reads an alias and skips a type import', () => {
		expect(
			lucideImports(
				`import { Calendar as CalendarIcon, type LucideIcon, X } from 'lucide-react'\nimport type { LucideProps } from 'lucide-react'`,
			),
		).toEqual([
			['Calendar', 'CalendarIcon'],
			['X', 'X'],
		])
	})
})
