import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Field, Label } from '../../components/fieldset'
import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { Wysiwyg, type WysiwygHandle, WysiwygSkeleton, WysiwygToolbar } from '../../modules/wysiwyg'
import { useWysiwyg } from '../../modules/wysiwyg/context'
import { HeadlessProvider } from '../../providers/headless'
import { act, fireEvent, getSlot, renderUI, screen, waitFor, within } from '../helpers'

/** Loads the editor through the first focus of the field, and gives its editable element. */
async function loadEditor(): Promise<HTMLElement> {
	fireEvent.focus(screen.getByRole('textbox'))

	await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

	return screen.getByRole('textbox')
}

describe('Wysiwyg', () => {
	it('renders a named, multiline textbox', () => {
		renderUI(
			<Field>
				<Label>Notes</Label>
				<Wysiwyg placeholder="Add notes" />
			</Field>,
		)

		const field = screen.getByRole('textbox', { name: 'Notes' })

		expect(field).toHaveAttribute('aria-multiline', 'true')

		expect(field).toHaveAttribute('aria-placeholder', 'Add notes')

		expect(field).toHaveAttribute('data-empty')
	})

	it('shows the formatting of the value before the editor loads, and loads it on focus', async () => {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="**Launch**">
				<WysiwygToolbar actions={['bold']} />
			</Wysiwyg>,
		)

		const field = screen.getByRole('textbox', { name: 'Notes' })

		// The markup takes input before the load: the browser makes the edits of its text.
		expect(field).not.toHaveClass('ProseMirror')

		expect(field).toHaveAttribute('contenteditable', 'true')

		expect(field).toHaveAttribute('tabindex', '0')

		// The markup before the load draws the formatting, as the editor does.
		expect(within(field).getByText('Launch').tagName).toBe('STRONG')

		// The toolbar is ready from the first paint.
		const bold = screen.getByRole('button', { name: 'Bold' })

		expect(bold).not.toHaveAttribute('aria-disabled')

		expect(bold).not.toBePressed()

		// The focus of the markup loads the editor at once.
		act(() => field.focus())

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

		const editor = screen.getByRole('textbox')

		// The editor takes the focus of the markup that it replaces.
		expect(editor).toHaveFocus()

		expect(editor).toHaveTextContent('Launch')

		// The caret starts in the bold text.
		await waitFor(() => expect(bold).toBePressed())
	})

	it('runs a press of a toolbar button before the load when the editor comes', async () => {
		const onValueChange = vi.fn()

		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="Text" onValueChange={onValueChange}>
				<WysiwygToolbar actions={['quote', 'codeBlock']} />
			</Wysiwyg>,
		)

		expect(screen.getByRole('textbox')).not.toHaveClass('ProseMirror')

		// Two presses before the load start it, and wait for the editor in their order.
		fireEvent.click(screen.getByRole('button', { name: 'Quote' }))

		fireEvent.click(screen.getByRole('button', { name: 'Code block' }))

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

		expect(onValueChange).toHaveBeenLastCalledWith('> ```\n> Text\n> ```', [])

		expect(screen.getByRole('button', { name: 'Quote' })).toBePressed()
	})

	it('opens the link dialog from a press before the load when the editor comes', async () => {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="Text">
				<WysiwygToolbar actions={['link']} />
			</Wysiwyg>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Link' }))

		const dialog = await screen.findByRole('dialog', { name: 'Link' })

		expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveClass('ProseMirror')

		await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'Text' })).toHaveFocus())
	})

	it('draws a link before the editor loads that a press does not follow', () => {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="Read the [guide](https://example.com/guide)" />,
		)

		const link = within(screen.getByRole('textbox', { name: 'Notes' })).getByText('guide')

		expect(link).toHaveAttribute('href', 'https://example.com/guide')

		expect(link).toHaveAttribute('tabindex', '-1')

		// `dispatchEvent` gives false for a canceled event.
		expect(fireEvent.click(link)).toBe(false)

		expect(
			fireEvent(link, new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 })),
		).toBe(false)
	})

	it('shows the formatting of the source once the editor loads', async () => {
		renderUI(<Wysiwyg aria-label="Notes" defaultValue={'**Launch** is on *Friday*.\n\n- One'} />)

		const field = await loadEditor()

		expect(field).toHaveAttribute('contenteditable', 'true')

		expect(within(field).getByText('Launch').tagName).toBe('STRONG')

		expect(within(field).getByText('Friday').tagName).toBe('EM')

		expect(within(field).getByRole('listitem')).toHaveTextContent('One')

		expect(field).not.toHaveAttribute('data-empty')
	})

	it('draws no markup before the editor when the engine loaded before the mount', async () => {
		const first = renderUI(<Wysiwyg aria-label="First" defaultValue="One" />)

		await loadEditor()

		first.unmount()

		const observer = new MutationObserver(() => undefined)

		observer.observe(document.body, { childList: true, subtree: true })

		renderUI(<Wysiwyg aria-label="Second" defaultValue="**Two**" />)

		// The markup before the editor would go when the editor replaces it.
		const removed = observer
			.takeRecords()
			.flatMap((record) => [...record.removedNodes])
			.filter((node) => node instanceof HTMLElement && node.getAttribute('role') === 'textbox')

		observer.disconnect()

		expect(removed).toEqual([])

		expect(screen.getByRole('textbox', { name: 'Second' })).toHaveClass('ProseMirror')
	})

	it('keeps the name, the description, and the validation state on the editor', async () => {
		renderUI(
			<Field severity="error">
				<Label>Steps</Label>
				<Wysiwyg aria-describedby="hint" />
			</Field>,
		)

		const field = await loadEditor()

		expect(field).toHaveAccessibleName('Steps')

		expect(field).toHaveAttribute('aria-invalid', 'true')

		expect(field.getAttribute('aria-describedby')).toContain('hint')
	})

	it.for([
		['an editable', {}],
		['a read-only', { readOnly: true }],
	] as const)('moves the focus to %s field on a click of the Label', async ([, lock]) => {
		renderUI(
			<Field>
				<Label>Notes</Label>
				<Wysiwyg defaultValue="Text" {...lock} />
			</Field>,
		)

		fireEvent.click(screen.getByText('Notes'))

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus())

		// A second click finds the editor loaded, and focuses it again.
		act(() => screen.getByRole('textbox').blur())

		fireEvent.click(screen.getByText('Notes'))

		expect(screen.getByRole('textbox')).toHaveFocus()
	})

	it('keeps the focus of a read-only field when the editor loads', async () => {
		renderUI(<Wysiwyg aria-label="Guide" defaultValue="Text" readOnly />)

		act(() => screen.getByRole('textbox').focus())

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

		expect(screen.getByRole('textbox')).toHaveFocus()
	})

	it('replaces the doc when the controlled value changes', async () => {
		const { rerender } = renderUI(<Wysiwyg aria-label="Notes" value="First" />)

		const field = await loadEditor()

		rerender(<Wysiwyg aria-label="Notes" value="**Second**" />)

		expect(within(field).getByText('Second').tagName).toBe('STRONG')

		expect(field).not.toHaveTextContent('First')
	})

	it('calls onEnter on Enter, and does not split the block', async () => {
		const onEnter = vi.fn()

		const onValueChange = vi.fn()

		renderUI(
			<Wysiwyg
				aria-label="Message"
				defaultValue="Hello"
				onEnter={onEnter}
				onValueChange={onValueChange}
			/>,
		)

		const field = await loadEditor()

		fireEvent.keyDown(field, { key: 'Enter' })

		expect(onEnter).toHaveBeenCalledTimes(1)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it.for([false, true])(
		'leaves Escape to the page, so a dialog or a popup closes on it, unless onKeyDown cancels it (%s)',
		async (cancel) => {
			const onKeyDown = vi.fn((event: KeyboardEvent) => {
				if (cancel) event.preventDefault()
			})

			renderUI(<Wysiwyg aria-label="Notes" defaultValue="Text" onKeyDown={onKeyDown} />)

			const field = await loadEditor()

			// fireEvent gives false for a key that a handler cancels.
			expect(fireEvent.keyDown(field, { key: 'Escape', keyCode: 27 })).toBe(!cancel)

			expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
		},
	)

	it('reads only: no edit, a tab stop, and disabled toolbar buttons that show no action as on', async () => {
		renderUI(
			<Wysiwyg aria-label="Guide" defaultValue="**Bold**" readOnly>
				<WysiwygToolbar actions={['bold']} />
			</Wysiwyg>,
		)

		const field = await loadEditor()

		expect(field).toHaveAttribute('contenteditable', 'false')

		expect(field).toHaveAttribute('tabindex', '0')

		expect(field).toHaveAttribute('aria-readonly', 'true')

		const bold = screen.getByRole('button', { name: 'Bold' })

		expect(bold).toHaveAttribute('aria-disabled', 'true')

		// The caret starts in the bold text.
		expect(bold).not.toBePressed()
	})

	it.for([
		['disabled', { disabled: true }],
		['read-only', { readOnly: true }],
	] as const)(
		'makes the toolbar inert while %s, so it has no Tab stop and no tooltip',
		([, lock]) => {
			renderUI(
				<Wysiwyg aria-label="Guide" defaultValue="Text" {...lock}>
					<WysiwygToolbar />
				</Wysiwyg>,
			)

			// The heading rail is inert too.
			for (const toolbar of screen.getAllByRole('toolbar', { hidden: true })) {
				expect(toolbar).toHaveAttribute('inert')
			}
		},
	)

	it('puts a separated toolbar above the frame, out of it', () => {
		const { container } = renderUI(
			<Wysiwyg aria-label="Notes" separated>
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		const frame = getSlot(container, 'control-frame')

		const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })

		expect(frame).not.toContainElement(toolbar)

		expect(frame).toContainElement(screen.getByRole('textbox'))

		// The row of the toolbar holds the toolbar and the heading rail.
		const row = getSlot(container, 'wysiwyg-toolbar')

		expect(getSlot(container, 'wysiwyg-root').firstElementChild).toBe(row)

		expect(row).toContainElement(toolbar)
	})

	it('keeps the editor when `separated` changes', async () => {
		const { rerender } = renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="Text">
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		await loadEditor()

		rerender(
			<Wysiwyg aria-label="Notes" defaultValue="Text" separated>
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		expect(screen.getByRole('textbox')).toHaveTextContent('Text')

		rerender(
			<Wysiwyg aria-label="Notes" defaultValue="Text">
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		expect(screen.getByRole('textbox')).toHaveTextContent('Text')
	})

	it('dims the frame of a disabled field and drops its tab stop', () => {
		const { container } = renderUI(<Wysiwyg aria-label="Guide" disabled />)

		expect(getSlot(container, 'control-frame')).toHaveAttribute('data-disabled')

		const field = screen.getByRole('textbox')

		expect(field).toHaveAttribute('aria-disabled', 'true')

		expect(field).not.toHaveAttribute('tabindex')
	})

	it('renders the frame as a div, because the field holds blocks', () => {
		const { container } = renderUI(<Wysiwyg aria-label="Notes" />)

		expect(getSlot(container, 'control-frame').tagName).toBe('DIV')
	})

	it('reports each change of an uncontrolled field to a controlled parent', async () => {
		function Parent() {
			const [value, setValue] = useState('Draft')

			return (
				<>
					<Wysiwyg aria-label="Notes" value={value} onValueChange={setValue} />
					<button type="button" onClick={() => setValue('')}>
						Clear
					</button>
				</>
			)
		}

		renderUI(<Parent />)

		const field = await loadEditor()

		fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

		expect(field).toHaveTextContent('')

		expect(field).toHaveAttribute('data-empty')
	})

	it('reports the block of the caret while the field has the focus', async () => {
		const onSelectionChange = vi.fn()

		renderUI(
			<>
				<Wysiwyg
					aria-label="Notes"
					defaultValue="Ask **@Sa**"
					onSelectionChange={onSelectionChange}
				/>
				<button type="button">Out</button>
			</>,
		)

		const field = await loadEditor()

		act(() => field.focus())

		await waitFor(() =>
			expect(onSelectionChange).toHaveBeenLastCalledWith({ text: 'Ask @Sa', caret: 0, ranges: [] }),
		)

		act(() => screen.getByRole('button', { name: 'Out' }).focus())

		expect(onSelectionChange).toHaveBeenLastCalledWith(null)
	})

	it('reports no block while the field is read-only', async () => {
		const onSelectionChange = vi.fn()

		renderUI(
			<Wysiwyg
				aria-label="Notes"
				defaultValue="Ask"
				readOnly
				onSelectionChange={onSelectionChange}
			/>,
		)

		const field = await loadEditor()

		act(() => field.focus())

		expect(onSelectionChange).not.toHaveBeenCalled()
	})

	it('passes the attributes of a completion to the field', () => {
		renderUI(
			<Wysiwyg
				aria-label="Notes"
				aria-autocomplete="list"
				aria-haspopup="listbox"
				aria-controls="sources"
			/>,
		)

		const field = screen.getByRole('textbox')

		expect(field).toHaveAttribute('aria-autocomplete', 'list')

		expect(field).toHaveAttribute('aria-haspopup', 'listbox')

		expect(field).toHaveAttribute('aria-controls', 'sources')
	})

	it('renders the bare field under HeadlessProvider', () => {
		const { container } = renderUI(
			<HeadlessProvider>
				<Wysiwyg aria-label="Notes" />
			</HeadlessProvider>,
		)

		expect(container.querySelector('[data-slot="control-frame"]')).toBeNull()

		expect(screen.getByRole('textbox')).toBeInTheDocument()
	})
})

describe('Wysiwyg ranges', () => {
	type Report = [string, MarkdownRange[]]

	/** A controlled field of `Ask Sales` with no range, which records each report and gives it back. */
	function renderRanged(initial: MarkdownRange[] = []) {
		const handle = createRef<WysiwygHandle>()

		const reports: Report[] = []

		function Parent() {
			const [state, setState] = useState({ value: 'Ask Sales', ranges: initial })

			return (
				<Wysiwyg
					ref={handle}
					aria-label="Notes"
					value={state.value}
					ranges={state.ranges}
					onValueChange={(value, ranges) => {
						reports.push([value, ranges])

						setState({ value, ranges })
					}}
				/>
			)
		}

		renderUI(<Parent />)

		return { handle, reports }
	}

	const sales = { id: 'c1', start: 4, end: 9, quote: 'Sales' }

	const marked = (field: HTMLElement) =>
		field.querySelector('[data-slot="wysiwyg-range"]')?.textContent ?? null

	it('reports an edit that marks text of the value, and keeps the range', async () => {
		const { handle, reports } = renderRanged()

		const field = await loadEditor()

		act(() => handle.current?.replace(4, 9, 'Sales', sales))

		expect(reports).toEqual([['Ask Sales', [sales]]])

		expect(marked(field)).toBe('Sales')
	})

	it('reports an edit that keeps the text and takes a range out', async () => {
		const { handle, reports } = renderRanged([sales])

		const field = await loadEditor()

		expect(marked(field)).toBe('Sales')

		// The new text from the space before the range has no mark, so the text of the range changes.
		act(() => handle.current?.replace(3, 5, ' S'))

		expect(reports).toEqual([['Ask Sales', []]])

		expect(marked(field)).toBeNull()
	})

	it('gives a reset no range that overlaps a range that it keeps', async () => {
		const handle = createRef<WysiwygHandle>()

		const reports: Report[] = []

		const other = { ...sales, id: 'c2' }

		function Reset() {
			const [ranges, setRanges] = useState<MarkdownRange[]>([sales])

			return (
				<form>
					<Wysiwyg
						ref={handle}
						aria-label="Notes"
						defaultValue="Ask Sales"
						ranges={ranges}
						onValueChange={(value, kept) => {
							reports.push([value, kept])

							setRanges(kept)
						}}
					/>
					<button type="button" onClick={() => setRanges([other])}>
						Cite
					</button>
				</form>
			)
		}

		renderUI(<Reset />)

		const field = await loadEditor()

		act(() => handle.current?.replace(9, 9, '!'))

		// The parent gives the same text another range.
		fireEvent.click(screen.getByRole('button', { name: 'Cite' }))

		act(() => field.closest('form')?.reset())

		// The range of the parent wins over the range of the default value at the same text.
		await waitFor(() => expect(reports.at(-1)).toEqual(['Ask Sales', [other]]))
	})

	it('reports no edit that keeps the text and the ranges', async () => {
		const { handle, reports } = renderRanged()

		await loadEditor()

		act(() => handle.current?.replace(0, 1, 'A'))

		expect(reports).toEqual([])
	})
})

describe('WysiwygToolbar', () => {
	it('names the toolbar and points it at the field', () => {
		renderUI(
			<Wysiwyg aria-label="Notes">
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })

		expect(toolbar).toControl(screen.getByRole('textbox'))
	})

	it('shows the actions in the order given, with a separator between groups', () => {
		renderUI(
			<Wysiwyg aria-label="Notes">
				<WysiwygToolbar actions={['italic', 'bold', 'quote']} />
			</Wysiwyg>,
		)

		const toolbar = screen.getByRole('toolbar')

		// More is inert while each action is on the row.
		expect(
			within(toolbar)
				.getAllByRole('button')
				.filter((button) => !button.closest('[inert]'))
				.map((button) => button.ariaLabel),
		).toEqual(['Italic', 'Bold', 'Quote'])

		expect(
			within(toolbar)
				.getAllByRole('group')
				.map((group) => group.ariaLabel),
		).toEqual(['Text', 'References'])

		expect(within(toolbar).getAllByRole('separator')).toHaveLength(1)
	})

	it('shows the heading, text, lists, references, and code groups by default', () => {
		renderUI(
			<Wysiwyg aria-label="Notes">
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		const groups = within(screen.getByRole('toolbar', { name: 'Formatting' })).getAllByRole('group')

		expect(
			groups.map((group) => [
				group.ariaLabel,
				within(group)
					.getAllByRole('button')
					.map((button) => button.ariaLabel),
			]),
		).toEqual([
			['Heading', ['Heading']],
			['Text', ['Bold', 'Italic', 'Strikethrough']],
			['Lists', ['Bulleted list', 'Numbered list']],
			['References', ['Link', 'Quote']],
			['Code', ['Code', 'Code block']],
		])
	})

	it('shows the pressed state of each action at the selection', async () => {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="**Bold**">
				<WysiwygToolbar actions={['bold', 'italic']} />
			</Wysiwyg>,
		)

		const bold = screen.getByRole('button', { name: 'Bold' })

		expect(bold).toHaveAttribute('aria-keyshortcuts')

		await loadEditor()

		// The caret starts in the bold text.
		await waitFor(() => expect(bold).toBePressed())

		expect(screen.getByRole('button', { name: 'Italic' })).not.toBePressed()
	})

	it('opens the link dialog from the link button', async () => {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="Text">
				<WysiwygToolbar actions={['link']} />
			</Wysiwyg>,
		)

		await loadEditor()

		const link = screen.getByRole('button', { name: 'Link' })

		expect(link).toHaveAttribute('aria-haspopup', 'dialog')

		expect(link).not.toHaveAttribute('aria-pressed')

		fireEvent.click(link)

		const dialog = await screen.findByRole('dialog', { name: 'Link' })

		// The caret selects no text, so the text field takes the focus.
		await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'Text' })).toHaveFocus())

		expect(within(dialog).getByRole('textbox', { name: 'URL' })).toHaveValue('')
	})

	describe('the heading rail', () => {
		/** Renders a field with Heading and Bold, loads the editor, and gives the parts. */
		async function renderRail(defaultValue: string) {
			const onValueChange = vi.fn()

			renderUI(
				<Wysiwyg aria-label="Notes" defaultValue={defaultValue} onValueChange={onValueChange}>
					<WysiwygToolbar actions={['heading', 'bold']} />
				</Wysiwyg>,
			)

			const field = await loadEditor()

			return {
				field,
				onValueChange,
				row: screen.getByRole('toolbar', { name: 'Formatting' }),
				rail: screen.getByRole('toolbar', { name: 'Heading', hidden: true }),
				heading: screen.getByRole('button', { name: 'Heading' }),
			}
		}

		it('swaps the row for the levels, sets a level on a press, and swaps back', async () => {
			const { row, rail, heading, onValueChange } = await renderRail('Title')

			// Heading opens the rail, so it is no toggle.
			expect(heading).not.toHaveAttribute('aria-pressed')

			expect(rail).toHaveAttribute('data-hidden')

			expect(rail).toHaveAttribute('inert')

			fireEvent.click(heading)

			expect(row).toHaveAttribute('data-hidden')

			expect(row).toHaveAttribute('inert')

			expect(rail).not.toHaveAttribute('inert')

			const levels = within(rail).getByRole('radiogroup', { name: 'Heading level' })

			expect(
				within(levels)
					.getAllByRole('radio')
					.map((radio) => radio.ariaLabel ?? radio.textContent),
			).toEqual(['Text', 'Heading 1', 'Heading 2', 'Heading 3'])

			expect(within(levels).getByRole('radio', { name: 'Text' })).toBeChecked()

			const h2 = within(levels).getByRole('radio', { name: 'Heading 2' })

			expect(h2).toHaveTextContent('H2')

			expect(h2).toHaveAttribute('aria-keyshortcuts', 'Control+Alt+2')

			fireEvent.pointerDown(h2)

			fireEvent.click(h2)

			await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith('## Title', []))

			expect(rail).toHaveAttribute('data-hidden')

			expect(row).not.toHaveAttribute('data-hidden')
		})

		it('closes the rail with no change on Back', async () => {
			const { row, rail, heading, onValueChange } = await renderRail('Title')

			fireEvent.click(heading)

			fireEvent.click(within(rail).getByRole('button', { name: 'Back' }))

			expect(rail).toHaveAttribute('data-hidden')

			expect(row).not.toHaveAttribute('data-hidden')

			expect(onValueChange).not.toHaveBeenCalled()
		})

		it('moves the focus to the selected level and back to Heading, for a keyboard', async () => {
			const { rail, heading, onValueChange } = await renderRail('Title')

			// A pick by a press first, so the pick of a key below follows a press.
			fireEvent.click(heading)

			const h1 = within(rail).getByRole('radio', { name: 'Heading 1' })

			fireEvent.pointerDown(h1)

			fireEvent.click(h1)

			await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith('# Title', []))

			act(() => heading.focus())

			fireEvent.click(heading)

			expect(h1).toHaveFocus()

			// An arrow key picks the level and keeps the rail open.
			fireEvent.keyDown(h1, { key: 'ArrowRight' })

			await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith('## Title', []))

			expect(rail).not.toHaveAttribute('data-hidden')

			expect(within(rail).getByRole('radio', { name: 'Heading 2' })).toHaveFocus()

			fireEvent.keyDown(document.activeElement ?? h1, { key: 'Escape' })

			expect(rail).toHaveAttribute('data-hidden')

			expect(heading).toHaveFocus()

			// The focus from a key shows the tooltip of Heading.
			expect(await screen.findByRole('tooltip')).toHaveTextContent('Heading')
		})

		it('disables a level that the block cannot take', async () => {
			const { rail, heading } = await renderRail('- item')

			fireEvent.click(heading)

			// The first block of a list item must be a paragraph.
			expect(within(rail).getByRole('radio', { name: 'Heading 1' })).toBeDisabled()

			expect(within(rail).getByRole('radio', { name: 'Text' })).toBeEnabled()
		})

		it('sets a level from its key, with no rail', async () => {
			const onValueChange = vi.fn()

			renderUI(<Wysiwyg aria-label="Notes" defaultValue="Title" onValueChange={onValueChange} />)

			const field = await loadEditor()

			fireEvent.keyDown(field, {
				key: '1',
				code: 'Digit1',
				keyCode: 49,
				ctrlKey: true,
				altKey: true,
			})

			await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith('# Title', []))

			fireEvent.keyDown(field, {
				key: '0',
				code: 'Digit0',
				keyCode: 48,
				ctrlKey: true,
				altKey: true,
			})

			await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith('Title', []))
		})
	})

	it('keeps the value of its context across an edit, so the toolbar does not render again', async () => {
		const handle = createRef<WysiwygHandle>()

		const values = new Set<unknown>()

		// A part of the field, as a toolbar button is, that records each value of the context.
		function Part() {
			values.add(useWysiwyg())

			return null
		}

		renderUI(
			<Wysiwyg ref={handle} aria-label="Notes" defaultValue="Text">
				<Part />
			</Wysiwyg>,
		)

		await loadEditor()

		values.clear()

		act(() => handle.current?.replace(0, 0, 'New '))

		expect(screen.getByRole('textbox')).toHaveTextContent('New Text')

		expect(values.size).toBe(0)
	})
})

describe('WysiwygSkeleton', () => {
	it('holds the lines of the field', () => {
		const { container } = renderUI(<WysiwygSkeleton rows={4} />)

		expect(container.querySelector('[style*="4lh"]')).not.toBeNull()
	})
})
