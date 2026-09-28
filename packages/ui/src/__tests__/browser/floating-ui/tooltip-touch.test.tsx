import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { getSlot, renderUI, screen, waitFor } from '../../helpers'

/**
 * Tooltip `trigger` against the real floating engine. The jsdom and main
 * browser suites mock `@floating-ui/react`, and the mock has no hover, so the
 * pointer-type gate runs only here.
 *
 * A tap gives the pointer events of a touch, then the compatibility mouse
 * events and a click. A hover tooltip must ignore the tap. A click tooltip must
 * open on it.
 */

/** Dispatches the event sequence that a tap on `target` gives. @internal */
function tap(target: Element) {
	const touch = { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }

	target.dispatchEvent(new PointerEvent('pointerover', touch))
	target.dispatchEvent(new PointerEvent('pointerenter', { ...touch, bubbles: false }))
	target.dispatchEvent(new PointerEvent('pointerdown', touch))
	target.dispatchEvent(new PointerEvent('pointerup', touch))

	const mouse = { bubbles: true, cancelable: true }

	target.dispatchEvent(new MouseEvent('mouseover', mouse))
	target.dispatchEvent(new MouseEvent('mouseenter', { ...mouse, bubbles: false }))
	target.dispatchEvent(new MouseEvent('mousemove', mouse))
	target.dispatchEvent(new MouseEvent('mousedown', mouse))
	target.dispatchEvent(new MouseEvent('mouseup', mouse))
	target.dispatchEvent(new MouseEvent('click', mouse))
}

/** Waits two frames, past the open of a zero-delay tooltip. @internal */
function frames() {
	return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

describe('Tooltip trigger (real browser)', () => {
	it('does not open a hover tooltip on a tap', async () => {
		const { container } = renderUI(
			<Tooltip delay={0}>
				<TooltipTrigger>
					<button type="button">Toggle</button>
				</TooltipTrigger>
				<TooltipContent>Hide password</TooltipContent>
			</Tooltip>,
		)

		tap(getSlot(container, 'tooltip-trigger'))

		await frames()

		expect(screen.queryByText('Hide password')).not.toBeInTheDocument()
	})

	it('opens a hover tooltip on a mouse hover', async () => {
		const { container } = renderUI(
			<Tooltip delay={0}>
				<TooltipTrigger>
					<button type="button">Toggle</button>
				</TooltipTrigger>
				<TooltipContent>Hide password</TooltipContent>
			</Tooltip>,
		)

		await userEvent.hover(getSlot(container, 'tooltip-trigger'))

		await waitFor(() => expect(screen.getByText('Hide password')).toBeInTheDocument())
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

		tap(getSlot(container, 'tooltip-trigger'))

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
})
