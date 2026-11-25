import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Field, Label } from '../../components/fieldset'
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

		expect(field).not.toHaveAttribute('contenteditable')

		expect(field).toHaveAttribute('tabindex', '0')

		// The markup before the load draws the formatting, as the editor does.
		expect(within(field).getByText('Launch').tagName).toBe('STRONG')

		const bold = screen.getByRole('button', { name: 'Bold' })

		expect(bold).toHaveAttribute('aria-disabled', 'true')

		expect(bold).toHaveAttribute('aria-pressed', 'false')

		// The focus of the markup loads the editor at once.
		act(() => field.focus())

		await waitFor(() =>
			expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'true'),
		)

		const editor = screen.getByRole('textbox')

		// The editor takes the focus of the markup that it replaces.
		expect(editor).toHaveFocus()

		expect(editor).toHaveTextContent('Launch')

		expect(bold).not.toHaveAttribute('aria-disabled')
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

	it('moves the focus to the field on a click of the Label', async () => {
		renderUI(
			<Field>
				<Label>Notes</Label>
				<Wysiwyg />
			</Field>,
		)

		fireEvent.click(screen.getByText('Notes'))

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus())
	})

	it('moves the focus to a read-only field on a click of the Label', async () => {
		renderUI(
			<Field>
				<Label>Guide</Label>
				<Wysiwyg defaultValue="Text" readOnly />
			</Field>,
		)

		fireEvent.click(screen.getByText('Guide'))

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus())

		// A second click finds the editor loaded, and focuses it again.
		act(() => screen.getByRole('textbox').blur())

		fireEvent.click(screen.getByText('Guide'))

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

	it('leaves Escape to the page, so a dialog or a popup closes on it', async () => {
		const onKeyDown = vi.fn()

		renderUI(<Wysiwyg aria-label="Notes" defaultValue="Text" onKeyDown={onKeyDown} />)

		const field = await loadEditor()

		// fireEvent gives false for a key that a handler cancels.
		expect(fireEvent.keyDown(field, { key: 'Escape', keyCode: 27 })).toBe(true)

		expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
	})

	it('cancels an Escape that onKeyDown cancels', async () => {
		renderUI(
			<Wysiwyg
				aria-label="Notes"
				defaultValue="Text"
				onKeyDown={(event) => event.preventDefault()}
			/>,
		)

		const field = await loadEditor()

		expect(fireEvent.keyDown(field, { key: 'Escape', keyCode: 27 })).toBe(false)
	})

	it('reads only: no edit, a tab stop, and disabled toolbar buttons', async () => {
		renderUI(
			<Wysiwyg aria-label="Guide" defaultValue="Text" readOnly>
				<WysiwygToolbar actions={['bold']} />
			</Wysiwyg>,
		)

		const field = await loadEditor()

		expect(field).toHaveAttribute('contenteditable', 'false')

		expect(field).toHaveAttribute('tabindex', '0')

		expect(field).toHaveAttribute('aria-readonly', 'true')

		expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-disabled', 'true')
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

			expect(screen.getByRole('toolbar', { hidden: true })).toHaveAttribute('inert')
		},
	)

	it('shows no action as on while read-only', async () => {
		renderUI(
			<Wysiwyg aria-label="Guide" defaultValue="**Bold**" readOnly>
				<WysiwygToolbar actions={['bold']} />
			</Wysiwyg>,
		)

		await loadEditor()

		// The caret starts in the bold text.
		expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false')
	})

	it('puts a separated toolbar above the frame, out of it', () => {
		const { container } = renderUI(
			<Wysiwyg aria-label="Notes" separated>
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		const frame = getSlot(container, 'control-frame')

		const toolbar = screen.getByRole('toolbar')

		expect(frame).not.toContainElement(toolbar)

		expect(frame).toContainElement(screen.getByRole('textbox'))

		expect(getSlot(container, 'wysiwyg-root').firstElementChild).toBe(toolbar)
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

describe('WysiwygToolbar', () => {
	it('names the toolbar and points it at the field', () => {
		renderUI(
			<Wysiwyg aria-label="Notes">
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })

		expect(toolbar).toHaveAttribute('aria-controls', screen.getByRole('textbox').id)
	})

	it('shows the actions in the order given, with a separator between groups', () => {
		renderUI(
			<Wysiwyg aria-label="Notes">
				<WysiwygToolbar actions={['italic', 'bold', 'quote']} />
			</Wysiwyg>,
		)

		const toolbar = screen.getByRole('toolbar')

		expect(
			within(toolbar)
				.getAllByRole('button')
				.map((button) => button.ariaLabel),
		).toEqual(['Italic', 'Bold', 'Quote'])

		expect(
			within(toolbar)
				.getAllByRole('group')
				.map((group) => group.ariaLabel),
		).toEqual(['Text', 'References'])

		expect(within(toolbar).getAllByRole('separator')).toHaveLength(1)
	})

	it('shows the text, lists, references, and code groups by default', () => {
		renderUI(
			<Wysiwyg aria-label="Notes">
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		const groups = within(screen.getByRole('toolbar')).getAllByRole('group')

		expect(
			groups.map((group) => [
				group.ariaLabel,
				within(group)
					.getAllByRole('button')
					.map((button) => button.ariaLabel),
			]),
		).toEqual([
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

		await waitFor(() => expect(bold).not.toHaveAttribute('aria-disabled'))

		// The caret starts in the bold text.
		expect(bold).toHaveAttribute('aria-pressed', 'true')

		expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false')
	})

	it('opens the link popover from the link button', async () => {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="Text">
				<WysiwygToolbar actions={['link']} />
			</Wysiwyg>,
		)

		await loadEditor()

		const link = screen.getByRole('button', { name: 'Link' })

		await waitFor(() => expect(link).not.toHaveAttribute('aria-disabled'))

		expect(link).toHaveAttribute('aria-haspopup', 'dialog')

		expect(link).not.toHaveAttribute('aria-pressed')

		fireEvent.click(link)

		const dialog = await screen.findByRole('dialog', { name: 'Link' })

		// The caret selects no text, so the text field takes the focus.
		await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'Text' })).toHaveFocus())

		expect(within(dialog).getByRole('textbox', { name: 'URL' })).toHaveValue('')
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
