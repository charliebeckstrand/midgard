import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog, Dialog } from '../../components/dialog'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Dialog', () => {
	it('renders with role="dialog" when open', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				Dialog content
			</Dialog>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')
	})

	it('renders children when open', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				Hello World
			</Dialog>,
		)

		expect(screen.getByText('Hello World')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<Dialog open={false} onOpenChange={() => {}}>
				Hidden content
			</Dialog>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})

describe('ConfirmDialog', () => {
	it('renders the default title', () => {
		renderUI(<ConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} />)

		expect(screen.getByText('Are you sure?')).toBeInTheDocument()
	})

	it('renders a custom title and description', () => {
		renderUI(
			<ConfirmDialog
				open
				onOpenChange={() => {}}
				onConfirm={() => {}}
				title="Delete item"
				description="This cannot be undone."
			/>,
		)

		expect(screen.getByText('Delete item')).toBeInTheDocument()

		expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
	})

	it('renders children between the description and actions', () => {
		renderUI(
			<ConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}}>
				<div>Extra content</div>
			</ConfirmDialog>,
		)

		expect(screen.getByText('Extra content')).toBeInTheDocument()
	})

	it('renders default Confirm and Cancel buttons', () => {
		renderUI(<ConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} />)

		expect(screen.getByText('Confirm')).toBeInTheDocument()

		expect(screen.getByText('Cancel')).toBeInTheDocument()
	})

	it('renders custom button labels', () => {
		renderUI(
			<ConfirmDialog
				open
				onOpenChange={() => {}}
				onConfirm={() => {}}
				confirm={{ label: 'Delete' }}
				cancel={{ label: 'Keep' }}
			/>,
		)

		expect(screen.getByText('Delete')).toBeInTheDocument()

		expect(screen.getByText('Keep')).toBeInTheDocument()
	})

	it('calls onConfirm when the confirm button is clicked', () => {
		const onConfirm = vi.fn()

		renderUI(<ConfirmDialog open onOpenChange={() => {}} onConfirm={onConfirm} />)

		fireEvent.click(screen.getByText('Confirm'))

		expect(onConfirm).toHaveBeenCalled()
	})

	it('calls onOpenChange(false) when the cancel button is clicked', () => {
		const onOpenChange = vi.fn()

		renderUI(<ConfirmDialog open onOpenChange={onOpenChange} onConfirm={() => {}} />)

		fireEvent.click(screen.getByText('Cancel'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('disables the confirm button when confirm.disabled is true', () => {
		renderUI(
			<ConfirmDialog
				open
				onOpenChange={() => {}}
				onConfirm={() => {}}
				confirm={{ disabled: true }}
			/>,
		)

		expect(screen.getByText('Confirm').closest('button')).toBeDisabled()
	})

	it('disables the cancel button when cancel.disabled is true', () => {
		renderUI(
			<ConfirmDialog
				open
				onOpenChange={() => {}}
				onConfirm={() => {}}
				cancel={{ disabled: true }}
			/>,
		)

		expect(screen.getByText('Cancel').closest('button')).toBeDisabled()
	})
})
