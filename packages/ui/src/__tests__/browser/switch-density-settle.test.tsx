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
		const trackBox = track.getBoundingClientRect()

		const thumbBox = thumb.getBoundingClientRect()

		return { start: thumbBox.left - trackBox.left, end: trackBox.right - thumbBox.right }
	}

	it.for([
		['keeps the thumb at the end of the track on the frame of the change', true, 'ltr', 'end'],
		['keeps the thumb at the inline end of a right-to-left track', true, 'rtl', 'start'],
		['keeps the thumb at the start of an unchecked track at each step', false, 'ltr', 'start'],
	] as const)('%s', ([, checked, dir, edge]) => {
		const { scope, track, thumb } = render(checked, dir)

		for (const step of densitySteps) {
			scope.dataset.density = step

			expect(gaps(track, thumb)[edge], step).toBeCloseTo(4, 0)
		}
	})
})
