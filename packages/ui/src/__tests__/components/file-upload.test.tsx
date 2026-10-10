import { describe, expect, it, vi } from 'vitest'
import { Control } from '../../components/control'
import { Description, Field, Label, Message } from '../../components/fieldset'
import { FileUploadButton, FileUploadDrop, FileUploadInput } from '../../components/file-upload'
import { Form } from '../../components/form'
import { HeadlessProvider } from '../../providers/headless'
import {
	act,
	expectAnnouncement,
	fireEvent,
	getSlot,
	makeFileList,
	present,
	renderUI,
	screen,
} from '../helpers'

/** The hidden native file input. */
function fileInput(container: HTMLElement) {
	return present<HTMLInputElement>(
		container.querySelector('input[type="file"]'),
		'input[type="file"]',
	)
}

/** The display button of `FileUploadInput`. */
function display(container: HTMLElement) {
	return getSlot<HTMLButtonElement>(container, 'file-upload-field')
}

/** The drop zone. */
function dropzone(container: HTMLElement) {
	return getSlot(container, 'file-upload')
}

/** Selects `files` through the hidden input, as the native picker does. */
function selectFiles(container: HTMLElement, files: File[]) {
	fireEvent.change(fileInput(container), { target: { files: makeFileList(files) } })
}

describe('FileUpload', () => {
	it('renders a visually hidden file input', () => {
		const { container } = renderUI(<FileUploadDrop>Upload</FileUploadDrop>)

		expect(fileInput(container).className).toContain('sr-only')
	})

	it('accepts the accept prop', () => {
		const { container } = renderUI(<FileUploadDrop accept="image/*">Upload</FileUploadDrop>)

		const input = fileInput(container)

		expect(input.accept).toBe('image/*')
	})
})

describe('FileUpload drop variant selection', () => {
	it('shows the drop prompt when empty', () => {
		renderUI(<FileUploadDrop />)

		expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
	})

	it('names the gesture of the primary pointer in the drop prompt', () => {
		renderUI(<FileUploadDrop />)

		// jsdom resolves no media query, so the classes stand in for the text that
		// shows. The browser suite reads the name that a fine pointer gets.
		expect(screen.getByText('Drop files here or click to browse')).toHaveClass(
			'pointer-coarse:hidden',
		)

		expect(screen.getByText('Drop files here or tap to browse')).toHaveClass(
			'hidden',
			'pointer-coarse:block',
		)
	})

	it('keeps the drop prompt to phrasing content inside the button', () => {
		const { container } = renderUI(<FileUploadDrop />)

		// A `<button>` takes phrasing content only, so the prompt is not a `<div>`.
		expect(dropzone(container).querySelector('div')).toBeNull()

		expect(screen.getByText('Drop files here or click to browse').tagName).toBe('SPAN')
	})

	it('replaces the prompt with the filename and a Reset button once a file is selected', () => {
		const { container } = renderUI(<FileUploadDrop />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.queryByText('Drop files here or click to browse')).not.toBeInTheDocument()

		expect(screen.getByText('resume.pdf')).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
	})

	it('keeps the dropzone operable so a different file can be picked after a selection', () => {
		const { container } = renderUI(<FileUploadDrop />)

		const input = fileInput(container)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		const click = vi.spyOn(input, 'click')

		fireEvent.click(screen.getByRole('button', { name: 'Choose a different file' }))

		expect(click).toHaveBeenCalledTimes(1)
	})

	it('shows an "x files selected" summary for a multi-file selection', () => {
		const { container } = renderUI(<FileUploadDrop multiple />)

		selectFiles(container, [new File(['a'], 'a.png'), new File(['b'], 'b.png')])

		expect(screen.getByText('2 files selected')).toBeInTheDocument()
	})

	it('clears the selection and restores the drop prompt when Reset is clicked', () => {
		const onAccept = vi.fn()

		const { container } = renderUI(<FileUploadDrop onAccept={onAccept} />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()

		expect(onAccept).toHaveBeenLastCalledWith([])
	})

	it('ignores the built-in selection display when custom children are provided', () => {
		const { container } = renderUI(<FileUploadDrop>Custom prompt</FileUploadDrop>)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.getByText('Custom prompt')).toBeInTheDocument()

		expect(screen.queryByText('resume.pdf')).not.toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
	})
})

