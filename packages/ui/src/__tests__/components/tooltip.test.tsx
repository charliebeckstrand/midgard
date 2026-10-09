import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { CardTitle } from '../../components/card'
import { HoldButton } from '../../components/hold-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { TooltipContext } from '../../components/tooltip/context'
import type { TooltipIntent } from '../../components/tooltip/tooltip-intent'
import { useTooltipState } from '../../components/tooltip/use-tooltip-state'
import { notifyOverlaySignal } from '../../primitives/overlay'
import { act, bySlot, getSlot, noop, renderUI, screen, setupUser, waitFor } from '../helpers'

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
		const user = setupUser()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Trigger</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = getSlot(container, 'tooltip-trigger')

		await user.click(trigger)

		expect(screen.getByText('Tooltip text')).toBeInTheDocument()

		act(() => notifyOverlaySignal())

		expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
	})

	it('reports both ends of the open state, whatever drove them', async () => {
		const user = setupUser()

		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Tooltip onOpenChange={onOpenChange}>
				<TooltipTrigger>
					<button type="button">Trigger</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = getSlot(container, 'tooltip-trigger')

		expect(onOpenChange).not.toHaveBeenCalled()

		// The floating-ui mock opens on focus, and a click focuses the trigger.
		await user.click(trigger)

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)

		// A close nothing in the consumer's hands drove: the shared overlay signal.
		act(() => notifyOverlaySignal())

		await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false))

		expect(onOpenChange).toHaveBeenCalledTimes(2)
	})

	it('keeps reporting the resolved state while open holds it open', async () => {
		const user = setupUser()

		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Tooltip open onOpenChange={onOpenChange}>
				<TooltipTrigger>
					<button type="button">Trigger</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		// Mounting already open is not a transition, so there is nothing to report yet —
		// the same contract the panel family's `onOpenChange` keeps.
		expect(onOpenChange).not.toHaveBeenCalled()

		const trigger = getSlot(container, 'tooltip-trigger')

		// `open` holds the disclosure controlled, so the interactions still call its
		// setter and `useControllable` still fires on every set. Reporting the resolved
		// state rather than that setter is what keeps a close the reader never saw — the
		// tooltip is still on screen — from being announced.
		await user.click(trigger)

		expect(screen.getByText('Tooltip text')).toBeInTheDocument()

		expect(onOpenChange).not.toHaveBeenCalled()
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

	it('wraps a non-element child in a span, which is valid in phrasing content', () => {
		const { container } = renderUI(
			<p>
				<Tooltip>
					<TooltipTrigger>Hover text</TooltipTrigger>
					<TooltipContent>Tooltip text</TooltipContent>
				</Tooltip>
			</p>,
		)

		// A `<div>` inside a `<p>` is invalid HTML.
		expect(getSlot(container, 'tooltip-trigger').tagName).toBe('SPAN')
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

	it.each([
		['button', <Button key="button">Hover me</Button>],
		['hold-button', <HoldButton key="hold-button">Hold me</HoldButton>],
		['card-title', <CardTitle key="card-title">Title</CardTitle>],
	])('keeps the %s anchor that a component child writes for itself', (slot, child) => {
		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>{child}</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		// The component writes its own anchor, so the trigger stamps no slot on it.
		expect(bySlot(container, slot)).toBeInTheDocument()

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

		const user = setupUser()

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

		await user.click(getSlot(container, 'tooltip-trigger'))

		expect(onClick).toHaveBeenCalledOnce()
	})

	it('opens on keyboard focus of the trigger', async () => {
		const user = setupUser()

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

		expect(screen.getByText('Tooltip text')).toBeInTheDocument()
	})

	it('describes the focusable trigger via the panel when open', async () => {
		const user = setupUser()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = getSlot(container, 'tooltip-trigger')

		await user.click(trigger)

		expect(bySlot(container, 'tooltip-content')).toBeInTheDocument()

		const panel = getSlot(container, 'tooltip-content')

		// The description relationship is anchored on the focusable trigger itself,
		// pointing at the role="tooltip" panel.
		expect(panel).toHaveAttribute('role', 'tooltip')

		expect(trigger.getAttribute('aria-describedby')).toBe(panel.getAttribute('id'))
	})

	it('holds open while open is set, then hands back to the interactions', async () => {
		function tip(open: boolean) {
			return (
				<Tooltip open={open}>
					<TooltipTrigger>
						<button type="button">Anchor</button>
					</TooltipTrigger>
					<TooltipContent>Tooltip text</TooltipContent>
				</Tooltip>
			)
		}

		const { rerender } = renderUI(tip(true))

		// Open with no hover, focus, or click — the reveal is programmatic.
		expect(screen.getByText('Tooltip text')).toBeInTheDocument()

		// Releasing it hands control back to the idle interactions, so it closes.
		rerender(tip(false))

		await waitFor(() => expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument())
	})

	it('opens on a click again after a hold is released', async () => {
		const user = setupUser()

		function tip(open: boolean) {
			return (
				<Tooltip open={open} trigger="click">
					<TooltipTrigger>
						<button type="button">Anchor</button>
					</TooltipTrigger>
					<TooltipContent>Tooltip text</TooltipContent>
				</Tooltip>
			)
		}

		const { rerender } = renderUI(tip(true))

		rerender(tip(false))

		await waitFor(() => expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument())

		await user.click(screen.getByRole('button', { name: 'Anchor' }))

		expect(await screen.findByText('Tooltip text')).toBeInTheDocument()
	})

	it('yields open to disabled', () => {
		renderUI(
			<Tooltip open disabled>
				<TooltipTrigger>
					<button type="button">Anchor</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		// A suppressed tooltip stays shut even when forced.
		expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
	})
})

describe('useTooltipState', () => {
	// The trigger can attach its node in the commit that mounts the state. A
	// child attaches its ref before the layout effects of its parent run, so the
	// replay that `setReference` calls must already hold the handler of that commit.
	it('replays the intent of a trigger that attaches in the commit that mounts the state', () => {
		const takeIntent = vi.fn(
			(): TooltipIntent => ({
				hover: null,
				focus: null,
				click: new MouseEvent('click'),
				reenabled: false,
			}),
		)

		let open = false

		function Harness() {
			const state = useTooltipState({ trigger: 'click', takeIntent })

			open = state.open

			return (
				<button type="button" ref={state.setReference}>
					Trigger
				</button>
			)
		}

		renderUI(<Harness />)

		expect(takeIntent).toHaveBeenCalledTimes(1)

		expect(open).toBe(true)
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

	it.each([
		[true, 'auto'],
		[false, 'none'],
	])(
		'marks the open panel with interactive=%s as pointer-events:%s',
		(interactive, pointerEvents) => {
			const { container } = renderUI(
				<TooltipContext value={makeContext({ open: true, interactive })}>
					<TooltipContent>Tip</TooltipContent>
				</TooltipContext>,
			)

			expect(getSlot(container, 'tooltip-content').style.pointerEvents).toBe(pointerEvents)
		},
	)

	it('makes the surface a density scope for an explicit size', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true })}>
				<TooltipContent size="lg">Big</TooltipContent>
			</TooltipContext>,
		)

		const panel = getSlot(container, 'tooltip-content')

		// The portal host writes the scope of the surface.
		expect(panel.closest('[data-slot="portal"]')).toHaveAttribute('data-density', 'lg')
	})
})
