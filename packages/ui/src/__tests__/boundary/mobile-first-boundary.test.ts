import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Mobile-first boundary.
//
// A class in `ui` is mobile-first. The unprefixed class holds below the first
// breakpoint, and a min-width prefix (`sm:`, `lg:`) changes it from that
// breakpoint up. A viewport `max-*:` prefix states the same change from the
// other side, and two directions on one surface make a reader work out which
// class wins at each width. A component whose layout changes at a breakpoint
// takes that axis as a `Responsive<T>` prop (CONVENTIONS §5.9), and its default
// value holds the breakpoint.
//
// A container query (`@max-sm/name:`) reads the box of a container, not the
// viewport, so the rule does not apply to it.

/** A viewport `max-*:` variant: a named breakpoint, or an arbitrary width. */
const MAX_VARIANT = /(?<![@\w-])max-(?:sm|md|lg|xl|2xl|\[[^\]\s]+\]):/

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
})