describe('FileUpload input variant', () => {
	it('renders the display as a button that shows the configured placeholder', () => {
		const { container } = renderUI(<FileUploadInput placeholder="Choose…" />)

		const field = screen.getByRole('button', { name: 'Choose…' })

		expect(field).toBe(display(container))

		// Not a read-only text field: AT must not read an edit box that a user cannot type in.
		expect(container.querySelector('input:not([type="file"])')).toBeNull()

		expect(screen.queryByRole('textbox')).toBeNull()
	})

	it('opens the picker when the display button is activated', () => {
		const { container } = renderUI(<FileUploadInput />)

		const click = vi.spyOn(fileInput(container), 'click')

		fireEvent.click(display(container))

		expect(click).toHaveBeenCalledTimes(1)
	})

	it('falls back to a default placeholder when none is provided', () => {
		const { container } = renderUI(<FileUploadInput />)

		expect(display(container)).toHaveTextContent('Choose a file')
	})

	it('disables the display button when disabled is set', () => {
		const { container } = renderUI(<FileUploadInput disabled />)

		expect(display(container)).toBeDisabled()
	})

	it('renders the empty-state upload affordance as a button that opens the picker', () => {
		const { container } = renderUI(<FileUploadInput />)

		const input = fileInput(container)

		const click = vi.spyOn(input, 'click')

		fireEvent.click(screen.getByRole('button', { name: 'Browse files' }))

		expect(click).toHaveBeenCalledTimes(1)
	})
})

