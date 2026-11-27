import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	onTestFinished,
	vi,
} from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { tooltipBody } from '../../../components/tooltip/tooltip-body-loader'
import { BarChart } from '../../../modules/chart'
import { renderUI, screen, waitFor } from '../../helpers'
import { tooltipLoad } from '../../mocks/tooltip-body-loader'
import { pause } from '../helpers/wall-clock'

/**
 * A tooltip trigger that is an SVG element does not become a Tab stop.
 *
 * Blink makes an SVG element focusable when it has a focus event listener of
 * its own. When the trigger listened for `focusin` and `focusout` on its node,
 * Tab stopped on an SVG `<g>` that has no `tabindex`. When the tooltip state
 * took over and removed those listeners, the focused `<g>` lost its focus to
 * `body`. On a chart with a reference line, this gave two Tab presses with no
 * indicator, inside an `aria-hidden` plot, and a stray tooltip.
 *
 * The case is specific to Chromium. Firefox and WebKit do not make an SVG
 * element focusable for a listener, and the cases pass there too. The file
 * uses the real floating engine, because the bug needs the tooltip state to
 * take over the trigger, and real key presses, because a Tab simulation does
 * not use the focus rules of the engine. Each case holds the load of the
 * tooltip state, so that the tooltip mounts in its first state, as a tooltip
 * on a page does before the idle load. The case releases the load after the
 * Tab, which is when the focus dropped.
 */

beforeEach(() => tooltipLoad.hold())

// The last release leaves the module loaded for the files after this one.
afterAll(async () => {
	tooltipLoad.release()

	await tooltipBody.load()
})

/** Releases the load of the tooltip state, and waits for the load and two frames. */
async function releaseLoad() {
	tooltipLoad.release()

	await tooltipBody.load()

	await pause(50)
}

/** Records the target of each `focusin` on the document. */
function recordFocus() {
	const targets: Element[] = []

	const onFocusIn = (event: FocusEvent) => {
		if (event.target instanceof Element) targets.push(event.target)
	}

	document.addEventListener('focusin', onFocusIn, true)

	stopRecording = () => document.removeEventListener('focusin', onFocusIn, true)

	// The slot names the SVG target in a failure, where the markup of a rule is long.
	return {
		svg: () =>
			targets
				.filter((target) => target instanceof SVGElement)
				.map((target) => target.getAttribute('data-slot') ?? target.tagName),
	}
}

let stopRecording: (() => void) | null = null

afterEach(() => {
	stopRecording?.()

	stopRecording = null
})

describe('a tooltip on an SVG trigger (real browser)', () => {
	beforeAll(() => page.viewport(960, 640))

	it('adds no Tab stop between the controls around it', async () => {
		renderUI(
			<>
				<button type="button">Before</button>

				<svg width={100} height={40} aria-hidden="true">
					<Tooltip delay={0}>
						<TooltipTrigger>
							<g data-slot="probe-rule">
								<rect width={40} height={40} />
							</g>
						</TooltipTrigger>

						<TooltipContent>Rule</TooltipContent>
					</Tooltip>
				</svg>

				<button type="button">After</button>
			</>,
		)

		const before = screen.getByRole('button', { name: 'Before' })

		const after = screen.getByRole('button', { name: 'After' })

		before.focus()

		const focus = recordFocus()

		await userEvent.keyboard('{Tab}')

		await releaseLoad()

		expect(focus.svg()).toEqual([])

		expect(after).toHaveFocus()

		// Shift+Tab goes back the same way.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(before).toHaveFocus())

		expect(focus.svg()).toEqual([])

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})

	it('keeps the focus off body when Tab leaves a chart plot past its reference lines', async () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by month against a target and ceiling"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 90 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				legend
				reference={[
					{ value: 55, label: 'Target' },
					{ value: 80, label: 'Ceiling' },
				]}
			/>,
		)

		const plot = screen.getByRole('img', { name: /Revenue by month against a target and ceiling/ })

		expect(container.querySelectorAll('[data-slot="chart-reference-line"]')).toHaveLength(2)

		plot.focus()

		const focus = recordFocus()

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(document.activeElement).not.toBe(plot))

		await releaseLoad()

		// On the bug, Tab went to the `<g>` of the first rule. The focus then
		// dropped to body when the tooltip state took over the trigger.
		expect(focus.svg()).toEqual([])

		const next = document.activeElement

		expect(next).not.toBe(document.body)

		expect(next?.closest('svg')).toBeNull()

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})

	it('still reads the first keyboard focus on a trigger in a shadow root', async () => {
		// In a shadow tree, the document gets the shadow host as the target of a
		// focus and as its active element. The listeners and the replay of the
		// intent must read the shadow root.
		const host = document.createElement('div')

		document.body.append(host)

		onTestFinished(() => host.remove())

		const container = host.attachShadow({ mode: 'open' }).appendChild(document.createElement('div'))

		const onOpenChange = vi.fn()

		renderUI(
			<>
				<button type="button">Before</button>

				<Tooltip delay={0} onOpenChange={onOpenChange}>
					<TooltipTrigger>
						<button type="button">Details</button>
					</TooltipTrigger>

					<TooltipContent>Tip</TooltipContent>
				</Tooltip>
			</>,
			{ container },
		)

		const [before, trigger] = container.querySelectorAll('button')

		before?.focus()

		await userEvent.keyboard('{Tab}')

		expect(container.ownerDocument.activeElement).toBe(host)

		expect(host.shadowRoot?.activeElement).toBe(trigger)

		await releaseLoad()

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})
})
