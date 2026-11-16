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
 * A touch pitch sets the touch gap of its axes to zero, and on a coarse
 * pointer it gives each child the coarse floor of `TouchTarget` on those axes
 * (`core/touch/pitch.ts`).
 */
describe('the touch pitch utilities', () => {
	it('tiles the hit areas and floors each child on both axes', async () => {
		const rule = squeeze(readRule(await buildCss(['touch-pitch']), 'touch-pitch'))

		expect(rule).toContain('--touch-target-gap-x: 0px;')

		expect(rule).toContain('--touch-target-gap-y: 0px;')

		expect(rule).toContain(
			'@media (pointer: coarse) { & > * { min-inline-size: 2.75rem; min-block-size: 2.75rem; } }',
		)
	})

	it('floors each child on its one axis', async () => {
		const css = await buildCss(['touch-pitch-x', 'touch-pitch-y'])

		const x = squeeze(readRule(css, 'touch-pitch-x'))

		const y = squeeze(readRule(css, 'touch-pitch-y'))

		expect(x).toContain('--touch-target-gap-x: 0px;')

		expect(x).toContain('& > * { min-inline-size: 2.75rem; }')

		expect(x).not.toContain('gap-y')

		expect(y).toContain('--touch-target-gap-y: 0px;')

		expect(y).toContain('& > * { min-block-size: 2.75rem; }')

		expect(y).not.toContain('gap-x')
	})

	it('takes the coarse floor of TouchTarget', () => {
		const source = readFileSync(`${uiRoot}/src/primitives/touch-target/touch-target.tsx`, 'utf8')

		expect(source).toContain('pointer-coarse:[--touch-target-floor:2.75rem]')
	})

	it('stays beside a touch action utility', () => {
		expect(cn('touch-none', 'touch-pitch')).toBe('touch-none touch-pitch')

		expect(cn('touch-pan-x', 'touch-pitch-x')).toBe('touch-pan-x touch-pitch-x')
	})
})
