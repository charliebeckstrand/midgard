import type { ReactNode } from 'react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Toolbar } from '../../../components/toolbar'
import { Tooltip, TooltipContent, TooltipGroup, TooltipTrigger } from '../../../components/tooltip'
import { tooltipBody } from '../../../components/tooltip/tooltip-body-loader'
import { renderUI, screen } from '../../helpers'
import { tooltipLoad } from '../../mocks/tooltip-body-loader'
import { pause } from '../helpers/wall-clock'

/**
 * The open delay of the second tooltip. It is longer than each wait of the
 * case, so a second tooltip that the case finds opened with no delay.
 */
const LONG = 60_000

/** A button with a tooltip whose text is `<name> tip`. */
function Tip({ name, delay }: { name: string; delay: number }) {
	return (
		<Tooltip delay={delay}>
			<TooltipTrigger>
				<button type="button">{name}</button>
			</TooltipTrigger>
			<TooltipContent>{name} tip</TooltipContent>
		</Tooltip>
	)
}

/**
 * Bold opens at once on a hover, and Italic waits for {@link LONG}. The
 * paragraph `Away` sits apart from the buttons.
 */
function Tips({ group }: { group: (children: ReactNode) => ReactNode }) {
	return (
		<div className="flex flex-col items-start gap-20 p-10">
			{group(
				<>
					<Tip name="Bold" delay={0} />
					<Tip name="Italic" delay={LONG} />
				</>,
			)}
			<p>Away</p>
		</div>
	)
}

const button = (name: string) => screen.getByRole('button', { name })

/**
 * A `<TooltipGroup>` skips the open delay of a tooltip while a sibling is
 * open, and for the grace period after the sibling closes. The open sibling
 * closes at once.
 *
 * It runs in a real browser, because the test reads the hover of the real
 * floating engine, which the jsdom suites mock.
 */
describe('TooltipGroup (real browser)', () => {
	it('opens a sibling with no delay while a tooltip is open, and closes the open one', async () => {
		renderUI(<Tips group={(children) => <TooltipGroup>{children}</TooltipGroup>} />)

		await userEvent.hover(button('Bold'))

		await screen.findByText('Bold tip')

		await userEvent.hover(button('Italic'))

		await screen.findByText('Italic tip')

		// The handover closes Bold in the commit that opens Italic. A plain close
		// waits for the close delay of 100 ms.
		expect(screen.queryByText('Bold tip')).not.toBeInTheDocument()
	})

	it('opens a sibling with no delay when the tooltips mounted before the load', async () => {
		tooltipLoad.hold()

		// The release leaves the module loaded for the cases after this one.
		onTestFinished(async () => {
			tooltipLoad.release()

			await tooltipBody.load()
		})

		renderUI(<Tips group={(children) => <TooltipGroup>{children}</TooltipGroup>} />)

		await userEvent.hover(button('Bold'))

		tooltipLoad.release()

		await screen.findByText('Bold tip')

		// Italic has no state yet. Its state starts on this hover and replays it.
		await userEvent.hover(button('Italic'))

		expect(await screen.findByText('Italic tip')).toBeInTheDocument()

		expect(screen.queryByText('Bold tip')).not.toBeInTheDocument()
	})

	it('makes each Toolbar a group', async () => {
		renderUI(
			<Tips
				group={(children) => (
					<Toolbar aria-label="Format" className="w-fit">
						{children}
					</Toolbar>
				)}
			/>,
		)

		await userEvent.hover(button('Bold'))

		await screen.findByText('Bold tip')

		await userEvent.hover(button('Italic'))

		expect(await screen.findByText('Italic tip')).toBeInTheDocument()
	})

	it('opens a sibling with no delay in the grace period', async () => {
		renderUI(<Tips group={(children) => <TooltipGroup timeout={LONG}>{children}</TooltipGroup>} />)

		await userEvent.hover(button('Bold'))

		await screen.findByText('Bold tip')

		await userEvent.hover(screen.getByText('Away'))

		await expect.poll(() => screen.queryByText('Bold tip')).toBeNull()

		await userEvent.hover(button('Italic'))

		expect(await screen.findByText('Italic tip')).toBeInTheDocument()
	})

	it('waits for the delay again after the grace period', async () => {
		renderUI(<Tips group={(children) => <TooltipGroup timeout={20}>{children}</TooltipGroup>} />)

		await userEvent.hover(button('Bold'))

		await screen.findByText('Bold tip')

		await userEvent.hover(screen.getByText('Away'))

		await expect.poll(() => screen.queryByText('Bold tip')).toBeNull()

		// The grace period ends.
		await pause(100)

		await userEvent.hover(button('Italic'))

		await pause(300)

		expect(screen.queryByText('Italic tip')).not.toBeInTheDocument()
	})

	it('keeps the delay of each tooltip outside a group', async () => {
		renderUI(<Tips group={(children) => children} />)

		await userEvent.hover(button('Bold'))

		await screen.findByText('Bold tip')

		await userEvent.hover(button('Italic'))

		await pause(300)

		expect(screen.queryByText('Italic tip')).not.toBeInTheDocument()
	})
})
