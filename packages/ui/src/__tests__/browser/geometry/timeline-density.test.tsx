import { describe, expect, it } from 'vitest'
import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	TimelineTimestamp,
	TimelineTitle,
} from '../../../components/timeline'
import { DensityProvider } from '../../../providers/density'
import { present, renderUI } from '../../helpers'

/**
 * The item spacing and the text of a Timeline take the step of the nearest
 * density scope. Before, they kept one size at each step (V60). At `snug`
 * (`md`) the values are the values from before the change.
 */

type Density = 'compact' | 'snug' | 'loose'

const EXPECTED = {
	compact: { gap: 12, spacing: 24, title: 16, description: 14, timestamp: 12 },
	snug: { gap: 16, spacing: 32, title: 18, description: 16, timestamp: 14 },
	loose: { gap: 20, spacing: 40, title: 20, description: 18, timestamp: 16 },
} as const

function measure(density: Density, orientation: 'vertical' | 'horizontal' = 'vertical') {
	const { container } = renderUI(
		<DensityProvider density={density}>
			<Timeline orientation={orientation}>
				{['Project kicked off', 'Beta released'].map((title) => (
					<TimelineItem key={title}>
						<TimelineTitle>{title}</TimelineTitle>
						<TimelineDescription>Initial planning.</TimelineDescription>
						<TimelineTimestamp>Jan 2026</TimelineTimestamp>
					</TimelineItem>
				))}
			</Timeline>
		</DensityProvider>,
	)

	const item = present(container.querySelector('[data-slot="timeline-item"]'), 'the first item')

	const fontOf = (selector: string) =>
		Number.parseFloat(getComputedStyle(present(item.querySelector(selector), selector)).fontSize)

	const style = getComputedStyle(item)

	return {
		gap: Number.parseFloat(style.columnGap),
		spacing: Number.parseFloat(orientation === 'vertical' ? style.paddingBottom : style.paddingTop),
		title: fontOf('[data-slot="timeline-title"]'),
		description: fontOf('[data-slot="timeline-description"]'),
		timestamp: fontOf('[data-slot="timeline-timestamp"]'),
	}
}

describe('Timeline density', () => {
	it.each(['compact', 'snug', 'loose'] as const)(
		'sizes the spacing and the text at the step of a %s provider',
		(density) => {
			expect(measure(density)).toEqual(EXPECTED[density])
		},
	)

	it('keeps no spacing below the last item at a loose provider', () => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<Timeline>
					<TimelineItem>
						<TimelineTitle>Project kicked off</TimelineTitle>
					</TimelineItem>
					<TimelineItem>
						<TimelineTitle>Beta released</TimelineTitle>
					</TimelineItem>
				</Timeline>
			</DensityProvider>,
		)

		const last = present(
			container.querySelector('[data-slot="timeline-item"]:last-child'),
			'the last item',
		)

		expect(getComputedStyle(last).paddingBottom).toBe('0px')
	})

	it.each(['compact', 'snug', 'loose'] as const)(
		'pads a horizontal item at the step of a %s provider',
		(density) => {
			expect(measure(density, 'horizontal').spacing).toBe(EXPECTED[density].spacing)
		},
	)
})
