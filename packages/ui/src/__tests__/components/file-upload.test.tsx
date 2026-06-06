import { describe, expect, it } from 'vitest'
import { Control } from '../../components/control'
import { Description, Message } from '../../components/fieldset'
import { FileUpload } from '../../components/file-upload'
import { bySlot, fireEvent, makeFileList, renderUI, screen, waitFor } from '../helpers'

describe('FileUpload', () => {
	it('renders with data-slot="file-upload"', () => {
		const { container } = renderUI(<FileUpload>Drop files here</FileUpload>)

		const el = bySlot(container, 'file-upload')

		expect(el).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<FileUpload>Drop files here</FileUpload>)

		expect(screen.getByText('Drop files here')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<FileUpload className="custom">Upload</FileUpload>)

		const el = bySlot(container, 'file-upload')

		expect(el?.className).toContain('custom')
	})

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

	it('disables the button when disabled is set', () => {
		renderUI(<FileUpload variant="button">Pick</FileUpload>)

		expect(screen.getByRole('button', { name: 'Pick' })).toBeInTheDocument()
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

describe('FileUpload announcements', () => {
	const politeRegion = () =>
		document.body.querySelector('[data-slot="live-region"][aria-live="polite"]')

	function selectFiles(container: HTMLElement, files: File[]) {
		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		fireEvent.change(input, { target: { files: makeFileList(files) } })
	}

	it('announces a single selected file by name', async () => {
		const { container } = renderUI(<FileUpload>Upload</FileUpload>, { announcer: true })

		selectFiles(container, [new File(['x'], 'resume.pdf')])

		await waitFor(() => expect(politeRegion()).toHaveTextContent('Selected resume.pdf'))
	})

	it('announces the count and names for a multi-file selection', async () => {
		const { container } = renderUI(<FileUpload multiple>Upload</FileUpload>, { announcer: true })

		selectFiles(container, [new File(['a'], 'a.png'), new File(['b'], 'b.png')])

		await waitFor(() => expect(politeRegion()).toHaveTextContent('Selected 2 files: a.png, b.png'))
	})
})
