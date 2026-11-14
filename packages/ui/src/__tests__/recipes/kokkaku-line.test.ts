// @vitest-environment node
import clsx, { type ClassValue } from 'clsx'
import { describe, expect, it } from 'vitest'
import { kokkaku } from '../../recipes/kiso'
import { dan } from '../../recipes/kiso/dan'

/** A text class: a stepped `density-text` ramp, gated or not, or a fixed Tailwind text size. */
const TEXT = /^(?:[a-z-]+:)*(?:density-text-\[|text-(?:2xs|xs|sm|base|lg|[2-9]?xl)$)/

/** A fixed height class, such as `h-5` or `h-[22px]`, or a stepped height ramp. */
const HEIGHT = /^(?:[a-z-]+:)*(?:density-)?h-(?!lh$|full$|auto$)/

/** Each entry of the kokkaku forms that is a list of classes, keyed by its path. */
function collectEntries(node: unknown, path: string[] = []): [string, string[]][] {
	if (typeof node === 'string' || Array.isArray(node)) {
		return [[path.join('.'), clsx(node as ClassValue).split(' ')]]
	}

	if (node && typeof node === 'object') {
		return Object.entries(node).flatMap(([key, child]) => collectEntries(child, [...path, key]))
	}

	return []
}

/**
 * The lines of text: an entry with a text class and a box of its own, a width or a height. An
 * entry with `h-auto` takes the height of its content, and a value with no box, such as the text
 * of a picker, sizes the box around it, so neither is a line.
 */
const lines = collectEntries(kokkaku).filter(
	([, classes]) =>
		classes.some((name) => TEXT.test(name)) &&
		!classes.includes('h-auto') &&
		classes.some((name) => /^(?:w-|(?:density-)?h-)/.test(name) || HEIGHT.test(name)),
)

/**
 * A line of text in a skeleton form is one line of its text (`kiso/README.md` §4): it takes the
 * text class of the line that it stands for and `h-lh`, so the text sets the height.
 */
describe('the line of a skeleton', () => {
	it('finds the lines of text', () => {
		expect(lines.length).toBeGreaterThan(10)
	})

	it.each(lines)('gives kokkaku.%s one line of its text', (_, classes) => {
		expect(classes).toContain('h-lh')

		expect(classes.filter((name) => HEIGHT.test(name))).toEqual([])
	})

	it('keeps no ramp in dan.size.line that restates a line height', () => {
		expect(Object.keys(dan.size.line).sort()).toEqual(['small', 'subtitle', 'tiny', 'title'])
	})
})
