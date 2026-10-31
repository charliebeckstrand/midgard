import type { ComponentProps } from 'react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { tooltipBody } from '../../../components/tooltip/tooltip-body-loader'
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

	await tooltipBody.load()
})

/** Waits until the tooltip text is present. @internal */
const expectOpen = vi.defineHelper(async () => {
	await waitFor(() => expect(screen.getByText('Tip')).toBeInTheDocument())
})

/** Waits for the load, the replay, and two frames, then expects no tooltip text. @internal */
const expectClosed = vi.defineHelper(async () => {
	await waitFor(() => expect(tooltipBody.read()).not.toBeNull())

	await pause(50)

	expect(screen.queryByText('Tip')).not.toBeInTheDocument()
})

/** The props of the tooltip that a case can set. */
type TipProps = Pick<ComponentProps<typeof Tooltip>, 'delay' | 'trigger' | 'onOpenChange'>

/** A tooltip with the text `Tip` on a `Toggle` button. */
function Tip(props: TipProps) {
	return (
		<Tooltip {...props}>
			<TooltipTrigger>
				<button type="button">Toggle</button>
			</TooltipTrigger>
			<TooltipContent>Tip</TooltipContent>
		</Tooltip>
	)
}

/**
 * Renders a {@link Tip}.
 *
 * @param props - The props of the tooltip.
 * @param options - `outside` adds a paragraph with the slot `outside` after the tooltip.
 * `disabled` puts the tooltip in a disabled fieldset.
 * @returns The render result.
 */
function renderTip(
	props: TipProps = {},
	{ outside = false, disabled = false }: { outside?: boolean; disabled?: boolean } = {},
) {
	const tip = disabled ? (
		<fieldset disabled>
			<Tip {...props} />
		</fieldset>
	) : (
		<Tip {...props} />
	)

	return renderUI(
		<>
			{tip}
			{outside && <p data-slot="outside">Elsewhere</p>}
		</>,
	)
}

describe('Tooltip first intent before the state loads (real browser)', () => {
	it('opens a hover at the end of the delay that started with the hover', async () => {
		const delay = 400

		// The time of the open comes from the open itself, not from the wait
		// that sees the text, so the render and the poll do not add to it.
		let opened = Number.NaN

		const { container } = renderTip({
			delay,
			onOpenChange: (open) => {
				if (open) opened = performance.now()
			},
		})

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

		const released = performance.now()

		tooltipLoad.release()

		await expectOpen()

		// The load does not skip the delay: the open comes at the end of the
		// delay from the hover, or at the load if the delay ended before it.
		// The trigger and the case read the clock in separate listeners, and the
		// clock is coarse, so this bound keeps a margin.
		expect(opened - start).toBeGreaterThanOrEqual(delay - 50)

		// The load does not restart the delay, which would open one full delay
		// after the release. This bound counts from the release, not from the
		// hover. On a busy runner, the hover call can return late and move the
		// release past the end of the delay.
		expect(opened - released).toBeLessThan(delay)
	})

	it('opens a hover at once when the load ends after the delay', async () => {
		const { container } = renderTip({ delay: 50 })

		await userEvent.hover(getSlot(container, 'tooltip-trigger'))

		await pause(150)

		tooltipLoad.release()

		await expectOpen()
	})

	it('does not open a hover that left the trigger before the load', async () => {
		const { container } = renderTip({ delay: 0 }, { outside: true })

		await userEvent.hover(getSlot(container, 'tooltip-trigger'))

		await userEvent.hover(getSlot(container, 'outside'))

		tooltipLoad.release()

		await expectClosed()
	})

	it('opens a keyboard focus at once when the state loads', async () => {
		renderTip()

		await userEvent.keyboard('{Tab}')

		tooltipLoad.release()

		await expectOpen()
	})

	it('keeps a keyboard focus shut that Escape dismissed before the load', async () => {
		renderTip()

		await userEvent.keyboard('{Tab}')

		await userEvent.keyboard('{Escape}')

		tooltipLoad.release()

		await expectClosed()
	})

	it('opens a click tooltip on a click, and keeps it shut after a second click', async () => {
		const { container } = renderTip({ trigger: 'click' })

		const trigger = getSlot(container, 'tooltip-trigger')

		await userEvent.click(trigger)

		await userEvent.click(trigger)

		tooltipLoad.release()

		await expectClosed()

		await userEvent.click(trigger)

		await expectOpen()
	})

	it('opens a click tooltip that a click before the load opened', async () => {
		const { container } = renderTip({ trigger: 'click' })

		await userEvent.click(getSlot(container, 'tooltip-trigger'))

		tooltipLoad.release()

		await expectOpen()
	})

	it('keeps a disabled trigger shut after a hover before the load', async () => {
		const { container } = renderTip({ delay: 0 }, { disabled: true })

		await userEvent.hover(getSlot(container, 'tooltip-trigger'))

		tooltipLoad.release()

		await expectClosed()
	})

	it('does not open a hover tooltip for a mouse click focus before the load', async () => {
		const { container } = renderTip({ delay: 0 }, { outside: true })

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
