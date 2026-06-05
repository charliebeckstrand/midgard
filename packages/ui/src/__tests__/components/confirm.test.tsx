import { describe, expect, it, vi } from 'vitest'
import { Confirm } from '../../components/confirm'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Confirm', () => {
	it('renders the default title', () => {
		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={() => {}} />)

		expect(screen.getByText('Are you sure?')).toBeInTheDocument()
	})

	it('exposes itself as an alertdialog', () => {
		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={() => {}} />)

		expect(screen.getByRole('alertdialog')).toBeInTheDocument()
	})

	it('renders a custom title and description', () => {
		renderUI(
			<Confirm
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
			<Confirm open onOpenChange={() => {}} onConfirm={() => {}}>
				<div>Extra content</div>
			</Confirm>,
		)

		expect(screen.getByText('Extra content')).toBeInTheDocument()
	})

	it('renders default Confirm and Cancel buttons', () => {
		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={() => {}} />)

		expect(screen.getByText('Confirm')).toBeInTheDocument()

		expect(screen.getByText('Cancel')).toBeInTheDocument()
	})

	it('renders custom button labels', () => {
		renderUI(
			<Confirm
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

		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={onConfirm} />)

		fireEvent.click(screen.getByText('Confirm'))

		expect(onConfirm).toHaveBeenCalled()
	})

	it('calls onOpenChange(false) when the cancel button is clicked', () => {
		const onOpenChange = vi.fn()

		renderUI(<Confirm open onOpenChange={onOpenChange} onConfirm={() => {}} />)

		fireEvent.click(screen.getByText('Cancel'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('disables the confirm button when confirm.disabled is true', () => {
		renderUI(
			<Confirm open onOpenChange={() => {}} onConfirm={() => {}} confirm={{ disabled: true }} />,
		)

		expect(screen.getByText('Confirm').closest('button')).toBeDisabled()
	})

	it('disables the cancel button when cancel.disabled is true', () => {
		renderUI(
			<Confirm open onOpenChange={() => {}} onConfirm={() => {}} cancel={{ disabled: true }} />,
		)

		expect(screen.getByText('Cancel').closest('button')).toBeDisabled()
	})
})
