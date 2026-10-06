import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
	Tooltip,
	TooltipContent,
	type TooltipProps,
	TooltipTrigger,
} from '../../../components/tooltip'
import { frames, getSlot, renderUI, screen, waitFor } from '../../helpers'

/**
 * Tooltip `trigger` against the real floating engine. The jsdom and main
 * browser suites mock `@floating-ui/react`, and the mock has no hover, so the
 * pointer-type gate runs only here.
 *
 * A tap gives the pointer events of a touch, then the compatibility mouse
 * events and a click. iOS Safari sends them in this order. The compatibility
 * events move the emulated hover to the tapped element. A hover tooltip opens
 * on the touch press and ignores the compatibility events. A click tooltip
 * opens on the click.
 */

const TOUCH = { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }

const MOUSE = { bubbles: true, cancelable: true }

/**
 * Dispatches the event sequence that a tap on `target` gives. When the emulated
 * hover is already on `target`, iOS sends no `mouseover` and no `mouseenter`.
 * When the emulated hover moves from `from`, iOS sends `mouseout` and
 * `mouseleave` to `from` first.
 *
 * A device sends the compatibility mouse events after the lift, in a later
 * task. The effects of the render that the press caused run before them. The
 * helper waits two frames between the two parts to keep that order.
 * @internal
 */
async function tap(
	target: Element,
	{ hovered = false, from }: { hovered?: boolean; from?: Element } = {},
) {
	target.dispatchEvent(new PointerEvent('pointerover', TOUCH))
	target.dispatchEvent(new PointerEvent('pointerenter', { ...TOUCH, bubbles: false }))
	target.dispatchEvent(new PointerEvent('pointerdown', TOUCH))
	target.dispatchEvent(new PointerEvent('pointerup', TOUCH))
	target.dispatchEvent(new PointerEvent('pointerout', TOUCH))
	target.dispatchEvent(new PointerEvent('pointerleave', { ...TOUCH, bubbles: false }))

	await frames()

	if (from) {
		from.dispatchEvent(new MouseEvent('mouseout', { ...MOUSE, relatedTarget: target }))
		from.dispatchEvent(
			new MouseEvent('mouseleave', { ...MOUSE, bubbles: false, relatedTarget: target }),
		)
	}

	if (!hovered) {
		target.dispatchEvent(new MouseEvent('mouseover', MOUSE))
		target.dispatchEvent(new MouseEvent('mouseenter', { ...MOUSE, bubbles: false }))
	}

	target.dispatchEvent(new MouseEvent('mousemove', MOUSE))
	target.dispatchEvent(new MouseEvent('mousedown', MOUSE))
	target.dispatchEvent(new MouseEvent('mouseup', MOUSE))
	target.dispatchEvent(new MouseEvent('click', MOUSE))
}

/** Renders a hover tooltip with no open delay, and gives its trigger. @internal */
function renderHoverTooltip(onClick?: () => void, trigger?: TooltipProps['trigger']) {
	const { container } = renderUI(
		<>
			<Tooltip delay={0} trigger={trigger}>
				<TooltipTrigger>
					<button type="button" onClick={onClick}>
						Toggle
					</button>
				</TooltipTrigger>
				<TooltipContent>Hide password</TooltipContent>
			</Tooltip>
			<p data-slot="outside">Elsewhere</p>
		</>,
	)

	return { trigger: getSlot(container, 'tooltip-trigger'), outside: getSlot(container, 'outside') }
}

/** Waits until the tooltip text is present. @internal */
async function expectOpen() {
	await waitFor(() => expect(screen.getByText('Hide password')).toBeInTheDocument())
}

/** Waits two frames, then expects no tooltip text. @internal */
async function expectClosed() {
	await frames()

	expect(screen.queryByText('Hide password')).not.toBeInTheDocument()
}

