import { describe, expect, it } from 'vitest'
import { ProgressBar } from '../../components/progress'
import { LocaleProvider } from '../../providers/locale'
import { present, renderUI } from '../helpers'

const seats = [
	{ value: 214, color: 'blue', label: 'Democrats' },
	{ value: 203, color: 'red', label: 'Republicans', from: 'end' },
] as const

/** The box of an element that the test expects. */
function rect(box: DOMRect | undefined, name: string): DOMRect {
	if (!box) throw new Error(`expected the ${name}`)

	return box
}

function layout(container: HTMLElement) {
	const bar = present(container.querySelector<HTMLElement>('[data-slot=progress-bar]'), 'bar')

	const mark = present(container.querySelector<HTMLElement>('[data-slot=progress-mark]'), 'mark')

	const [first, , last] = [...(bar.firstElementChild?.children ?? [])].map((el) =>
		el.getBoundingClientRect(),
	)

	return {
		track: bar.getBoundingClientRect(),
		mark: mark.getBoundingClientRect(),
		first: rect(first, 'first segment'),
		last: rect(last, 'last segment'),
	}
}

/**
 * A segment from the start sits at the inline start, and a segment from the
 * end at the inline end. A mark stands at its value from the inline start and
 * past the track on each side, so the root does not clip it.
 */
describe('ProgressBar segments and marks (real browser)', () => {
	it.each(['ltr', 'rtl'] as const)('places the segments and the mark under %s', (dir) => {
		const { container } = renderUI(
			<LocaleProvider dir={dir}>
				<div style={{ width: 435 }}>
					<ProgressBar
						max={435}
						segments={[...seats]}
						marks={[{ value: 218, label: '218 to win' }]}
						aria-label="House seats"
					/>
				</div>
			</LocaleProvider>,
		)

		const { track, mark, first, last } = layout(container)

		const [start, end] = dir === 'ltr' ? [track.left, track.right] : [track.right, track.left]

		expect(Math.abs((dir === 'ltr' ? first.left : first.right) - start)).toBeLessThan(1)

		expect(Math.abs((dir === 'ltr' ? last.right : last.left) - end)).toBeLessThan(1)

		const center = (mark.left + mark.right) / 2

		const expected = start + (dir === 'ltr' ? 1 : -1) * 218

		expect(Math.abs(center - expected)).toBeLessThan(1.5)

		expect(mark.top).toBeLessThan(track.top - 4)

		expect(mark.bottom).toBeGreaterThan(track.bottom + 4)
	})

	it('keeps 2 px of track between segments that fill the bar', () => {
		const { container } = renderUI(
			<div style={{ width: 413 }}>
				<ProgressBar max={413} segments={[...seats]} aria-label="House seats" />
			</div>,
		)

		const bar = present(container.querySelector<HTMLElement>('[data-slot=progress-bar]'), 'bar')

		const [a, b] = [...(bar.firstElementChild?.children ?? [])].map((el) =>
			el.getBoundingClientRect(),
		)

		expect(rect(b, 'second segment').left - rect(a, 'first segment').right).toBeCloseTo(2, 0)
	})
})
