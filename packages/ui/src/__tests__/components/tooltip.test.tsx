import { describe, expect, it } from 'vitest'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { TooltipContext } from '../../components/tooltip/context'
import { notifyOverlaySignal } from '../../primitives/overlay'
import { act, bySlot, renderUI, screen, userEvent, waitFor } from '../helpers'

const noop = () => {}

function makeContext(overrides: { open?: boolean; interactive?: boolean } = {}) {
	return {
		open: overrides.open ?? true,
		interactive: overrides.interactive ?? false,
		enabled: true,
		setReference: noop,
		setFloating: noop,
		floatingStyles: {},
		getReferenceProps: () => ({}),
		getFloatingProps: () => ({}),
	}
}

describe('Tooltip', () => {
	it('renders with data-slot="tooltip-trigger"', () => {
		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const el = bySlot(container, 'tooltip-trigger')

		expect(el).toBeInTheDocument()
	})

	it('renders trigger content', () => {
		renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		expect(screen.getByText('Hover me')).toBeInTheDocument()
	})

	it('closes when an overlay opens', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Trigger</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = bySlot(container, 'tooltip-trigger')

		if (!trigger) throw new Error('trigger missing')

		await user.click(trigger)

		await waitFor(() => expect(screen.getByText('Tooltip text')).toBeInTheDocument())

		act(() => notifyOverlaySignal())

		expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
	})
})

describe('TooltipContent', () => {
	it('renders the floating panel when the tooltip context reports open=true', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true })}>
				<TooltipContent>Tip body</TooltipContent>
			</TooltipContext>,
		)

		expect(bySlot(container, 'tooltip-content')).toBeInTheDocument()

		expect(screen.getByText('Tip body')).toBeInTheDocument()
	})

	it('omits the floating panel when the tooltip is closed', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: false })}>
				<TooltipContent>Hidden</TooltipContent>
			</TooltipContext>,
		)

		expect(bySlot(container, 'tooltip-content')).not.toBeInTheDocument()
	})

	it('marks the open panel as pointer-events:auto when interactive=true', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true, interactive: true })}>
				<TooltipContent>Interactive</TooltipContent>
			</TooltipContext>,
		)

		const panel = bySlot(container, 'tooltip-content') as HTMLElement

		expect(panel).toBeInTheDocument()

		expect(panel.style.pointerEvents).toBe('auto')
	})

	it('marks the open panel as pointer-events:none when interactive=false', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true, interactive: false })}>
				<TooltipContent>Static</TooltipContent>
			</TooltipContext>,
		)

		const panel = bySlot(container, 'tooltip-content') as HTMLElement

		expect(panel.style.pointerEvents).toBe('none')
	})

	it('resolves the explicit size prop into the data-density attribute', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true })}>
				<TooltipContent size="lg">Big</TooltipContent>
			</TooltipContext>,
		)

		const panel = bySlot(container, 'tooltip-content') as HTMLElement

		expect(panel).toHaveAttribute('data-density', 'lg')
	})
})
