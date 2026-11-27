import { describe, expect, it } from 'vitest'
import { ProgressBar } from '../../components/progress'
import { Slider } from '../../components/slider'
import {
	focusMarks,
	focusOutline,
	insetStops,
	markOutline,
	pixels,
} from './helpers/forced-indicators'

/**
 * The controls of the forced half without forced colors. The forced half is
 * `forced/forced-colors-indicators.test.tsx`, which the `forced-light` and the
 * `forced-dark` instances run. It reads that two states of a control paint
 * different pixels, and that a focus mark draws an outline. These cases show
 * that each of those reads is a result of forced colors: without them, the
 * states also paint differently, and the focus marks draw no outline.
 */
describe('controls without forced colors (real browser)', () => {
	it('does not emulate forced colors', () => {
		expect(matchMedia('(forced-colors: active)').matches).toBe(false)
	})

	it('control: each pair paints differently', async () => {
		const bar = [
			await pixels(<ProgressBar aria-label="Upload" value={10} />),
			await pixels(<ProgressBar aria-label="Upload" value={90} />),
		]
		const slider = [
			await pixels(<Slider aria-label="Volume" value={10} />),
			await pixels(<Slider aria-label="Volume" value={90} />),
		]
		expect(bar[1]).not.toBe(bar[0])

		expect(slider[1]).not.toBe(slider[0])
	})

	it('inset focus: keyboard focus draws no outline', async () => {
		for (const name of Object.keys(insetStops) as (keyof typeof insetStops)[]) {
			expect((await focusOutline(name)).style).toBe('none')
		}
		for (const name of Object.keys(focusMarks) as (keyof typeof focusMarks)[]) {
			expect((await markOutline(name)).style, name).toBe('none')
		}
	})
})