describe('Tooltip trigger (real browser)', () => {
	it('opens a hover tooltip on a tap', async () => {
		const { trigger } = renderHoverTooltip()

		await tap(trigger)

		await expectOpen()
	})

	it('keeps the click action of the trigger when a tap opens the tooltip', async () => {
		const onClick = vi.fn()

		const { trigger } = renderHoverTooltip(onClick)

		await tap(trigger)

		await expectOpen()

		expect(onClick).toHaveBeenCalledTimes(1)
	})

	it('closes a tapped tooltip on a second tap, and the mouse events of the tap do not open it again', async () => {
		const { trigger } = renderHoverTooltip()

		await tap(trigger)

		await expectOpen()

		await tap(trigger, { hovered: true })

		await expectClosed()

		await expectClosed()
	})

	it('closes a tapped tooltip on a tap outside', async () => {
		const { trigger, outside } = renderHoverTooltip()

		await tap(trigger)

		await expectOpen()

		await tap(outside, { from: trigger })

		await expectClosed()
	})

	it('closes a tapped tooltip on a scroll of an ancestor', async () => {
		const { container } = renderUI(
			<div data-slot="scroller" style={{ maxHeight: 120, overflow: 'auto' }}>
				<div style={{ paddingTop: 60, height: 480 }}>
					<Tooltip delay={0}>
						<TooltipTrigger>
							<button type="button">Toggle</button>
						</TooltipTrigger>
						<TooltipContent>Hide password</TooltipContent>
					</Tooltip>
				</div>
			</div>,
		)

		await tap(getSlot(container, 'tooltip-trigger'))

		await expectOpen()

		getSlot(container, 'scroller').scrollTop = 40

		await expectClosed()
	})

	it('keeps a hovered tooltip open on a scroll of an ancestor', async () => {
		const { container } = renderUI(
			<div data-slot="scroller" style={{ maxHeight: 120, overflow: 'auto' }}>
				<div style={{ paddingTop: 60, height: 480 }}>
					<Tooltip delay={0}>
						<TooltipTrigger>
							<button type="button">Toggle</button>
						</TooltipTrigger>
						<TooltipContent>Hide password</TooltipContent>
					</Tooltip>
				</div>
			</div>,
		)

		await userEvent.hover(getSlot(container, 'tooltip-trigger'))

		await expectOpen()

		getSlot(container, 'scroller').scrollTop = 4

		await frames()

		expect(screen.getByText('Hide password')).toBeInTheDocument()
	})

	it('closes a tapped tooltip on Escape', async () => {
		const { trigger } = renderHoverTooltip()

		await tap(trigger)

		await expectOpen()

		await userEvent.keyboard('{Escape}')

		await expectClosed()
	})

	it('opens a hover tooltip on a mouse hover', async () => {
		const { trigger } = renderHoverTooltip()

		await userEvent.hover(trigger)

		await expectOpen()
	})

	it('opens a hover tooltip on a mouse hover after a tap closed it', async () => {
		const { trigger, outside } = renderHoverTooltip()

		await tap(trigger)

		await expectOpen()

		await tap(outside, { from: trigger })

		await expectClosed()

		await userEvent.hover(trigger)

		await expectOpen()
	})

	it('does not open a hover-only tooltip on a tap, and keeps the click action', async () => {
		const onClick = vi.fn()

		const { trigger } = renderHoverTooltip(onClick, 'hover-only')

		await tap(trigger)

		await expectClosed()

		await tap(trigger, { hovered: true })

		await expectClosed()

		expect(onClick).toHaveBeenCalledTimes(2)
	})

	it('opens a hover-only tooltip on a mouse hover', async () => {
		const { trigger } = renderHoverTooltip(undefined, 'hover-only')

		await userEvent.hover(trigger)

		await expectOpen()
	})

	it('opens a click tooltip on a tap', async () => {
		const { container } = renderUI(
			<Tooltip trigger="click">
				<TooltipTrigger>
					<button type="button">About</button>
				</TooltipTrigger>
				<TooltipContent>Filled from the search.</TooltipContent>
			</Tooltip>,
		)

		await tap(getSlot(container, 'tooltip-trigger'))

		await waitFor(() => expect(screen.getByText('Filled from the search.')).toBeInTheDocument())
	})

	it('does not open a click tooltip on a mouse hover', async () => {
		const { container } = renderUI(
			<Tooltip trigger="click" delay={0}>
				<TooltipTrigger>
					<button type="button">About</button>
				</TooltipTrigger>
				<TooltipContent>Filled from the search.</TooltipContent>
			</Tooltip>,
		)

		await userEvent.hover(getSlot(container, 'tooltip-trigger'))

		await frames()

		expect(screen.queryByText('Filled from the search.')).not.toBeInTheDocument()
	})

	it('opens either trigger on keyboard focus', async () => {
		renderUI(
			<>
				<Tooltip>
					<TooltipTrigger>
						<button type="button">Toggle</button>
					</TooltipTrigger>
					<TooltipContent>Hide password</TooltipContent>
				</Tooltip>
				<Tooltip trigger="click">
					<TooltipTrigger>
						<button type="button">About</button>
					</TooltipTrigger>
					<TooltipContent>Filled from the search.</TooltipContent>
				</Tooltip>
			</>,
		)

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(screen.getByText('Hide password')).toBeInTheDocument())

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(screen.getByText('Filled from the search.')).toBeInTheDocument())
	})

	it('does not open a hover tooltip on a touch press that the browser takes for a scroll', async () => {
		const { trigger } = renderHoverTooltip()

		trigger.dispatchEvent(new PointerEvent('pointerover', TOUCH))
		trigger.dispatchEvent(new PointerEvent('pointerenter', { ...TOUCH, bubbles: false }))
		trigger.dispatchEvent(new PointerEvent('pointerdown', TOUCH))

		// No flash: the press alone does not open the tooltip.
		await expectClosed()

		trigger.dispatchEvent(new PointerEvent('pointercancel', TOUCH))
		trigger.dispatchEvent(new PointerEvent('pointerout', TOUCH))
		trigger.dispatchEvent(new PointerEvent('pointerleave', { ...TOUCH, bubbles: false }))

		await expectClosed()
	})

	it('does not open on the lift of a different pointer', async () => {
		const { trigger } = renderHoverTooltip()

		trigger.dispatchEvent(new PointerEvent('pointerdown', { ...TOUCH, pointerId: 2 }))
		trigger.dispatchEvent(new PointerEvent('pointercancel', { ...TOUCH, pointerId: 2 }))
		trigger.dispatchEvent(new PointerEvent('pointerup', { ...TOUCH, pointerId: 3 }))

		await expectClosed()
	})

	it('does not open on a tap inside a control that opens a popup, and opens on a mouse hover', async () => {
		const { container } = renderUI(
			<button type="button" aria-haspopup="listbox" aria-expanded={false}>
				<Tooltip delay={0}>
					<TooltipTrigger>Hide password</TooltipTrigger>
					<TooltipContent>Hide password</TooltipContent>
				</Tooltip>
			</button>,
		)

		const trigger = getSlot(container, 'tooltip-trigger')

		await tap(trigger)

		await frames()

		expect(screen.queryAllByText('Hide password')).toHaveLength(1)

		await userEvent.hover(trigger)

		await waitFor(() => expect(screen.getAllByText('Hide password')).toHaveLength(2))
	})

	it('opens an interactive tooltip on a tap after its panel became a dialog', async () => {
		const { container } = renderUI(
			<Tooltip delay={0} interactive>
				<TooltipTrigger>
					<button type="button">Details</button>
				</TooltipTrigger>
				<TooltipContent>
					<button type="button">Learn more</button>
				</TooltipContent>
			</Tooltip>,
		)

		const trigger = getSlot(container, 'tooltip-trigger')

		await tap(trigger)

		await waitFor(() => expect(trigger).toHaveAttribute('aria-haspopup', 'dialog'))

		await tap(trigger, { hovered: true })

		await waitFor(() => expect(screen.queryByText('Learn more')).not.toBeInTheDocument())

		await tap(trigger, { hovered: true })

		await waitFor(() => expect(screen.getByText('Learn more')).toBeInTheDocument())
	})
})
