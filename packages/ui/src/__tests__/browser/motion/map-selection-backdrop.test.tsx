import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Overlay } from '../../../primitives/overlay'
import { renderUI, screen } from '../../helpers'
import { categoricalPlat } from '../../helpers/map-plat'
import { sampleMotionFrames } from '../helpers/motion-frame'

/**
 * A pick that opens a panel selects the region in the commit of the open. The
 * backdrop then fades in from clear. A ring that painted in that commit showed
 * at full contrast for a frame, and then the backdrop dimmed it. The ring must
 * wait for the backdrop.
 *
 * Real Motion is necessary: the instant mock does not complete the fade of a
 * backdrop that mounts.
 */

/** A map, and a button that picks a region and opens an overlay over the map. */
function PickProbe() {
	const [picked, setPicked] = useState<string | null>(null)

	return (
		<>
			<button type="button" onClick={() => setPicked('B')}>
				Pick
			</button>

			{categoricalPlat({ selectedRegion: picked })}

			<Overlay open={picked !== null} onOpenChange={() => setPicked(null)}>
				<span>panel</span>
			</Overlay>
		</>
	)
}

/** The ring and the opacity of the backdrop on one frame. */
type Sample = { ring: boolean; backdrop: number | null }

const read = (): Sample => {
	const backdrop = document.querySelector('[data-slot="overlay-backdrop"]')

	return {
		ring: document.querySelector('[data-slot="map-region-selected"]') !== null,
		backdrop: backdrop === null ? null : Number(getComputedStyle(backdrop).opacity),
	}
}

describe('Map selection under an opening overlay', () => {
	it('rings the pick only once the backdrop is up', async () => {
		renderUI(<PickProbe />)

		const samples: Sample[] = []

		await sampleMotionFrames(
			() => {
				const sample = read()

				samples.push(sample)

				return sample
			},
			(sample) => sample.ring,
			{ during: () => userEvent.click(screen.getByRole('button', { name: 'Pick' })) },
		)

		// The backdrop faded in over frames, so the test saw the frames before its arrival.
		expect(samples.some((sample) => sample.backdrop !== null && sample.backdrop < 1)).toBe(true)

		// No frame showed the ring over a backdrop that was not up.
		expect(samples.filter((sample) => sample.ring).every((sample) => sample.backdrop === 1)).toBe(
			true,
		)
	})
})
