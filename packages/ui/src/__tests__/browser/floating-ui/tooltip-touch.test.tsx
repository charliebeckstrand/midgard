import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { frames, getSlot, renderUI, screen, waitFor } from '../../helpers'

/**
 * Tooltip `trigger` against the real floating engine. The jsdom and main
 * browser suites mock `@floating-ui/react`, and the mock has no hover, so the
 * pointer-type gate runs only here.
 *
 * A tap gives the pointer events of a touch, then the compatibility mouse
 * events and a click. iOS Safari sends them in this order. The compatibility
 * events move the emulated hover to the tapped element. A hover tooltip ignores
 * the tap and the compatibility events. A click tooltip opens on the click.
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
function renderHoverTooltip(onClick?: () => void) {
	const { container } = renderUI(
		<>
			<Tooltip delay={0}>
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
	it('does not open a hover tooltip on a tap, and keeps the click action of the trigger', async () => {
		const onClick = vi.fn()

		const { trigger } = renderHoverTooltip(onClick)

		await tap(trigger)

		await expectClosed()

		await tap(trigger, { hovered: true })

		await expectClosed()

		expect(onClick).toHaveBeenCalledTimes(2)
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

	it('opens a hover tooltip on a mouse hover', async () => {
		const { trigger } = renderHoverTooltip()

		await userEvent.hover(trigger)

		await expectOpen()
	})

	it('opens a hover tooltip on a mouse hover after a tap', async () => {
		const { trigger, outside } = renderHoverTooltip()

		await tap(trigger)

		await tap(outside, { from: trigger })

		await expectClosed()

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

	it('opens an interactive click tooltip on a tap after its panel became a dialog', async () => {
		const { container } = renderUI(
			<Tooltip trigger="click" interactive>
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
