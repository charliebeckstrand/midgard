import { describe, expect, it } from 'vitest'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteGroup,
	CommandPaletteHeading,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteText,
} from '../../../components/command-palette'
import { allBySlot, getSlot, noop, present, renderUI } from '../../helpers'

/**
 * Command palette heading space (real layout). Each group heading must have the
 * same space above it. The first heading sits below the search input, across
 * the `gap-4` of the panel. A later heading sits below the last row of the
 * group before it. jsdom lays nothing out, so only a real browser can compare
 * the two.
 */
describe('Command palette heading space (real browser)', () => {
	function row(label: string, description: string) {
		return (
			<CommandPaletteItem>
				<CommandPaletteText>
					<CommandPaletteLabel>{label}</CommandPaletteLabel>
					<CommandPaletteDescription>{description}</CommandPaletteDescription>
				</CommandPaletteText>
			</CommandPaletteItem>
		)
	}

	it('puts the same space above each group heading', () => {
		renderUI(
			<CommandPalette open onOpenChange={noop}>
				<CommandPaletteGroup>
					<CommandPaletteHeading>Places</CommandPaletteHeading>
					{row("Stella's Ice Cream", 'Sherwood, Oregon')}
				</CommandPaletteGroup>
				<CommandPaletteGroup>
					<CommandPaletteHeading>Go to</CommandPaletteHeading>
					{row('Taiwan', 'Country')}
					{row('Texas', 'US state')}
				</CommandPaletteGroup>
			</CommandPalette>,
		)

		const input = getSlot(document.body, 'command-palette-input')

		const titles = allBySlot(document.body, 'command-palette-heading')

		expect(titles).toHaveLength(2)

		const first = present(titles[0], 'the first heading')

		const second = present(titles[1], 'the second heading')

		const lastRowOfFirstGroup = present(
			first.parentElement?.lastElementChild,
			'the last row of the first group',
		)

		const above = (element: Element, previous: Element) =>
			element.getBoundingClientRect().top - previous.getBoundingClientRect().bottom

		const spaceAboveFirst = above(first, input)

		expect(spaceAboveFirst).toBeGreaterThan(0)

		expect(above(second, lastRowOfFirstGroup)).toBe(spaceAboveFirst)
	})
})