describe('FileUpload input variant selection', () => {
	it('shows the filename as the value once a file is selected', () => {
		const { container } = renderUI(<FileUploadInput />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(display(container)).toHaveTextContent('resume.pdf')
	})

	it('shows an "x files selected" summary for a multi-file selection', () => {
		const { container } = renderUI(<FileUploadInput multiple />)

		selectFiles(container, [new File(['a'], 'a.png'), new File(['b'], 'b.png')])

		expect(display(container)).toHaveTextContent('2 files selected')
	})

	it('swaps the suffix to a clear button once a file is selected', () => {
		const { container } = renderUI(<FileUploadInput />)

		expect(screen.queryByRole('button', { name: 'Clear selected file(s)' })).not.toBeInTheDocument()

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.getByRole('button', { name: 'Clear selected file(s)' })).toBeInTheDocument()
	})

	it('clears the selection and restores the placeholder when the clear button is clicked', () => {
		const onAccept = vi.fn()

		const { container } = renderUI(<FileUploadInput placeholder="Choose…" onAccept={onAccept} />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		fireEvent.click(screen.getByRole('button', { name: 'Clear selected file(s)' }))

		expect(display(container)).toHaveTextContent('Choose…')

		expect(onAccept).toHaveBeenLastCalledWith([])
	})
})

describe('FileUpload input variant under headless', () => {
	it('keeps a bare clear button that clears the selection and gives focus back', () => {
		const onAccept = vi.fn()

		const { container } = renderUI(
			<HeadlessProvider>
				<FileUploadInput onAccept={onAccept} />
			</HeadlessProvider>,
		)

		expect(screen.queryByRole('button', { name: 'Clear selected file(s)' })).not.toBeInTheDocument()

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		const clear = screen.getByRole('button', { name: 'Clear selected file(s)' })

		expect(clear).toHaveAttribute('type', 'button')

		fireEvent.click(clear)

		expect(display(container)).toHaveFocus()

		expect(onAccept).toHaveBeenLastCalledWith([])

		expect(screen.queryByRole('button', { name: 'Clear selected file(s)' })).not.toBeInTheDocument()
	})
})

describe('FileUpload button variant', () => {
	it('renders a button with default copy when no children are provided', () => {
		renderUI(<FileUploadButton />)

		expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
	})

	it('uses children as the button label when provided', () => {
		renderUI(<FileUploadButton>Pick a file</FileUploadButton>)

		expect(screen.getByRole('button', { name: 'Pick a file' })).toBeInTheDocument()
	})

	it('leaves the button enabled when disabled is not set', () => {
		renderUI(<FileUploadButton>Pick</FileUploadButton>)

		expect(screen.getByRole('button', { name: 'Pick' })).not.toBeDisabled()
	})

	it('disables the button when disabled is set', () => {
		renderUI(<FileUploadButton disabled>Pick</FileUploadButton>)

		expect(screen.getByRole('button', { name: 'Pick' })).toBeDisabled()
	})
})

describe('FileUpload button variant selection', () => {
	it('keeps the Upload trigger and adds a Reset button once a file is selected', () => {
		const { container } = renderUI(<FileUploadButton />)

		const input = fileInput(container)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()

		// The trigger stays operable so a different file can be picked.
		const click = vi.spyOn(input, 'click')

		fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

		expect(click).toHaveBeenCalledTimes(1)
	})

	it('clears the selection and removes Reset when Reset is clicked', () => {
		const onAccept = vi.fn()

		const { container } = renderUI(<FileUploadButton onAccept={onAccept} />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()

		expect(onAccept).toHaveBeenLastCalledWith([])
	})
})

describe('FileUpload + Control', () => {
	it('surfaces invalid and required state onto the hidden file input', () => {
		const { container } = renderUI(
			<Control severity="error" required>
				<FileUploadDrop>Upload</FileUploadDrop>
			</Control>,
		)

		const input = fileInput(container)

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(input).toBeRequired()
	})

	it('points the hidden file input aria-describedby at the control description and message', () => {
		const { container } = renderUI(
			<Control id="doc" severity="error">
				<Description>PDF only</Description>
				<FileUploadDrop>Upload</FileUploadDrop>
				<Message>A file is required</Message>
			</Control>,
		)

		const describedBy = fileInput(container).getAttribute('aria-describedby')

		expect(describedBy).toContain('doc-description')

		expect(describedBy).toContain('doc-error')
	})

	it('puts the Field identity on the hidden input, not on the display field', () => {
		const { container } = renderUI(
			<Control required>
				<Field severity="error">
					<Label>Resume</Label>
					<FileUploadInput />
					<Message>A file is required</Message>
				</Field>
			</Control>,
		)

		const hidden = fileInput(container)

		const field = display(container)

		const label = getSlot<HTMLLabelElement>(container, 'label')

		const messageId = getSlot(container, 'message').id

		expect(hidden.id).not.toBe('')

		expect(label.htmlFor).toBe(hidden.id)

		expect(hidden).toBeRequired()

		expect(hidden.getAttribute('aria-describedby')).toContain(messageId)

		expect(field.id).not.toBe(hidden.id)

		expect(field).not.toBeRequired()

		expect(field).not.toHaveAttribute('aria-describedby')
	})

	it('names the hidden input from the Field label, not the placeholder', () => {
		const { container } = renderUI(
			<Field>
				<Label>Resume</Label>
				<FileUploadInput />
			</Field>,
		)

		const hidden = fileInput(container)

		expect(hidden).toHaveAccessibleName('Resume')

		expect(hidden).not.toHaveAttribute('aria-label')
	})

	it('names the display button from the Field label and then the selection', () => {
		const { container } = renderUI(
			<Field>
				<Label>Resume</Label>
				<FileUploadInput />
			</Field>,
		)

		expect(display(container)).toHaveAccessibleName('Resume Choose a file')

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(display(container)).toHaveAccessibleName('Resume resume.pdf')
	})

	it('names the drop zone and its overlay from the Field label and marks both invalid', () => {
		const { container } = renderUI(
			<Field severity="error">
				<Label>Resume</Label>
				<FileUploadDrop />
			</Field>,
		)

		const zone = dropzone(container)

		// jsdom hides neither prompt, so only the start of the name is fixed here.
		expect(zone).toHaveAccessibleName(/^Resume Drop files here or click to browse/)

		expect(zone).toHaveAttribute('aria-invalid', 'true')

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		const overlay = present(dropzone(container).querySelector('button'), 'overlay button')

		expect(overlay).toHaveAccessibleName('Resume resume.pdf')

		expect(overlay).toHaveAttribute('aria-invalid', 'true')
	})

	it('keeps the overlay name outside a Field', () => {
		const { container } = renderUI(<FileUploadDrop />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		const overlay = present(dropzone(container).querySelector('button'), 'overlay button')

		expect(overlay).toHaveAccessibleName('Choose a different file')

		expect(overlay).not.toHaveAttribute('aria-invalid')
	})

	it.each([
		['drop', <FileUploadDrop key="drop">Upload</FileUploadDrop>],
		['input', <FileUploadInput key="input" />],
		['button', <FileUploadButton key="button">Upload</FileUploadButton>],
	])('disables the hidden input and the %s trigger from a disabled Control', (_, node) => {
		const { container } = renderUI(<Control disabled>{node}</Control>)

		const hidden = fileInput(container)

		expect(hidden).toBeDisabled()

		for (const trigger of screen.getAllByRole('button')) expect(trigger).toBeDisabled()
	})

	it('ignores dropped files under a disabled Control', () => {
		const onAccept = vi.fn()

		const { container } = renderUI(
			<Control disabled>
				<FileUploadDrop onAccept={onAccept}>Upload</FileUploadDrop>
			</Control>,
		)

		const zone = dropzone(container)

		fireEvent.drop(zone, { dataTransfer: { files: makeFileList([new File(['x'], 'resume.pdf')]) } })

		expect(onAccept).not.toHaveBeenCalled()
	})

	it('keeps the trigger name on the hidden input outside a Field', () => {
		const { container } = renderUI(<FileUploadInput placeholder="Pick a resume" />)

		const hidden = fileInput(container)

		expect(hidden).toHaveAccessibleName('Pick a resume')
	})
})

describe('FileUpload disabled dropzone', () => {
	it('does not light up data-drag-over while disabled', () => {
		const { container } = renderUI(<FileUploadDrop disabled>Upload</FileUploadDrop>)

		const zone = dropzone(container)

		fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'], files: makeFileList([]) } })

		expect(zone).not.toHaveAttribute('data-drag-over')
	})

	it('ignores dropped files while disabled', () => {
		const onAccept = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop disabled onAccept={onAccept}>
				Upload
			</FileUploadDrop>,
		)

		const zone = dropzone(container)

		const files = makeFileList([new File(['x'], 'resume.pdf')])

		fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'], files } })

		fireEvent.drop(zone, { dataTransfer: { files } })

		expect(onAccept).not.toHaveBeenCalled()
	})

	it('accepts dropped files when enabled', () => {
		const onAccept = vi.fn()

		const { container } = renderUI(<FileUploadDrop onAccept={onAccept}>Upload</FileUploadDrop>)

		const zone = dropzone(container)

		fireEvent.drop(zone, { dataTransfer: { files: makeFileList([new File(['x'], 'resume.pdf')]) } })

		expect(onAccept).toHaveBeenCalledTimes(1)
	})
})

describe('FileUpload constraints', () => {
	const fileOfSize = (name: string, size: number) => new File(['x'.repeat(size)], name)

	it('splits a drop into accepted onAccept and rejected onReject by maxSize', () => {
		const onAccept = vi.fn()

		const onReject = vi.fn()

		const small = fileOfSize('small.txt', 50)

		const big = fileOfSize('big.txt', 500)

		const { container } = renderUI(
			<FileUploadDrop multiple maxSize={100} onAccept={onAccept} onReject={onReject}>
				Upload
			</FileUploadDrop>,
		)

		fireEvent.drop(dropzone(container), { dataTransfer: { files: makeFileList([small, big]) } })

		expect(onAccept).toHaveBeenCalledWith([small])

		expect(onReject).toHaveBeenCalledWith([{ file: big, reason: 'size' }])
	})

	it('does not fire onReject when every file satisfies the constraints', () => {
		const onAccept = vi.fn()

		const onReject = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop multiple maxCount={2} onAccept={onAccept} onReject={onReject}>
				Upload
			</FileUploadDrop>,
		)

		fireEvent.drop(dropzone(container), {
			dataTransfer: { files: makeFileList([fileOfSize('a.txt', 1), fileOfSize('b.txt', 1)]) },
		})

		expect(onAccept).toHaveBeenCalledWith([
			expect.objectContaining({ name: 'a.txt' }),
			expect.objectContaining({ name: 'b.txt' }),
		])

		expect(onReject).not.toHaveBeenCalled()
	})
})

describe('FileUpload announcements', () => {
	it('announces a single selected file by name', async () => {
		const { container } = renderUI(<FileUploadDrop>Upload</FileUploadDrop>)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		await expectAnnouncement('Selected resume.pdf')
	})

	it('announces the count and names for a multi-file selection', async () => {
		const { container } = renderUI(<FileUploadDrop multiple>Upload</FileUploadDrop>)

		selectFiles(container, [new File(['a'], 'a.png'), new File(['b'], 'b.png')])

		await expectAnnouncement('Selected 2 files: a.png, b.png')
	})
})

describe('FileUpload drag-over reporting', () => {
	it('reports true when a drag enters and false when it leaves', () => {
		const onDragOverChange = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop onDragOverChange={onDragOverChange}>Upload</FileUploadDrop>,
		)

		const zone = dropzone(container)

		const files = makeFileList([new File(['x'], 'resume.pdf')])

		fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'], files } })

		expect(onDragOverChange).toHaveBeenCalledExactlyOnceWith(true)

		fireEvent.dragLeave(zone, { dataTransfer: { types: ['Files'], files } })

		expect(onDragOverChange).toHaveBeenLastCalledWith(false)

		expect(onDragOverChange).toHaveBeenCalledTimes(2)
	})

	// A text, link, or element drag lists no `'Files'` type. The zone must not
	// light up for it or claim it as a drop target.
	it('ignores a drag that carries no file', () => {
		const onDragOverChange = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop onDragOverChange={onDragOverChange}>Upload</FileUploadDrop>,
		)

		const zone = dropzone(container)

		const dataTransfer = { types: ['text/plain'], files: makeFileList([]) }

		fireEvent.dragEnter(zone, { dataTransfer })

		const notPrevented = fireEvent.dragOver(zone, { dataTransfer })

		expect(zone).not.toHaveAttribute('data-drag-over')

		expect(onDragOverChange).not.toHaveBeenCalledWith(true)

		expect(notPrevented).toBe(true)
	})

	// The depth counter exists because `dragleave` bubbles on every child
	// boundary. The report reads the derived flag, so a crossing inside the zone
	// leaves it untouched.
	it('says nothing while a drag crosses between children of the zone', () => {
		const onDragOverChange = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop onDragOverChange={onDragOverChange}>
				<span data-testid="child">Upload</span>
			</FileUploadDrop>,
		)

		const zone = dropzone(container)

		const child = present(container.querySelector('[data-testid="child"]'), '[data-testid="child"]')

		const files = makeFileList([new File(['x'], 'resume.pdf')])

		fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'], files } })

		onDragOverChange.mockClear()

		fireEvent.dragEnter(child, { dataTransfer: { types: ['Files'], files } })

		fireEvent.dragLeave(zone, { dataTransfer: { types: ['Files'], files } })

		expect(onDragOverChange).not.toHaveBeenCalled()
	})

	it('reports false on a drop', () => {
		const onDragOverChange = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop onDragOverChange={onDragOverChange}>Upload</FileUploadDrop>,
		)

		const zone = dropzone(container)

		const files = makeFileList([new File(['x'], 'resume.pdf')])

		fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'], files } })

		fireEvent.drop(zone, { dataTransfer: { files } })

		expect(onDragOverChange).toHaveBeenLastCalledWith(false)
	})

	it('says nothing on mount, and nothing while disabled', () => {
		const onDragOverChange = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop disabled onDragOverChange={onDragOverChange}>
				Upload
			</FileUploadDrop>,
		)

		expect(onDragOverChange).not.toHaveBeenCalled()

		fireEvent.dragEnter(dropzone(container), {
			dataTransfer: { types: ['Files'], files: makeFileList([]) },
		})

		expect(onDragOverChange).not.toHaveBeenCalled()
	})
})

