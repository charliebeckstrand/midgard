// @vitest-environment node
import { compile } from '@tailwindcss/node'
import { describe, expect, it } from 'vitest'
import { cn } from '../../core/cn'
import { noop } from '../../utilities/noop'
import { uiRoot } from '../helpers/walk-source'

/** Builds the CSS of `classes` with the Tailwind extensions of ui. */
async function buildCss(classes: string[]) {
	const compiler = await compile(`@import 'tailwindcss';\n@import './styles/tailwind.css';`, {
		base: uiRoot,
		onDependency: noop,
	})

	return compiler.build(classes)
}

/** The text with each run of white space as one space. */
const squeeze = (text: string) => text.replaceAll(/\s+/g, ' ')

/**
 * A touch scroll gives a scroll box a padding at its end on a coarse pointer.
 * The padding is the reach of the hit area of a `sm` host past its edge, so a
 * hit area at the bottom edge stays in the box (`core/touch/scroll.ts`).
 */
describe('the touch scroll utility', () => {
	it('pads the end of the box on a coarse pointer only', async () => {
		const css = squeeze(await buildCss(['touch-scroll']))

		expect(css).toContain(
			'@media (pointer: coarse) { .touch-scroll { padding-block-end: calc((2.75rem - 2rem) / 2); } }',
		)
	})

	it('writes no padding on a fine pointer', async () => {
		const css = squeeze(await buildCss(['touch-scroll']))

		expect(css.match(/\.touch-scroll \{/g)).toHaveLength(1)
	})

	it('stays beside a padding utility', () => {
		expect(cn('p-4', 'touch-scroll')).toBe('p-4 touch-scroll')
	})
})
