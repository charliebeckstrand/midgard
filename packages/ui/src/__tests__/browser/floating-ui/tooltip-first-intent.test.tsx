import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { loadTooltipBody, readTooltipBody } from '../../../components/tooltip/tooltip-body-loader'
import { getSlot, renderUI, screen, waitFor } from '../../helpers'
import { tooltipLoad } from '../../mocks/tooltip-body-loader'
import { pause } from '../helpers/wall-clock'

/**
 * The first intent on a tooltip trigger, before the state module loads. The
 * setup of the project holds the loader, and each case releases it. A hover, a keyboard focus,
 * or a click before the load must open the tooltip as it does after the load:
 * a hover after the same delay, a focus at once, and a click as a toggle.
 */

// The hold forgets the loaded module, so each case starts before the load.
// The last release leaves the module loaded for the files after this one.
beforeEach(() => tooltipLoad.hold())

afterAll(async () => {
	tooltipLoad.release()

	await loadTooltipBody()
})

/** Waits until the tooltip text is present. @internal */
async function expectOpen() {
	await waitFor(() => expect(screen.getByText('Tip')).toBeInTheDocument())
}

/** Waits for the load, the replay, and two frames, then expects no tooltip text. @internal */
async function expectClosed() {
	await waitFor(() => expect(readTooltipBody()).not.toBeNull())

	await pause(50)

	expect(screen.queryByText('Tip')).not.toBeInTheDocument()
}

describe('Tooltip first intent before the state loads (real browser)', () => {
	it('opens a hover at the end of the delay that started with the hover', async () => {
		const { container } = renderUI(
			<Tooltip delay={400}>
				<TooltipTrigger>
					<button type="button">Toggle</button>
				</TooltipTrigger>
				<TooltipContent>Tip</TooltipContent>
			</Tooltip>,
		)

		const trigger = getSlot(container, 'tooltip-trigger')

		// The delay starts at the pointerenter, not when the hover call returns.
		// The return comes after the round trip to the driver, so a clock that
		// starts there reads short.
		let start = Number.NaN

		trigger.addEventListener(
			'pointerenter',
			() => {
				start = performance.now()
			},
			{ once: true },
		)

		await userEvent.hover(trigger)

		expect(start).not.toBeNaN()

		await pause(200)

		tooltipLoad.release()

		await expectOpen()

		const elapsed = performance.now() - start

		// The load does not restart the delay: the open comes 400 ms after the
		// hover, not 400 ms after the load.
		expect(elapsed).toBeGreaterThanOrEqual(350)

		expect(elapsed).toBeLessThan(550)
	})

	it('opens a hover at once when the load ends after the delay', async () => {
		const { container } = renderUI(
			<Tooltip delay={50}>
				<TooltipTrigger>
					<button type="button">Toggle</button>
				</TooltipTrigger>
				<TooltipContent>Tip</TooltipContent>
			</Tooltip>,
		)

		await userEvent.hover(getSlot(container, 'tooltip-trigger'))

		await pause(150)

		tooltipLoad.release()

		await expectOpen()
	})

	it('does not open a hover that left the trigger before the load', async () => {
		const { container } = renderUI(
			<>
				<Tooltip delay={0}>
					<TooltipTrigger>
						<button type="button">Toggle</button>
					</TooltipTrigger>
					<TooltipContent>Tip</TooltipContent>
				</Tooltip>
				<p data-slot="outside">Elsewhere</p>
			</>,
		)

		await userEvent.hover(getSlot(container, 'tooltip-trigger'))

		await userEvent.hover(getSlot(container, 'outside'))

		tooltipLoad.release()

		await expectClosed()
	})

	it('opens a keyboard focus at once when the state loads', async () => {
		renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Toggle</button>
				</TooltipTrigger>
				<TooltipContent>Tip</TooltipContent>
			</Tooltip>,
		)

		await userEvent.keyboard('{Tab}')

		tooltipLoad.release()

		await expectOpen()
	})

	it('opens a click tooltip on a click, and keeps it shut after a second click', async () => {
		const { container } = renderUI(
			<Tooltip trigger="click">
				<TooltipTrigger>
					<button type="button">Toggle</button>
				</TooltipTrigger>
				<TooltipContent>Tip</TooltipContent>
			</Tooltip>,
		)

		const trigger = getSlot(container, 'tooltip-trigger')

		await userEvent.click(trigger)

		await userEvent.click(trigger)

		tooltipLoad.release()

		await expectClosed()

		await userEvent.click(trigger)

		await expectOpen()
	})

	it('opens a click tooltip that a click before the load opened', async () => {
		const { container } = renderUI(
			<Tooltip trigger="click">
				<TooltipTrigger>
					<button type="button">Toggle</button>
				</TooltipTrigger>
				<TooltipContent>Tip</TooltipContent>
			</Tooltip>,
		)

		await userEvent.click(getSlot(container, 'tooltip-trigger'))

		tooltipLoad.release()

		await expectOpen()
	})

	it('keeps a disabled trigger shut after a hover before the load', async () => {
		const { container } = renderUI(
			<fieldset disabled>
				<Tooltip delay={0}>
					<TooltipTrigger>
						<button type="button">Toggle</button>
					</TooltipTrigger>
					<TooltipContent>Tip</TooltipContent>
				</Tooltip>
			</fieldset>,
		)

		await userEvent.hover(getSlot(container, 'tooltip-trigger'))

		tooltipLoad.release()

		await expectClosed()
	})

	it('does not open a hover tooltip for a mouse click focus before the load', async () => {
		const { container } = renderUI(
			<>
				<Tooltip delay={0}>
					<TooltipTrigger>
						<button type="button">Toggle</button>
					</TooltipTrigger>
					<TooltipContent>Tip</TooltipContent>
				</Tooltip>
				<p data-slot="outside">Elsewhere</p>
			</>,
		)

		const trigger = getSlot(container, 'tooltip-trigger')

		// The click focuses the trigger without `:focus-visible`, and the pointer
		// then leaves. Neither the focus nor the hover is still an intent.
		await userEvent.click(trigger)

		await userEvent.hover(getSlot(container, 'outside'))

		expect(trigger).toHaveFocus()

		tooltipLoad.release()

		await expectClosed()
	})
})
