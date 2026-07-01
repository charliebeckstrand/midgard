import { describe, expect, it, vi } from 'vitest'
import { Control } from '../../components/control'
import { Description, Message } from '../../components/fieldset'
import { FileUpload } from '../../components/file-upload'
import { fireEvent, makeFileList, renderUI, screen, waitFor } from '../helpers'

describe('FileUpload', () => {
	it('renders a visually hidden file input', () => {
		const { container } = renderUI(<FileUpload>Upload</FileUpload>)

		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		expect(input).toBeInTheDocument()

		expect(input.className).toContain('sr-only')
	})

	it('accepts the accept prop', () => {
		const { container } = renderUI(<FileUpload accept="image/*">Upload</FileUpload>)

		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		expect(input.accept).toBe('image/*')
	})
})

describe('FileUpload drop variant selection', () => {
	function selectFiles(container: HTMLElement, files: File[]) {
		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		fireEvent.change(input, { target: { files: makeFileList(files) } })
	}

	it('shows the drop prompt when empty', () => {
		renderUI(<FileUpload />)

		expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
	})

	it('replaces the prompt with the filename and a Reset button once a file is selected', () => {
		const { container } = renderUI(<FileUpload />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.queryByText('Drop files here or click to browse')).not.toBeInTheDocument()

		expect(screen.getByText('resume.pdf')).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
	})

	it('shows an "x files selected" summary for a multi-file selection', () => {
		const { container } = renderUI(<FileUpload multiple />)

		selectFiles(container, [new File(['a'], 'a.png'), new File(['b'], 'b.png')])

		expect(screen.getByText('2 files selected')).toBeInTheDocument()
	})

	it('clears the selection and restores the drop prompt when Reset is clicked', () => {
		const onFiles = vi.fn()

		const { container } = renderUI(<FileUpload onFiles={onFiles} />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()

		expect(onFiles).toHaveBeenLastCalledWith([])
	})

	it('ignores the built-in selection display when custom children are provided', () => {
		const { container } = renderUI(<FileUpload>Custom prompt</FileUpload>)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.getByText('Custom prompt')).toBeInTheDocument()

		expect(screen.queryByText('resume.pdf')).not.toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
	})
})

describe('FileUpload input variant', () => {
	it('renders a read-only input with the configured placeholder', () => {
		renderUI(<FileUpload variant="input" placeholder="Choose…" />)

		const input = screen.getByPlaceholderText('Choose…')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('readonly')
	})

	it('falls back to a default placeholder when none is provided', () => {
		renderUI(<FileUpload variant="input" />)

		expect(screen.getByPlaceholderText('Choose a file')).toBeInTheDocument()
	})

	it('disables the input when disabled is set', () => {
		renderUI(<FileUpload variant="input" disabled />)

		expect(screen.getByPlaceholderText('Choose a file')).toBeDisabled()
	})

	it('renders the empty-state upload affordance as a button that opens the picker', () => {
		const { container } = renderUI(<FileUpload variant="input" />)

		const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

		const click = vi.spyOn(fileInput, 'click')

		fireEvent.click(screen.getByRole('button', { name: 'Browse files' }))

		expect(click).toHaveBeenCalledTimes(1)
	})
})

describe('FileUpload input variant selection', () => {
	function selectFiles(container: HTMLElement, files: File[]) {
		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		fireEvent.change(input, { target: { files: makeFileList(files) } })
	}

	it('shows the filename as the value once a file is selected', () => {
		const { container } = renderUI(<FileUpload variant="input" />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.getByDisplayValue('resume.pdf')).toBeInTheDocument()
	})

	it('shows an "x files selected" summary for a multi-file selection', () => {
		const { container } = renderUI(<FileUpload variant="input" multiple />)

		selectFiles(container, [new File(['a'], 'a.png'), new File(['b'], 'b.png')])

		expect(screen.getByDisplayValue('2 files selected')).toBeInTheDocument()
	})

	it('swaps the suffix to a clear button once a file is selected', () => {
		const { container } = renderUI(<FileUpload variant="input" />)

		expect(screen.queryByRole('button', { name: 'Clear selected file(s)' })).not.toBeInTheDocument()

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.getByRole('button', { name: 'Clear selected file(s)' })).toBeInTheDocument()
	})

	it('clears the selection and restores the placeholder when the clear button is clicked', () => {
		const onFiles = vi.fn()

		const { container } = renderUI(
			<FileUpload variant="input" placeholder="Choose…" onFiles={onFiles} />,
		)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		fireEvent.click(screen.getByRole('button', { name: 'Clear selected file(s)' }))

		expect(screen.getByPlaceholderText('Choose…')).toHaveValue('')

		expect(onFiles).toHaveBeenLastCalledWith([])
	})
})

describe('FileUpload button variant', () => {
	it('renders a button with default copy when no children are provided', () => {
		renderUI(<FileUpload variant="button" />)

		expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
	})

	it('uses children as the button label when provided', () => {
		renderUI(<FileUpload variant="button">Pick a file</FileUpload>)

		expect(screen.getByRole('button', { name: 'Pick a file' })).toBeInTheDocument()
	})

	it('leaves the button enabled when disabled is not set', () => {
		renderUI(<FileUpload variant="button">Pick</FileUpload>)

		expect(screen.getByRole('button', { name: 'Pick' })).not.toBeDisabled()
	})

	it('disables the button when disabled is set', () => {
		renderUI(
			<FileUpload variant="button" disabled>
				Pick
			</FileUpload>,
		)

		expect(screen.getByRole('button', { name: 'Pick' })).toBeDisabled()
	})
})