describe('FileUpload drop filtering', () => {
	const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

	const png = new File(['x'], 'a.png', { type: 'image/png' })

	const jpg = new File(['x'], 'b.jpg', { type: 'image/jpeg' })

	it('routes a dropped file outside accept to onReject with reason "type"', () => {
		const onAccept = vi.fn()

		const onReject = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop accept="image/*" multiple onAccept={onAccept} onReject={onReject} />,
		)

		fireEvent.drop(dropzone(container), { dataTransfer: { files: makeFileList([pdf, png]) } })

		expect(onAccept).toHaveBeenCalledWith([png])

		expect(onReject).toHaveBeenCalledWith([{ file: pdf, reason: 'type' }])
	})

	it('keeps the first file of a multi-file drop without multiple', () => {
		const onAccept = vi.fn()

		const onReject = vi.fn()

		const { container } = renderUI(<FileUploadDrop onAccept={onAccept} onReject={onReject} />)

		fireEvent.drop(dropzone(container), { dataTransfer: { files: makeFileList([png, jpg]) } })

		expect(onAccept).toHaveBeenCalledWith([png])

		expect(onReject).toHaveBeenCalledWith([{ file: jpg, reason: 'count' }])

		expect(screen.getByText('a.png')).toBeInTheDocument()
	})
})

