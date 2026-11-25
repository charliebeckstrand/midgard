import { useRef, useState } from 'react'
import { afterEach, beforeEach, expect } from 'vitest'
import { Wysiwyg, WysiwygToolbar } from '../../../modules/wysiwyg'
import { __resetWysiwygEngine } from '../../../modules/wysiwyg/use-wysiwyg-editor'
import { present, screen, waitFor } from '../../helpers'

/** The hold on the load of the editor in the current case. */
const gate = { wait: Promise.resolve(), open: () => {} }

/**
 * Holds the load of the editor in each case of the file that calls it, as a
 * slow page does, until {@link release}, {@link load}, or the end of the case
 * lets it go.
 */
export function holdEditorLoad() {
	beforeEach(() => {
		gate.wait = new Promise((resolve) => {
			gate.open = resolve
		})

		const { wait } = gate

		__resetWysiwygEngine(() => wait.then(() => import('../../../modules/wysiwyg/wysiwyg-editor')))
	})

	afterEach(() => gate.open())
}

/**
 * A field that shows its Markdown value, and the value at each call of
 * `onEnter`. With `restore`, a Restore button sets that value, as a parent
 * that restores a draft does.
 */
export function Notes({
	initial = '',
	onEnter,
	restore,
	toolbar = false,
}: {
	initial?: string
	onEnter?: (value: string) => void
	restore?: string
	toolbar?: boolean
}) {
	const [value, setValue] = useState(initial)

	const current = useRef(value)

	current.current = value

	return (
		<>
			<Wysiwyg
				aria-label="Notes"
				value={value}
				onValueChange={setValue}
				onEnter={onEnter && (() => onEnter(current.current))}
			>
				{toolbar && <WysiwygToolbar />}
			</Wysiwyg>
			<output data-testid="value">{value}</output>
			{restore !== undefined && (
				<button type="button" onClick={() => setValue(restore)}>
					Restore
				</button>
			)}
		</>
	)
}

/** The Markdown value that {@link Notes} shows. */
export const value = () => screen.getByTestId('value').textContent

/**
 * The field before the load, with the focus and the caret at the end of its
 * text, as a press after the text puts it.
 */
export function focusAtEnd(): HTMLElement {
	const field = screen.getByRole('textbox')

	expect(field).not.toHaveClass('ProseMirror')

	field.focus()

	const block = present(field.querySelector('p:last-of-type'), 'a block')

	const text = block.lastChild?.nodeType === Node.TEXT_NODE ? block.lastChild : null

	window.getSelection()?.collapse(text ?? block, text ? (text.nodeValue?.length ?? 0) : 0)

	return field
}

/** Lets the load of the editor go. */
export function release() {
	gate.open()
}

/** Lets the load go, and gives the editable element of the editor. */
export async function load(): Promise<HTMLElement> {
	release()

	await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

	return screen.getByRole('textbox')
}
