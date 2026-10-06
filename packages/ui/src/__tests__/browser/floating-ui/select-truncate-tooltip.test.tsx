import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { bySlot, frames, present, renderUI, screen } from '../../helpers'
import { once } from '../helpers/signals'
import { pause } from '../helpers/wall-clock'

const LONG = 'awaiting approval from finance'

const SHORT = 'shipped'

type Case = {
	name: string
	/** The element the pointer rests on. */
	slot: string
	render: (value: string, truncateTooltip: boolean) => ReactElement
}

const cases: Case[] = [
	{
		name: 'Combobox',
		slot: 'combobox-input',
		render: (value, truncateTooltip) => (
			<Combobox
				aria-label="Stage"
				defaultValue={value}
				displayValue={(v: string) => v}
				truncateTooltip={truncateTooltip}
			>
				<ComboboxOption value={value}>
					<ComboboxLabel>{value}</ComboboxLabel>
				</ComboboxOption>
			</Combobox>
		),
	},
	{
		name: 'Listbox',
		slot: 'listbox-button',
		render: (value, truncateTooltip) => (
			<Listbox
				aria-label="Stage"
				defaultValue={value}
				displayValue={(v: string) => v}
				truncateTooltip={truncateTooltip}
			>
				<ListboxOption value={value}>
					<ListboxLabel>{value}</ListboxLabel>
				</ListboxOption>
			</Listbox>
		),
	},
	{
		name: 'Select',
		slot: 'listbox-button',
		render: (value, truncateTooltip) => (
			<Select
				aria-label="Stage"
				defaultValue={value}
				displayValue={(v: string) => v}
				truncateTooltip={truncateTooltip}
			>
				<SelectOption value={value}>
					<SelectLabel>{value}</SelectLabel>
				</SelectOption>
			</Select>
		),
	},
]

/**
 * Waits past the 250 ms hover delay of the tooltip, with no pointer leave to
 * cancel it. Returns the open tooltip, or `null`.
 */
async function tooltipAfterHover(): Promise<HTMLElement | null> {
	await pause(400)

	return screen.queryByRole('tooltip')
}

/**
 * The truncation tooltip of the select family, against the real floating engine and
 * the real layout. The tooltip opens only while the trigger truncates its value.
 * jsdom has no layout, so a value there never truncates.
 */
describe.each(cases)('$name truncateTooltip (real browser)', ({ slot, render }) => {
	function mount(value: string, truncateTooltip: boolean) {
		const { container } = renderUI(
			<div style={{ width: 160 }}>{render(value, truncateTooltip)}</div>,
		)

		return present(bySlot(container, slot), slot)
	}

	it('shows the whole value on hover while the value truncates', async () => {
		await userEvent.hover(mount(LONG, true))

		const tooltip = await screen.findByRole('tooltip')

		expect(tooltip.textContent?.toLowerCase()).toBe(LONG)
	})

	it('shows no tooltip on a tap, which opens the panel', async () => {
		const control = mount(LONG, true)

		const target = bySlot(control, 'tooltip-trigger') ?? control

		const touch = { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }

		target.dispatchEvent(new PointerEvent('pointerdown', touch))
		target.dispatchEvent(new PointerEvent('pointerup', touch))

		// No flash: the lift does not open the tooltip before the click opens the panel.
		await frames()

		expect(screen.queryByRole('tooltip')).toBeNull()

		target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

		await frames()

		expect(screen.queryByRole('tooltip')).toBeNull()
	})

	it('shows no tooltip for a value that fits', async () => {
		await userEvent.hover(mount(SHORT, true))

		expect(await tooltipAfterHover()).toBeNull()
	})

	it('shows no tooltip without the prop', async () => {
		await userEvent.hover(mount(LONG, false))

		expect(await tooltipAfterHover()).toBeNull()
	})
})

/**
 * A text input scrolls on a sideways wheel also when it does not have focus.
 * The truncated value then shows its middle and blank space past its end.
 */
describe('Combobox resting value (real browser)', () => {
	function mount() {
		const { container } = renderUI(
			<div style={{ width: 160 }}>{cases[0]?.render(LONG, false)}</div>,
		)

		return present(
			bySlot(container, 'combobox-input'),
			'combobox-input',
		) as unknown as HTMLInputElement
	}

	it('does not scroll sideways while the input does not have focus', async () => {
		const input = mount()

		expect(input.scrollWidth).toBeGreaterThan(input.clientWidth)

		input.scrollLeft = 60

		await expect.poll(() => input.scrollLeft).toBe(0)
	})

	it('keeps the scroll of a focused input, where the caret moves the text', async () => {
		const input = mount()

		input.focus()

		const scrolled = once(input, 'scroll')

		input.scrollLeft = 60

		// A reset answers the scroll, so the hold starts at the scroll.
		await scrolled

		await pause(100)

		expect(input.scrollLeft).toBeGreaterThan(0)
	})

	it('opens no truncation tooltip while the panel is open', async () => {
		const { container } = renderUI(<div style={{ width: 160 }}>{cases[0]?.render(LONG, true)}</div>)

		const input = present(bySlot(container, 'combobox-input'), 'combobox-input')

		await userEvent.click(input)

		await expect.poll(() => input.getAttribute('aria-expanded')).toBe('true')

		expect(await tooltipAfterHover()).toBeNull()
	})
})