describe('FileUpload focus handoff', () => {
	const file = new File(['x'], 'resume.pdf')

	it('moves focus from the empty drop zone to the overlay after a pick', () => {
		const { container } = renderUI(<FileUploadDrop />)

		dropzone(container).focus()

		selectFiles(container, [file])

		expect(screen.getByRole('button', { name: 'Choose a different file' })).toHaveFocus()
	})

	it('moves focus from Reset to the empty drop zone', () => {
		const { container } = renderUI(<FileUploadDrop />)

		selectFiles(container, [file])

		const reset = screen.getByRole('button', { name: 'Reset' })

		reset.focus()

		fireEvent.click(reset)

		expect(dropzone(container)).toHaveFocus()
	})

	it('leaves focus alone when a drop lands while focus is outside the zone', () => {
		const { container } = renderUI(
			<>
				<button type="button">Elsewhere</button>
				<FileUploadDrop />
			</>,
		)

		const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })

		elsewhere.focus()

		fireEvent.drop(dropzone(container), { dataTransfer: { files: makeFileList([file]) } })

		expect(elsewhere).toHaveFocus()
	})

	// A re-pick in the filled state keeps the state, so no swap uses the note
	// that focus was in the zone. A later swap from `children` must not use it.
	it('leaves focus alone when a children swap follows a re-pick', () => {
		const { container, rerender } = renderUI(
			<>
				<button type="button">Elsewhere</button>
				<FileUploadDrop />
			</>,
		)

		selectFiles(container, [file])

		screen.getByRole('button', { name: 'Choose a different file' }).focus()

		selectFiles(container, [new File(['y'], 'cover.pdf')])

		const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })

		elsewhere.focus()

		rerender(
			<>
				<button type="button">Elsewhere</button>
				<FileUploadDrop>Upload</FileUploadDrop>
			</>,
		)

		expect(elsewhere).toHaveFocus()
	})

	it('moves focus from the button variant Reset to the trigger', () => {
		const { container } = renderUI(<FileUploadButton />)

		selectFiles(container, [file])

		const reset = screen.getByRole('button', { name: 'Reset' })

		reset.focus()

		fireEvent.click(reset)

		expect(screen.getByRole('button', { name: 'Upload' })).toHaveFocus()
	})

	it('moves focus from the input variant clear button to the field', () => {
		const { container } = renderUI(<FileUploadInput />)

		selectFiles(container, [file])

		const clear = screen.getByRole('button', { name: 'Clear selected file(s)' })

		clear.focus()

		fireEvent.click(clear)

		expect(display(container)).toHaveFocus()
	})

	it('moves focus from the input variant Browse button to the field before the picker opens', () => {
		const { container } = renderUI(<FileUploadInput />)

		const browse = screen.getByRole('button', { name: 'Browse files' })

		browse.focus()

		fireEvent.click(browse)

		expect(display(container)).toHaveFocus()
	})
})

