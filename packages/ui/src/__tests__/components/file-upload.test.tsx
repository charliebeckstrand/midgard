import { describe, expect, it } from 'vitest'
import { FileUpload } from '../../components/file-upload'
import { bySlot, renderUI, screen } from '../helpers'

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
