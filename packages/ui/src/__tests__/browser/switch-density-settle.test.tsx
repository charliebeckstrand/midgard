import { describe, expect, it } from 'vitest'
import { Switch } from '../../components/switch'
import { densitySteps } from '../../core/density'
import { present, renderUI } from '../helpers'

/**
 * The thumb of a checked switch settles with its track when the density changes.
 *
 * The checked thumb took a stepped `inset-inline-start`, and the thumb transitions that property.
 * A change of density changed the offset, so the thumb slid to its new place over the transition
 * while the track took its new width at once. The thumb now moves by a translate of its own width,
 * which is the same value at each step, so a change of density starts no transition.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('the thumb of a checked switch under a change of density (real browser)', () => {
	function render(checked: boolean, dir: 'ltr' | 'rtl' = 'ltr') {
		const { container } = renderUI(
			<div data-density="sm" dir={dir}>
				<Switch aria-label="Event log" checked={checked} onChange={() => {}} />
			</div>,
		)

		const scope = present(container.firstElementChild as HTMLElement | null, 'density scope')

		const track = present(scope.querySelector<HTMLElement>('[data-slot="control"]'), 'switch track')

		const thumb = present(scope.querySelector<HTMLElement>('[data-slot="switch-thumb"]'), 'thumb')

		return { scope, track, thumb }
	}

	/** The gap from each inline edge of the track to the thumb. */
	function gaps(track: HTMLElement, thumb: HTMLElement) {
		const t = track.getBoundingClientRect()

		const h = thumb.getBoundingClientRect()

		return { start: h.left - t.left, end: t.right - h.right }
	}

	it('keeps the thumb at the end of the track on the frame of the change', () => {
		const { scope, track, thumb } = render(true)

		for (const step of densitySteps) {
			scope.dataset.density = step

			expect(gaps(track, thumb).end, step).toBeCloseTo(4, 0)
		}
	})

	it('keeps the thumb at the inline end of a right-to-left track', () => {
		const { scope, track, thumb } = render(true, 'rtl')

		for (const step of densitySteps) {
			scope.dataset.density = step

			expect(gaps(track, thumb).start, step).toBeCloseTo(4, 0)
		}
	})

	it('keeps the thumb at the start of an unchecked track at each step', () => {
		const { scope, track, thumb } = render(false)

		for (const step of densitySteps) {
			scope.dataset.density = step

			expect(gaps(track, thumb).start, step).toBeCloseTo(4, 0)
		}
	})
})
