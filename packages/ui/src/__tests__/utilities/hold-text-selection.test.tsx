import { animate } from 'motion'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { HoldButton } from '../../components/hold-button'
import { Menu, MenuContent, MenuItem } from '../../components/menu'
import {
	holdTextSelection,
	TEXT_SELECTION_RELEASE_DELAY,
} from '../../utilities/hold-text-selection'
import { act, fireEvent, renderUI, screen } from '../helpers'

/**
 * A held touch selects no text on the page.
 *
 * On iOS, a long press on a `select-none` surface selects the nearest text outside it, such as
 * the "Show code" label below a docs example. Only `select-none` on the root element stops it.
 */
describe('holdTextSelection', () => {
	const root = document.documentElement

	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		// End every touch that a test left down, so no hold carries into the next test.
		for (const pointerId of [1, 2]) fireEvent.pointerUp(window, { pointerType: 'touch', pointerId })

		act(() => {
			vi.runOnlyPendingTimers()
		})

		vi.useRealTimers()

		root.classList.remove('select-none')
	})

	const release = () => {
		act(() => {
			vi.advanceTimersByTime(TEXT_SELECTION_RELEASE_DELAY)
		})
	}

	/** Hides the page, as a browser does for a tab in the background. */
	const hidePage = () => {
		const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)

		act(() => {
			document.dispatchEvent(new Event('visibilitychange'))
		})

		hidden.mockRestore()
	}

	it('turns off selection on the root element until the delay after the touch ends', () => {
		holdTextSelection({ pointerType: 'touch', pointerId: 1 })

		expect(root).toHaveClass('select-none')

		fireEvent.pointerUp(window, { pointerType: 'touch', pointerId: 1 })

		act(() => {
			vi.advanceTimersByTime(TEXT_SELECTION_RELEASE_DELAY - 1)
		})

		expect(root).toHaveClass('select-none')

		release()

		expect(root).not.toHaveClass('select-none')
	})

	it('releases after a cancelled touch, such as a scroll', () => {
		holdTextSelection({ pointerType: 'touch', pointerId: 1 })

		fireEvent.pointerCancel(window, { pointerType: 'touch', pointerId: 1 })

		release()

		expect(root).not.toHaveClass('select-none')
	})

	it('changes nothing for a mouse or a pen', () => {
		holdTextSelection({ pointerType: 'mouse', pointerId: 1 })

		holdTextSelection({ pointerType: 'pen', pointerId: 2 })

		expect(root).not.toHaveClass('select-none')
	})

	it('holds until the last touch ends', () => {
		holdTextSelection({ pointerType: 'touch', pointerId: 1 })

		holdTextSelection({ pointerType: 'touch', pointerId: 2 })

		fireEvent.pointerUp(window, { pointerType: 'touch', pointerId: 1 })

		release()

		expect(root).toHaveClass('select-none')

		fireEvent.pointerUp(window, { pointerType: 'touch', pointerId: 2 })

		release()

		expect(root).not.toHaveClass('select-none')
	})

	it('keeps the hold when a new touch starts inside the delay', () => {
		holdTextSelection({ pointerType: 'touch', pointerId: 1 })

		fireEvent.pointerUp(window, { pointerType: 'touch', pointerId: 1 })

		holdTextSelection({ pointerType: 'touch', pointerId: 2 })

		release()

		expect(root).toHaveClass('select-none')
	})

	// iOS can hide the tab during a touch and send no `pointerup` or
	// `pointercancel`. A touch that never ends must not hold the page.
	it('releases at once when the page hides during a touch', () => {
		holdTextSelection({ pointerType: 'touch', pointerId: 1 })

		hidePage()

		expect(root).not.toHaveClass('select-none')
	})

	it('releases a later touch after the page hides during a touch', () => {
		holdTextSelection({ pointerType: 'touch', pointerId: 1 })

		hidePage()

		holdTextSelection({ pointerType: 'touch', pointerId: 2 })

		fireEvent.pointerUp(window, { pointerType: 'touch', pointerId: 2 })

		release()

		expect(root).not.toHaveClass('select-none')
	})

	it('keeps the hold when the page shows', () => {
		holdTextSelection({ pointerType: 'touch', pointerId: 1 })

		act(() => {
			document.dispatchEvent(new Event('visibilitychange'))
		})

		expect(root).toHaveClass('select-none')
	})

	it('keeps a class that the root element had before the hold', () => {
		root.classList.add('select-none')

		holdTextSelection({ pointerType: 'touch', pointerId: 1 })

		fireEvent.pointerUp(window, { pointerType: 'touch', pointerId: 1 })

		release()

		expect(root).toHaveClass('select-none')
	})

	it('holds for a touch on a context menu surface', () => {
		renderUI(
			<Menu>
				<div data-testid="surface">Hold me</div>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
				</MenuContent>
			</Menu>,
		)

		fireEvent.pointerDown(screen.getByTestId('surface'), {
			pointerType: 'touch',
			pointerId: 1,
			isPrimary: true,
		})

		expect(root).toHaveClass('select-none')
	})

	it('holds for a touch on a hold button', () => {
		// `animate` is the shared module spy (setup/module-mocks.ts). The press
		// starts the fill, and a real Motion animation under fake timers waits on
		// a fake frame. The frame loop then stays stuck for the next files of the
		// worker, because the suites run with `isolate: false`.
		vi.mocked(animate).mockReturnValue({} as ReturnType<typeof animate>)

		onTestFinished(() => {
			vi.mocked(animate).mockRestore()
		})

		renderUI(<HoldButton>Delete</HoldButton>)

		fireEvent.pointerDown(screen.getByRole('button'), {
			pointerType: 'touch',
			pointerId: 1,
			button: 0,
		})

		expect(root).toHaveClass('select-none')
	})
})
