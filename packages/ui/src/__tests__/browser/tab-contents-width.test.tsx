import { describe, expect, it } from 'vitest'
import {
	Tab,
	TabContent,
	TabContents,
	TabList,
	Tabs,
	type TabsOrientation,
} from '../../components/tabs'
import { present, renderUI, screen, waitFor } from '../helpers'

const SECTIONS = [
	{ value: 'short', text: 'Short text.' },
	{ value: 'long', text: 'A longer panel text that is much wider than the short one.' },
]

/**
 * A tab group in a host that fits its content, as the box of a docs example
 * does. The panels must not set the width of the group, or an animated switch
 * sets the container to the width of the incoming panel and the outgoing text
 * wraps at that width while it exits.
 */
function FitTabs({ orientation }: { orientation: TabsOrientation }) {
	return (
		<div style={{ width: 'max-content', minWidth: 240 }}>
			<SectionTabs orientation={orientation} />
		</div>
	)
}

/** Two panels whose texts differ in width. */
function SectionTabs({ orientation }: { orientation: TabsOrientation }) {
	return (
		<Tabs defaultValue="short" orientation={orientation}>
			<TabList aria-label="Sections">
				{SECTIONS.map((section) => (
					<Tab key={section.value} value={section.value}>
						{section.value}
					</Tab>
				))}
			</TabList>
			<TabContents data-testid="contents">
				{SECTIONS.map((section) => (
					<TabContent key={section.value} value={section.value}>
						{section.text}
					</TabContent>
				))}
			</TabContents>
		</Tabs>
	)
}

describe('TabContents width (real browser)', () => {
	it.each<TabsOrientation>(['horizontal', 'vertical'])(
		'keeps one width across a switch in a %s group that fits its content',
		async (orientation) => {
			renderUI(<FitTabs orientation={orientation} />)

			const contents = screen.getByTestId('contents')

			const before = contents.getBoundingClientRect().width

			expect(before).toBeGreaterThan(0)

			screen.getByRole('tab', { name: 'long' }).click()

			await waitFor(() =>
				expect(screen.getByRole('tab', { name: 'long' })).toHaveAttribute('data-current'),
			)

			await waitFor(() => expect(contents.querySelectorAll(':scope > *')).toHaveLength(1))

			expect(contents.getBoundingClientRect().width).toBe(before)
		},
	)

	it('gives a vertical group the width beside the list', () => {
		renderUI(
			<div style={{ width: 600 }}>
				<SectionTabs orientation="vertical" />
			</div>,
		)

		const contents = screen.getByTestId('contents')

		const group = present(contents.closest<HTMLElement>('[data-slot="tab-group"]'), 'tab group')

		const list = present(
			group.querySelector<HTMLElement>('[data-slot="tab-list-scroll"]'),
			'tab list scroller',
		)

		const gap = Number.parseFloat(getComputedStyle(group).columnGap)

		expect(contents.getBoundingClientRect().width).toBeCloseTo(
			group.getBoundingClientRect().width - list.getBoundingClientRect().width - gap,
			0,
		)
	})
})
