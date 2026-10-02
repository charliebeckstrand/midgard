import { describe, expect, it } from 'vitest'
import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	TimelineTimestamp,
	TimelineTitle,
} from '../../../components/timeline'
import { renderUI } from '../../helpers'

/**
 * A horizontal timeline in a narrow box keeps a minimum column width and
 * scrolls. Before, each item shrank to its longest word, so the titles broke
 * to one word for each line and the row never overflowed its `overflow-x-auto`
 * root (V59).
 */
describe('horizontal Timeline in a narrow box', () => {
	it('keeps each column at its minimum width and scrolls the row', () => {
		const { container } = renderUI(
			<div style={{ width: 320 }}>
				<Timeline orientation="horizontal">
					{['Project kicked off', 'Design completed', 'Beta released'].map((title) => (
						<TimelineItem key={title}>
							<TimelineTimestamp>Jan 2026</TimelineTimestamp>
							<TimelineTitle>{title}</TimelineTitle>
							<TimelineDescription>Initial planning and team assembly.</TimelineDescription>
						</TimelineItem>
					))}
				</Timeline>
			</div>,
		)

		const root = container.querySelector<HTMLElement>('[data-slot="timeline"]')

		const items = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="timeline-item"]'))

		expect(items).toHaveLength(3)

		// The minimum width is 12rem, at a 16px root font size.
		for (const item of items) expect(item.getBoundingClientRect().width).toBeGreaterThanOrEqual(192)

		expect(root?.scrollWidth).toBeGreaterThan(root?.clientWidth ?? 0)
	})
})
