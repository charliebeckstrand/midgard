import type { ReactNode } from 'react'
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest'
import { page } from 'vitest/browser'
import { DatePicker, type DatePickerProps } from '../../../components/date-picker'
import {
	Popover,
	PopoverContent,
	type PopoverProps,
	PopoverTrigger,
} from '../../../components/popover'
import {
	Tooltip,
	TooltipContent,
	type TooltipProps,
	TooltipTrigger,
} from '../../../components/tooltip'
import type { FloatingPlacement } from '../../../hooks'
import { frames, getSlot, renderUI, screen } from '../../helpers'

/**
 * Popover, Tooltip, and DatePicker take the `<side>-auto` placements of Menu and
 * Listbox. The panel aligns to the edge of the trigger that is nearer to the
 * edge of the viewport. The alignment middleware runs only in the real floating
 * engine, because the jsdom suite mocks `@floating-ui/react`.
 */
describe('the auto alignment of Popover, Tooltip, and DatePicker (real floating engine)', () => {
	it('types placement as FloatingPlacement', () => {
		expectTypeOf<PopoverProps['placement']>().toEqualTypeOf<FloatingPlacement | undefined>()

		expectTypeOf<TooltipProps['placement']>().toEqualTypeOf<FloatingPlacement | undefined>()

		expectTypeOf<DatePickerProps['placement']>().toEqualTypeOf<FloatingPlacement | undefined>()
	})

	// The calendar of the DatePicker is wider than the default viewport allows
	// beside the inset.
	beforeAll(() => page.viewport(1024, 768))

	// The inset lets the panel fit at either alignment, so `flip` and `shift`
	// never change the alignment and only the auto alignment can.
	function renderRow(justify: 'flex-start' | 'flex-end', children: ReactNode) {
		return renderUI(
			<div style={{ display: 'flex', justifyContent: justify, padding: 160 }}>{children}</div>,
		)
	}

	async function edges(panelRole: 'dialog' | 'tooltip', reference: () => HTMLElement) {
		await frames()

		await frames()

		const trigger = reference().getBoundingClientRect()

		const panel = screen.getByRole(panelRole).getBoundingClientRect()

		return { trigger, panel }
	}

	const openButton = () => screen.getByRole('button', { name: 'Open' })

	const surfaces = [
		{
			name: 'Popover',
			role: 'dialog',
			reference: openButton,
			render: () => (
				<Popover placement="bottom-auto" defaultOpen>
					<PopoverTrigger>
						<button type="button">Open</button>
					</PopoverTrigger>

					<PopoverContent aria-label="Details">
						<div style={{ width: 200 }}>Panel</div>
					</PopoverContent>
				</Popover>
			),
		},
		{
			name: 'Tooltip',
			role: 'tooltip',
			reference: openButton,
			render: () => (
				<Tooltip placement="bottom-auto" open>
					<TooltipTrigger>
						<button type="button">Open</button>
					</TooltipTrigger>

					<TooltipContent>
						<div style={{ width: 200 }}>Panel</div>
					</TooltipContent>
				</Tooltip>
			),
		},
		{
			name: 'DatePicker',
			role: 'dialog',
			// The control wrapper of the trigger is the floating reference.
			reference: () => getSlot(document.body, 'control'),
			render: () => <DatePicker aria-label="Open" placement="bottom-auto" defaultOpen />,
		},
	] as const

	it.each(surfaces)(
		'aligns a $name panel to the end edge of a trigger on the right',
		async ({ role, reference, render }) => {
			renderRow('flex-end', render())

			const { trigger, panel } = await edges(role, reference)

			expect(panel.width).not.toBeCloseTo(trigger.width, 0)

			expect(panel.right).toBeCloseTo(trigger.right, 0)
		},
	)

	it.each(surfaces)(
		'aligns a $name panel to the start edge of a trigger on the left',
		async ({ role, reference, render }) => {
			renderRow('flex-start', render())

			const { trigger, panel } = await edges(role, reference)

			expect(panel.left).toBeCloseTo(trigger.left, 0)
		},
	)
})
