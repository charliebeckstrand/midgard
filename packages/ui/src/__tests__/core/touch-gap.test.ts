// @vitest-environment node
import { compile } from '@tailwindcss/node'
import { describe, expect, it } from 'vitest'
import { cn } from '../../core/cn'
import { noop } from '../../utilities/noop'
import {
	srcDir,
	srcRelative,
	stripSourceComments,
	uiRoot,
	walkSource,
} from '../helpers/walk-source'

/** Builds the CSS of `classes` with the Tailwind extensions of ui. */
async function buildCss(classes: string[]) {
	const compiler = await compile(`@import 'tailwindcss';\n@import './tailwind.css';`, {
		base: uiRoot,
		onDependency: noop,
	})

	return compiler.build(classes)
}

/** The declarations of the rule of `name` in `css`, one string each. */
function readRule(css: string, name: string) {
	const selector = `.${name.replaceAll('.', '\\.').replaceAll(':', '\\:')}`

	const start = css.indexOf(`${selector} {`)

	if (start === -1) return []

	const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))

	return body
		.split(';')
		.map((line) => line.trim())
		.filter(Boolean)
}

/**
 * A touch gap writes the gap between hosts of a hit area and the part of the gap that each hit
 * area can fill (`core/touch/gap.ts`), as one length.
 */
describe('the touch gap utilities', () => {
	it('writes the row gap and the block touch gap from one stop', async () => {
		const css = await buildCss(['touch-gap-y-0.5'])

		expect(readRule(css, 'touch-gap-y-0.5')).toEqual([
			'row-gap: calc(var(--spacing) * 0.5)',
			'--touch-target-gap-y: calc(var(--spacing) * 0.5)',
		])
	})

	it('writes the column gap and the inline touch gap from one stop', async () => {
		const css = await buildCss(['touch-gap-x-3'])

		expect(readRule(css, 'touch-gap-x-3')).toEqual([
			'column-gap: calc(var(--spacing) * 3)',
			'--touch-target-gap-x: calc(var(--spacing) * 3)',
		])
	})

	it('writes the gap and both touch gaps from one stop', async () => {
		const css = await buildCss(['touch-gap-1'])

		expect(readRule(css, 'touch-gap-1')).toEqual([
			'gap: calc(var(--spacing) * 1)',
			'--touch-target-gap-x: calc(var(--spacing) * 1)',
			'--touch-target-gap-y: calc(var(--spacing) * 1)',
		])
	})

	it('writes no rule for a stop off the quarter grid', async () => {
		const css = await buildCss(['touch-gap-y-0.3'])

		expect(readRule(css, 'touch-gap-y-0.3')).toEqual([])
	})

	it('merges a touch gap with the gap of its axis', () => {
		expect(cn('gap-y-2', 'touch-gap-y-0.5')).toBe('touch-gap-y-0.5')

		expect(cn('touch-gap-x-0.5', 'gap-x-2')).toBe('gap-x-2')

		expect(cn('touch-gap-x-0.5', 'gap-y-2')).toBe('touch-gap-x-0.5 gap-y-2')
	})
})

/** A plain gap and a touch gap of the same stop in one string: the pair that a touch gap writes. */
const PAIR = /\bgap(?:-[xy])?-([\d.]+)\b[^'"`]*\[--touch-target-gap-[xy]:--spacing\(\1\)\]/

describe('the touch gap boundary', () => {
	it('writes no gap and touch gap pair by hand', () => {
		const violations: string[] = []

		walkSource(srcDir, (path, source) => {
			if (!/\.tsx?$/.test(path) || path.includes('__tests__')) return

			if (PAIR.test(stripSourceComments(source))) violations.push(srcRelative(path))
		})

		expect(violations, 'write a `touch-gap-*` utility in place of the pair').toEqual([])
	})
})
