import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	docsSites,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Mobile-first boundary.
//
// A class in `ui` is mobile-first. The unprefixed class holds below the first
// breakpoint, and a min-width prefix (`sm:`, `lg:`) changes it from that
// breakpoint up. A viewport `max-*:` prefix states the same change from the
// other side, and two directions on one surface make a reader work out which
// class wins at each width. A component whose layout changes at a breakpoint
// takes that axis as a `Responsive<T>` prop (CONVENTIONS §5.9).
//
// A container query (`@max-sm/name:`) reads the box of a container, not the
// viewport, so the rule does not apply to it.
//
// A default of `ui` that changes with the viewport names size classes through
// `adaptive`, and never a breakpoint, so that `SIZE_CLASSES` in
// `types/responsive.ts` is the one table that ties a layout to a width. The
// docs site shows the consumer API, so the rule does not apply to it.

/** A viewport `max-*:` variant: a named breakpoint, or an arbitrary width. */
const MAX_VARIANT = /(?<![@\w-])max-(?:sm|md|lg|xl|2xl|\[[^\]\s]+\]):/

/** An object literal that names a breakpoint beside `initial`: a responsive value written by hand. */
const BREAKPOINT_MAP = /\{\s*initial:\s*[^,{}]+,\s*['"]?(?:sm|md|lg|xl|2xl)['"]?:/

/** Each `file:line` that writes a viewport `max-*:` variant in `text`. */
function offenders(key: string, text: string): string[] {
	return text
		.split('\n')
		.flatMap((line, index) => (MAX_VARIANT.test(line) ? [`${key}:${index + 1}`] : []))
}

describe('mobile-first classes in ui', () => {
	it('no source file writes a viewport max-* variant', () => {
		const found: string[] = []

		walkSource(srcDir, (file, content) => {
			if (!/\.(?:tsx?|css)$/.test(file)) return

			found.push(...offenders(srcRelative(file), stripSourceComments(content)))
		})

		expect(found).toEqual([])
	})

	it('no default outside the docs writes a breakpoint map by hand', () => {
		const found: string[] = []

		walkSource(
			srcDir,
			(file, content) => {
				if (!/\.tsx?$/.test(file)) return

				const code = stripSourceComments(content).replace(/\s+/g, ' ')

				if (BREAKPOINT_MAP.test(code)) found.push(srcRelative(file))
			},
			docsSites,
		)

		expect(found).toEqual([])
	})

	it('ui/tailwind.css writes no viewport max-* variant', () => {
		const css = readFileSync(join(srcDir, '..', 'tailwind.css'), 'utf8')

		expect(offenders('tailwind.css', css.replace(/\/\*[\s\S]*?\*\//g, ''))).toEqual([])
	})

	it('the pattern finds a viewport variant and passes a container query', () => {
		expect(MAX_VARIANT.test("'max-sm:w-full'")).toBe(true)

		expect(MAX_VARIANT.test("'max-[600px]:hidden'")).toBe(true)

		expect(MAX_VARIANT.test("'@max-sm/pagination:hidden'")).toBe(false)

		expect(MAX_VARIANT.test("'max-w-sm'")).toBe(false)
	})

	it('the map pattern finds a hand-written breakpoint map', () => {
		expect(BREAKPOINT_MAP.test("{ initial: 'col', lg: 'row' }")).toBe(true)

		expect(BREAKPOINT_MAP.test("{ initial: 'vertical', '2xl': 'horizontal' }")).toBe(true)

		expect(BREAKPOINT_MAP.test("adaptive({ compact: 'col', medium: 'row' })")).toBe(false)
	})
})
