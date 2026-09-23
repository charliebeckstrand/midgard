import { describe, expect, it, vi } from 'vitest'
import { Control } from '../../components/control'
import { Description, Field, Label, Message } from '../../components/fieldset'
import { FileUploadButton, FileUploadDrop, FileUploadInput } from '../../components/file-upload'
import {
	expectAnnouncement,
	fireEvent,
	getSlot,
	makeFileList,
	present,
	renderUI,
	screen,
} from '../helpers'

describe('FileUpload', () => {
	it('renders a visually hidden file input', () => {
		const { container } = renderUI(<FileUploadDrop>Upload</FileUploadDrop>)

		const input = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		expect(input).toBeInTheDocument()

		expect(input.className).toContain('sr-only')
	})

	it('accepts the accept prop', () => {
		const { container } = renderUI(<FileUploadDrop accept="image/*">Upload</FileUploadDrop>)

		const input = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		expect(input.accept).toBe('image/*')
	})
})

describe('FileUpload drop variant selection', () => {
	function selectFiles(container: HTMLElement, files: File[]) {
		const input = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		fireEvent.change(input, { target: { files: makeFileList(files) } })
	}

	it('shows the drop prompt when empty', () => {
		renderUI(<FileUploadDrop />)

		expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
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

		const fileInput = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		const click = vi.spyOn(fileInput, 'click')

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
	it('renders a read-only input with the configured placeholder', () => {
		renderUI(<FileUploadInput placeholder="Choose…" />)

		const input = screen.getByPlaceholderText('Choose…')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('readonly')
	})

	it('falls back to a default placeholder when none is provided', () => {
		renderUI(<FileUploadInput />)

		expect(screen.getByPlaceholderText('Choose a file')).toBeInTheDocument()
	})

	it('disables the input when disabled is set', () => {
		renderUI(<FileUploadInput disabled />)

		expect(screen.getByPlaceholderText('Choose a file')).toBeDisabled()
	})

	it('renders the empty-state upload affordance as a button that opens the picker', () => {
		const { container } = renderUI(<FileUploadInput />)

		const fileInput = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		const click = vi.spyOn(fileInput, 'click')

		fireEvent.click(screen.getByRole('button', { name: 'Browse files' }))

		expect(click).toHaveBeenCalledTimes(1)
	})
})

describe('FileUpload input variant selection', () => {
	function selectFiles(container: HTMLElement, files: File[]) {
		const input = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		fireEvent.change(input, { target: { files: makeFileList(files) } })
	}

	it('shows the filename as the value once a file is selected', () => {
		const { container } = renderUI(<FileUploadInput />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.getByDisplayValue('resume.pdf')).toBeInTheDocument()
	})

	it('shows an "x files selected" summary for a multi-file selection', () => {
		const { container } = renderUI(<FileUploadInput multiple />)

		selectFiles(container, [new File(['a'], 'a.png'), new File(['b'], 'b.png')])

		expect(screen.getByDisplayValue('2 files selected')).toBeInTheDocument()
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

		expect(screen.getByPlaceholderText('Choose…')).toHaveValue('')

		expect(onAccept).toHaveBeenLastCalledWith([])
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
	function selectFiles(container: HTMLElement, files: File[]) {
		const input = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		fireEvent.change(input, { target: { files: makeFileList(files) } })
	}

	it('keeps the Upload trigger and adds a Reset button once a file is selected', () => {
		const { container } = renderUI(<FileUploadButton />)

		const fileInput = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()

		// The trigger stays operable so a different file can be picked.
		const click = vi.spyOn(fileInput, 'click')

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

		const input = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

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

		const describedBy = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		).getAttribute('aria-describedby')

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

		const hidden = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		const display = screen.getByPlaceholderText('Choose a file')

		const label = getSlot<HTMLLabelElement>(container, 'label')

		const messageId = getSlot(container, 'message').id

		expect(hidden.id).not.toBe('')

		expect(label.htmlFor).toBe(hidden.id)

		expect(hidden).toBeRequired()

		expect(hidden.getAttribute('aria-describedby')).toContain(messageId)

		expect(display.id).not.toBe(hidden.id)

		expect(display).not.toBeRequired()

		expect(display).not.toHaveAttribute('aria-describedby')
	})

	it('names the hidden input from the Field label, not the placeholder', () => {
		const { container } = renderUI(
			<Field>
				<Label>Resume</Label>
				<FileUploadInput />
			</Field>,
		)

		const hidden = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		expect(hidden).toHaveAccessibleName('Resume')

		expect(hidden).not.toHaveAttribute('aria-label')
	})

	it('names the display field from the Field label', () => {
		renderUI(
			<Field>
				<Label>Resume</Label>
				<FileUploadInput />
			</Field>,
		)

		expect(screen.getByPlaceholderText('Choose a file')).toHaveAccessibleName('Resume')
	})

	it.each([
		['drop', <FileUploadDrop key="drop">Upload</FileUploadDrop>],
		['input', <FileUploadInput key="input" />],
		['button', <FileUploadButton key="button">Upload</FileUploadButton>],
	])('disables the hidden input and the %s trigger from a disabled Control', (_, node) => {
		const { container } = renderUI(<Control disabled>{node}</Control>)

		const hidden = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

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

		const zone = getSlot(container, 'file-upload')

		fireEvent.drop(zone, { dataTransfer: { files: makeFileList([new File(['x'], 'resume.pdf')]) } })

		expect(onAccept).not.toHaveBeenCalled()
	})

	it('keeps the trigger name on the hidden input outside a Field', () => {
		const { container } = renderUI(<FileUploadInput placeholder="Pick a resume" />)

		const hidden = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		expect(hidden).toHaveAccessibleName('Pick a resume')
	})
})

describe('FileUpload disabled dropzone', () => {
	const dropzone = (container: HTMLElement) =>
		present(container.querySelector('[data-slot="file-upload"]'), '[data-slot="file-upload"]')

	it('does not light up data-drag-over while disabled', () => {
		const { container } = renderUI(<FileUploadDrop disabled>Upload</FileUploadDrop>)

		const zone = dropzone(container)

		fireEvent.dragEnter(zone, { dataTransfer: { files: makeFileList([]) } })

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

		fireEvent.dragEnter(zone, { dataTransfer: { files } })

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
	const dropzone = (container: HTMLElement) =>
		present(container.querySelector('[data-slot="file-upload"]'), '[data-slot="file-upload"]')

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
	function selectFiles(container: HTMLElement, files: File[]) {
		const input = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		fireEvent.change(input, { target: { files: makeFileList(files) } })
	}

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
	const dropzone = (container: HTMLElement) =>
		present(container.querySelector('[data-slot="file-upload"]'), '[data-slot="file-upload"]')

	it('reports true when a drag enters and false when it leaves', () => {
		const onDragOverChange = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop onDragOverChange={onDragOverChange}>Upload</FileUploadDrop>,
		)

		const zone = dropzone(container)

		const files = makeFileList([new File(['x'], 'resume.pdf')])

		fireEvent.dragEnter(zone, { dataTransfer: { files } })

		expect(onDragOverChange).toHaveBeenCalledExactlyOnceWith(true)

		fireEvent.dragLeave(zone, { dataTransfer: { files } })

		expect(onDragOverChange).toHaveBeenLastCalledWith(false)

		expect(onDragOverChange).toHaveBeenCalledTimes(2)
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

		fireEvent.dragEnter(zone, { dataTransfer: { files } })

		onDragOverChange.mockClear()

		fireEvent.dragEnter(child, { dataTransfer: { files } })

		fireEvent.dragLeave(zone, { dataTransfer: { files } })

		expect(onDragOverChange).not.toHaveBeenCalled()
	})

	it('reports false on a drop', () => {
		const onDragOverChange = vi.fn()

		const { container } = renderUI(
			<FileUploadDrop onDragOverChange={onDragOverChange}>Upload</FileUploadDrop>,
		)

		const zone = dropzone(container)

		const files = makeFileList([new File(['x'], 'resume.pdf')])

		fireEvent.dragEnter(zone, { dataTransfer: { files } })

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
			dataTransfer: { files: makeFileList([]) },
		})

		expect(onDragOverChange).not.toHaveBeenCalled()
	})
})