describe('FileUpload value binding', () => {
	it('shows a defaultValue selection when uncontrolled', () => {
		const { container } = renderUI(<FileUploadInput defaultValue={[new File(['x'], 'seed.pdf')]} />)

		expect(display(container)).toHaveTextContent('seed.pdf')
	})

	it('shows a controlled value and reports a pick through onValueChange', () => {
		const onValueChange = vi.fn()

		const picked = new File(['y'], 'picked.pdf')

		const { container } = renderUI(
			<FileUploadInput value={[new File(['x'], 'held.pdf')]} onValueChange={onValueChange} />,
		)

		selectFiles(container, [picked])

		expect(onValueChange).toHaveBeenLastCalledWith([picked])

		// The owner did not take the pick, so the display keeps the held file.
		expect(display(container)).toHaveTextContent('held.pdf')
	})

	it('reports a clear through onValueChange as an empty list', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<FileUploadInput onValueChange={onValueChange} />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		fireEvent.click(screen.getByRole('button', { name: 'Clear selected file(s)' }))

		expect(onValueChange).toHaveBeenLastCalledWith([])
	})

	it('binds to a Form field by name, submits the files, and follows a Form reset', async () => {
		const onSubmit = vi.fn()

		const file = new File(['x'], 'resume.pdf')

		const { container } = renderUI(
			<Form defaultValues={{ files: [] as File[] }} onSubmit={onSubmit}>
				<FileUploadInput name="files" placeholder="Choose a file" />
				<button type="reset">Reset</button>
				<button type="submit">Submit</button>
			</Form>,
		)

		selectFiles(container, [file])

		expect(display(container)).toHaveTextContent('resume.pdf')

		fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

		await act(() => Promise.resolve())

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ files: [file] }),
			expect.anything(),
		)

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		expect(display(container)).toHaveTextContent('Choose a file')
	})

	it('marks the field invalid from a bound Form error', async () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ files: [] as File[] }}
				validate={{ files: (v) => ((v as File[]).length === 0 ? 'Pick a file' : undefined) }}
			>
				<FileUploadInput name="files" />
				<button type="submit">Submit</button>
			</Form>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

		await act(() => Promise.resolve())

		expect(fileInput(container)).toHaveAttribute('aria-invalid', 'true')

		expect(display(container)).toHaveAttribute('aria-invalid', 'true')
	})

	it('goes back to defaultValue on a native form reset when uncontrolled', async () => {
		const { container } = renderUI(
			<form>
				<FileUploadDrop />
				<button type="reset">Reset form</button>
			</form>,
		)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.getByText('resume.pdf')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Reset form' }))

		await act(() => new Promise(requestAnimationFrame))

		expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
	})
})