describe('FileUpload button variant selection', () => {
	function selectFiles(container: HTMLElement, files: File[]) {
		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		fireEvent.change(input, { target: { files: makeFileList(files) } })
	}

	it('swaps the trigger to a Reset button once a file is selected', () => {
		const { container } = renderUI(<FileUpload variant="button" />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		expect(screen.queryByRole('button', { name: 'Upload' })).not.toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
	})

	it('clears the selection and restores the trigger when Reset is clicked', () => {
		const onFiles = vi.fn()

		const { container } = renderUI(<FileUpload variant="button" onFiles={onFiles} />)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()

		expect(onFiles).toHaveBeenLastCalledWith([])
	})
})

describe('FileUpload + Control', () => {
	it('surfaces invalid and required state onto the hidden file input', () => {
		const { container } = renderUI(
			<Control invalid required>
				<FileUpload>Upload</FileUpload>
			</Control>,
		)

		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(input).toBeRequired()
	})

	it('points the hidden file input aria-describedby at the control description and message', () => {
		const { container } = renderUI(
			<Control id="doc" invalid>
				<Description>PDF only</Description>
				<FileUpload>Upload</FileUpload>
				<Message>A file is required</Message>
			</Control>,
		)

		const describedBy = (
			container.querySelector('input[type="file"]') as HTMLInputElement
		).getAttribute('aria-describedby')

		expect(describedBy).toContain('doc-description')

		expect(describedBy).toContain('doc-error')
	})
})

describe('FileUpload disabled dropzone', () => {
	const dropzone = (container: HTMLElement) =>
		container.querySelector('[data-slot="file-upload"]') as HTMLElement

	it('does not light up data-drag-over while disabled', () => {
		const { container } = renderUI(<FileUpload disabled>Upload</FileUpload>)

		const zone = dropzone(container)

		fireEvent.dragEnter(zone, { dataTransfer: { files: makeFileList([]) } })

		expect(zone).not.toHaveAttribute('data-drag-over')
	})

	it('ignores dropped files while disabled', () => {
		const onFiles = vi.fn()

		const { container } = renderUI(
			<FileUpload disabled onFiles={onFiles}>
				Upload
			</FileUpload>,
		)

		const zone = dropzone(container)

		const files = makeFileList([new File(['x'], 'resume.pdf')])

		fireEvent.dragEnter(zone, { dataTransfer: { files } })

		fireEvent.drop(zone, { dataTransfer: { files } })

		expect(onFiles).not.toHaveBeenCalled()
	})

	it('accepts dropped files when enabled', () => {
		const onFiles = vi.fn()

		const { container } = renderUI(<FileUpload onFiles={onFiles}>Upload</FileUpload>)

		const zone = dropzone(container)

		fireEvent.drop(zone, { dataTransfer: { files: makeFileList([new File(['x'], 'resume.pdf')]) } })

		expect(onFiles).toHaveBeenCalledTimes(1)
	})
})

describe('FileUpload constraints', () => {
	const dropzone = (container: HTMLElement) =>
		container.querySelector('[data-slot="file-upload"]') as HTMLElement

	const fileOfSize = (name: string, size: number) => new File(['x'.repeat(size)], name)

	it('splits a drop into accepted onFiles and rejected onReject by maxSize', () => {
		const onFiles = vi.fn()

		const onReject = vi.fn()

		const small = fileOfSize('small.txt', 50)

		const big = fileOfSize('big.txt', 500)

		const { container } = renderUI(
			<FileUpload multiple maxSize={100} onFiles={onFiles} onReject={onReject}>
				Upload
			</FileUpload>,
		)

		fireEvent.drop(dropzone(container), { dataTransfer: { files: makeFileList([small, big]) } })

		expect(onFiles).toHaveBeenCalledWith([small])

		expect(onReject).toHaveBeenCalledWith([{ file: big, reason: 'size' }])
	})

	it('does not fire onReject when every file satisfies the constraints', () => {
		const onFiles = vi.fn()

		const onReject = vi.fn()

		const { container } = renderUI(
			<FileUpload multiple maxCount={2} onFiles={onFiles} onReject={onReject}>
				Upload
			</FileUpload>,
		)

		fireEvent.drop(dropzone(container), {
			dataTransfer: { files: makeFileList([fileOfSize('a.txt', 1), fileOfSize('b.txt', 1)]) },
		})

		expect(onFiles).toHaveBeenCalledWith([
			expect.objectContaining({ name: 'a.txt' }),
			expect.objectContaining({ name: 'b.txt' }),
		])

		expect(onReject).not.toHaveBeenCalled()
	})
})

describe('FileUpload announcements', () => {
	const politeRegion = () =>
		document.body.querySelector('[data-slot="live-region"][aria-live="polite"]')

	function selectFiles(container: HTMLElement, files: File[]) {
		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		fireEvent.change(input, { target: { files: makeFileList(files) } })
	}

	it('announces a single selected file by name', async () => {
		const { container } = renderUI(<FileUpload>Upload</FileUpload>)

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		await waitFor(() => expect(politeRegion()).toHaveTextContent('Selected resume.pdf'))
	})

	it('announces the count and names for a multi-file selection', async () => {
		const { container } = renderUI(<FileUpload multiple>Upload</FileUpload>)

		selectFiles(container, [new File(['a'], 'a.png'), new File(['b'], 'b.png')])

		await waitFor(() => expect(politeRegion()).toHaveTextContent('Selected 2 files: a.png, b.png'))
	})
})
