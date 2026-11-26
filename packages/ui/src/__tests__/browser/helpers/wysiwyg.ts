import { expect, onTestFinished } from 'vitest'
import { userEvent } from 'vitest/browser'
import { screen, waitFor } from '../../helpers'

/**
 * Loads the editor of a Wysiwyg through a press of its field, and gives the
 * editable element of the editor when it has the focus.
 *
 * @remarks The markup before the load is editable too, and it shows the
 * formatting, so the wait is for the class of the editor. The editor puts its
 * own element in place of that markup, so the query runs again until it finds
 * that element.
 *
 * @param name - The accessible name of the field, for a page with more than one.
 */
export async function editable(name?: string): Promise<HTMLElement> {
	const field = () => screen.getByRole('textbox', name === undefined ? {} : { name })

	await userEvent.click(field())

	await waitFor(() => expect(field()).toHaveClass('ProseMirror'))

	const element = field()

	await waitFor(() => expect(element).toHaveFocus())

	return element
}

/** The delay of the check that ProseMirror runs after its view takes the focus. */
const FOCUS_CHECK_MS = 20

/**
 * Holds the check that ProseMirror runs 20 ms after its view takes the focus.
 * The check runs after the first key moves the caret, and before ProseMirror
 * reads the move: at the next change of the selection, or at the next key if
 * that key comes first. The browser can join the change of the selection of a
 * key with the change of the next key.
 *
 * @remarks The check compares the selection of the page with the selection at
 * the focus. When they are the same, it writes the selection of the editor to
 * the page. A browser runs an input before a timer that is due, so on a busy
 * page a key that comes in the 20 ms runs before the check. Call this before
 * the render: the listeners of the selection and of the keys must run before
 * the listeners of the editor.
 */
export function holdFocusCheck(): void {
	const { setTimeout: schedule } = window

	const held: (() => void)[] = []

	let keys = 0

	const release = () => {
		for (const check of held.splice(0)) check()
	}

	const hold = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
		if (delay !== FOCUS_CHECK_MS || typeof handler !== 'function') {
			return schedule(handler, delay, ...args)
		}

		held.push(() => handler(...args))

		return 0
	}) as typeof window.setTimeout

	// The editor schedules the check in its listener of the focus, which runs
	// between these two listeners.
	const onFocus = (event: FocusEvent) => {
		if (event.target instanceof Element && event.target.classList.contains('ProseMirror')) {
			window.setTimeout = hold
		}
	}

	const onFocusIn = () => {
		window.setTimeout = schedule
	}

	const onKeyDown = () => {
		if (keys > 0) release()

		keys += 1
	}

	const onSelectionChange = () => {
		if (keys > 0) release()
	}

	document.addEventListener('focus', onFocus, true)

	document.addEventListener('focusin', onFocusIn, true)

	document.addEventListener('keydown', onKeyDown, true)

	document.addEventListener('selectionchange', onSelectionChange)

	onTestFinished(() => {
		window.setTimeout = schedule

		document.removeEventListener('focus', onFocus, true)

		document.removeEventListener('focusin', onFocusIn, true)

		document.removeEventListener('keydown', onKeyDown, true)

		document.removeEventListener('selectionchange', onSelectionChange)
	})
}
