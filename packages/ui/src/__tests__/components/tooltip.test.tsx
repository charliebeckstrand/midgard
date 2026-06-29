import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { TooltipContext } from '../../components/tooltip/context'
import { notifyOverlaySignal } from '../../primitives/overlay'
import { act, bySlot, noop, renderUI, screen, userEvent, waitFor } from '../helpers'

function makeContext(overrides: { open?: boolean; interactive?: boolean } = {}) {
	return {
		open: overrides.open ?? true,
		interactive: overrides.interactive ?? false,
		enabled: true,
		setReference: noop,
		setFloating: noop,
		floatingStyles: {},
		getReferenceProps: () => ({}),
		// Mirrors floating-ui's contract: user props merge into the result.
		getFloatingProps: (userProps?: object) => ({ ...userProps }),
	}
}

describe('Tooltip', () => {
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

	it('clones the reference onto the child element instead of a wrapper', () => {
		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = bySlot(container, 'tooltip-trigger')

		// The trigger IS the button: no intermediate non-focusable <div>.
		expect(trigger?.tagName).toBe('BUTTON')

		expect(trigger).toHaveTextContent('Hover me')
	})

	it("preserves the child's own data-slot instead of overwriting it", () => {
		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button" data-slot="custom-trigger">
						Hover me
					</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		// A child that declares its own slot keeps it; only slotless children
		// fall back to the generic `tooltip-trigger` marker.
		expect(bySlot(container, 'custom-trigger')).toBeInTheDocument()

		expect(bySlot(container, 'tooltip-trigger')).not.toBeInTheDocument()
	})

	it('merges the floating ref with a ref already on the child', () => {
		const ref = createRef<HTMLButtonElement>()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button ref={ref} type="button">
						Hover me
					</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		expect(ref.current).toBe(bySlot(container, 'tooltip-trigger'))
	})

	it("composes the child's own onClick with the tooltip handlers", async () => {
		const onClick = vi.fn()

		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button" onClick={onClick}>
						Hover me
					</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		await user.click(bySlot(container, 'tooltip-trigger') as HTMLElement)

		expect(onClick).toHaveBeenCalledOnce()
	})

	it('puts the trigger in the keyboard tab order', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		await user.tab()

		// The trigger is the focusable element itself, not an unreachable wrapper.
		expect(bySlot(container, 'tooltip-trigger')).toHaveFocus()
	})

	it('opens on keyboard focus of the trigger', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		await user.tab()

		expect(bySlot(container, 'tooltip-trigger')).toHaveFocus()

		await waitFor(() => expect(screen.getByText('Tooltip text')).toBeInTheDocument())
	})

	it('describes the focusable trigger via the panel when open', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = bySlot(container, 'tooltip-trigger') as HTMLElement

		await user.click(trigger)

		await waitFor(() => expect(bySlot(container, 'tooltip-content')).toBeInTheDocument())

		const panel = bySlot(container, 'tooltip-content') as HTMLElement

		// The description relationship is anchored on the focusable trigger itself,
		// pointing at the role="tooltip" panel.
		expect(panel).toHaveAttribute('role', 'tooltip')

		expect(trigger.getAttribute('aria-describedby')).toBe(panel.getAttribute('id'))
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

	it('resolves the explicit size prop into the data-size attribute', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true })}>
				<TooltipContent size="lg">Big</TooltipContent>
			</TooltipContext>,
		)

		const panel = bySlot(container, 'tooltip-content') as HTMLElement

		expect(panel).toHaveAttribute('data-size', 'lg')
	})
})
