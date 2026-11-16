// @vitest-environment node
import { readFileSync } from 'node:fs'
import { compile } from '@tailwindcss/node'
import { describe, expect, it } from 'vitest'
import { cn } from '../../core/cn'
import { noop } from '../../utilities/noop'
import { uiRoot } from '../helpers/walk-source'

/** Builds the CSS of `classes` with the Tailwind extensions of ui. */
async function buildCss(classes: string[]) {
	const compiler = await compile(`@import 'tailwindcss';\n@import './tailwind.css';`, {
		base: uiRoot,
		onDependency: noop,
	})

	return compiler.build(classes)
}

/** The text of the rule of `name` in `css`, up to the close of its outer block. */
function readRule(css: string, name: string) {
	const start = css.indexOf(`.${name} {`)

	if (start === -1) return ''

	let depth = 0

	for (let index = css.indexOf('{', start); index < css.length; index++) {
		if (css[index] === '{') depth++

		if (css[index] === '}' && --depth === 0) return css.slice(start, index + 1)
	}

	return ''
}

/** The text with each run of white space as one space. */
const squeeze = (text: string) => text.replaceAll(/\s+/g, ' ')

/**
 * A touch pitch sets the touch gaps to zero on a fine pointer. On a coarse
 * pointer, it gives each row the coarse floor of `TouchTarget`, puts each host
 * in the middle of its cell, and lets each hit area take the floor
 * (`core/touch/pitch.ts`).
 */
describe('the touch pitch utility', () => {
	it('keeps each hit area to its host on a fine pointer', async () => {
		const rule = squeeze(readRule(await buildCss(['touch-pitch']), 'touch-pitch'))

		expect(rule).toMatch(/^\.touch-pitch \{ --touch-target-gap-x: 0px; --touch-target-gap-y: 0px;/)
	})

	it('gives each cell the floor and each hit area the floor on a coarse pointer', async () => {
		const rule = squeeze(readRule(await buildCss(['touch-pitch']), 'touch-pitch'))

		expect(rule).toContain(
			'@media (pointer: coarse) { --touch-target-gap-x: initial; --touch-target-gap-y: initial; grid-auto-rows: minmax(2.75rem, auto); place-items: center; }',
		)
	})

	it('takes the coarse floor of TouchTarget', () => {
		const source = readFileSync(`${uiRoot}/src/primitives/touch-target/touch-target.tsx`, 'utf8')

		expect(source).toContain('pointer-coarse:[--touch-target-floor:2.75rem]')
	})

	it('stays beside a touch action utility', () => {
		expect(cn('touch-none', 'touch-pitch')).toBe('touch-none touch-pitch')
	})
})
