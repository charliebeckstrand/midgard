import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useResponsiveValue } from '../../hooks/use-responsive-value'
import { BreakpointFrame } from '../../primitives/breakpoint-frame/breakpoint-frame'
import { Portal } from '../../primitives/portal'
import { act, renderUI, screen, stubMatchMedia } from '../helpers'
import { stubResizeObserver } from '../helpers/stub-resize-observer'

// The `md` breakpoint (48rem) at a root font size of 16px.
const MD = 768

/** Reads a value that changes at `md`, and shows it. */
function Probe({ label }: { label: string }) {
	const value = useResponsiveValue({ initial: 'narrow', md: 'wide' }, 'narrow')

	return <span data-testid={label}>{value}</span>
}

let frameWidth = 0

beforeEach(() => {
	document.documentElement.style.fontSize = '16px'

	// The frame measures its own box. Each other box has no size in jsdom.
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: HTMLElement,
	) {
		const width = this.dataset.slot === 'breakpoint-frame' ? frameWidth : 0

		return DOMRect.fromRect({ width, height: 0 })
	})
})

afterEach(() => {
	document.documentElement.style.fontSize = ''
})

describe('BreakpointFrame', () => {
	it('gives its content the breakpoints of its width, not of the viewport', () => {
		stubMatchMedia(() => true)

		frameWidth = MD - 1

		renderUI(
			<BreakpointFrame>
				<Probe label="in" />
			</BreakpointFrame>,
		)

		expect(screen.getByTestId('in')).toHaveTextContent('narrow')
	})

	it('renders the content again when the width crosses a breakpoint', () => {
		stubMatchMedia(() => false)

		const observers = stubResizeObserver()

		frameWidth = MD - 1

		renderUI(
			<BreakpointFrame>
				<Probe label="in" />
			</BreakpointFrame>,
		)

		expect(screen.getByTestId('in')).toHaveTextContent('narrow')

		frameWidth = MD

		act(() => {
			for (const observer of observers) observer.callback([], observer as never)
		})

		expect(screen.getByTestId('in')).toHaveTextContent('wide')
	})

	it('gives a surface that a portal moves to the body the breakpoints of the viewport', () => {
		stubMatchMedia(() => true)

		frameWidth = MD - 1

		renderUI(
			<BreakpointFrame>
				<Probe label="in" />
				<Portal open>
					<Probe label="portal" />
				</Portal>
			</BreakpointFrame>,
		)

		expect(screen.getByTestId('in')).toHaveTextContent('narrow')
		expect(screen.getByTestId('portal')).toHaveTextContent('wide')
	})

	it('keeps the frame for a surface that a portal moves into a box in the frame', () => {
		stubMatchMedia(() => true)

		frameWidth = MD - 1

		const box = document.createElement('div')

		renderUI(
			<BreakpointFrame ref={(node) => node?.append(box)}>
				<Portal open container={box}>
					<Probe label="portal" />
				</Portal>
			</BreakpointFrame>,
		)

		expect(screen.getByTestId('portal')).toHaveTextContent('narrow')
	})

	it('keeps the frame for a portal nested in a portal into a box in the frame', () => {
		stubMatchMedia(() => true)

		frameWidth = MD - 1

		const box = document.createElement('div')

		renderUI(
			<BreakpointFrame ref={(node) => node?.append(box)}>
				<Portal open container={box}>
					<Portal open>
						<Probe label="nested" />
					</Portal>
				</Portal>
			</BreakpointFrame>,
		)

		const nested = screen.getByTestId('nested')

		// The node of the nested portal is in the box, so the CSS reads the frame.
		expect(box).toContainElement(nested)
		expect(nested).toHaveTextContent('narrow')
	})

	it('gives a portal nested in a portal to the body the breakpoints of the viewport', () => {
		stubMatchMedia(() => true)

		frameWidth = MD - 1

		renderUI(
			<BreakpointFrame>
				<Portal open>
					<Portal open>
						<Probe label="nested" />
					</Portal>
				</Portal>
			</BreakpointFrame>,
		)

		expect(screen.getByTestId('nested')).toHaveTextContent('wide')
	})
})
