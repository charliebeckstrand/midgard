import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Confirm } from '../../components/confirm'
import { attach, bySlot, fireEvent, getSlot, renderUI, screen, waitFor } from '../helpers'

describe('Confirm', () => {
	it('renders an alertdialog with the default title and Confirm and Cancel buttons', () => {
		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={() => {}} />)

		expect(screen.getByRole('alertdialog')).toBeInTheDocument()

		expect(screen.getByText('Are you sure?')).toBeInTheDocument()

		expect(screen.getByText('Confirm')).toBeInTheDocument()

		expect(screen.getByText('Cancel')).toBeInTheDocument()
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

	it('describes the alertdialog by its children when no description is given', () => {
		renderUI(
			<Confirm open onOpenChange={() => {}} onConfirm={() => {}} title="Delete item">
				This cannot be undone.
			</Confirm>,
		)

		const dialog = screen.getByRole('alertdialog')

		const describedBy = dialog.getAttribute('aria-describedby')

		expect(describedBy).toBeTruthy()

		expect(document.getElementById(describedBy as string)).toHaveTextContent(
			'This cannot be undone.',
		)
	})

	it('keeps the explicit description as the accessible description over children', () => {
		renderUI(
			<Confirm
				open
				onOpenChange={() => {}}
				onConfirm={() => {}}
				description="This cannot be undone."
			>
				<div>Extra content</div>
			</Confirm>,
		)

		const dialog = screen.getByRole('alertdialog')

		const describedBy = dialog.getAttribute('aria-describedby')

		expect(document.getElementById(describedBy as string)).toHaveTextContent(
			'This cannot be undone.',
		)
	})

	it.each([
		['an empty string', ''],
		['null', null],
		['false', false],
	])('names the alertdialog with the default title when the title is %s', (_name, title) => {
		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={() => {}} title={title} />)

		expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Are you sure?')
	})

	it.each([
		['an empty string', ''],
		['null', null],
		['false', false],
	])(
		'describes the alertdialog by its children when the description is %s',
		(_name, description) => {
			renderUI(
				<Confirm
					open
					onOpenChange={() => {}}
					onConfirm={() => {}}
					title="Delete item"
					description={description}
				>
					This cannot be undone.
				</Confirm>,
			)

			expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription('This cannot be undone.')
		},
	)

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

	it('calls onConfirm with no argument when the confirm button is clicked', () => {
		const onConfirm = vi.fn()

		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={onConfirm} />)

		fireEvent.click(screen.getByText('Confirm'))

		expect(onConfirm).toHaveBeenCalledTimes(1)

		expect(onConfirm).toHaveBeenCalledWith()
	})

	it('calls onOpenChange(false) when the cancel button is clicked', () => {
		const onOpenChange = vi.fn()

		renderUI(<Confirm open onOpenChange={onOpenChange} onConfirm={() => {}} />)

		fireEvent.click(screen.getByText('Cancel'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('calls onCancel, then closes, when the cancel button is clicked', () => {
		const onCancel = vi.fn()

		const onOpenChange = vi.fn()

		renderUI(<Confirm open onOpenChange={onOpenChange} onConfirm={() => {}} onCancel={onCancel} />)

		fireEvent.click(screen.getByText('Cancel'))

		expect(onCancel).toHaveBeenCalledTimes(1)

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('leaves onCancel unfired when the dialog is dismissed with Escape', () => {
		const onCancel = vi.fn()

		const onOpenChange = vi.fn()

		renderUI(<Confirm open onOpenChange={onOpenChange} onConfirm={() => {}} onCancel={onCancel} />)

		fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })

		expect(onCancel).not.toHaveBeenCalled()
	})

	it('disables the confirm button when confirm.disabled is true', () => {
		renderUI(
			<Confirm open onOpenChange={() => {}} onConfirm={() => {}} confirm={{ disabled: true }} />,
		)

		expect(screen.getByText('Confirm').closest('button')).toBeDisabled()
	})

	it('keeps the focused confirm button enabled while confirm.pending is true, and cancels its click', () => {
		const onConfirm = vi.fn()

		const { rerender } = renderUI(<Confirm open onOpenChange={() => {}} onConfirm={onConfirm} />)

		const button = screen.getByText('Confirm').closest('button') as HTMLButtonElement

		button.focus()

		rerender(
			<Confirm open onOpenChange={() => {}} onConfirm={onConfirm} confirm={{ pending: true }} />,
		)

		// A disabled button drops the focus that it has, so a pending button stays enabled.
		expect(button).toBeEnabled()

		expect(button).toHaveAttribute('aria-disabled', 'true')

		expect(button).toHaveFocus()

		fireEvent.click(button)

		expect(onConfirm).not.toHaveBeenCalled()
	})

	it('disables the cancel button when cancel.disabled is true', () => {
		renderUI(
			<Confirm open onOpenChange={() => {}} onConfirm={() => {}} cancel={{ disabled: true }} />,
		)

		expect(screen.getByText('Cancel').closest('button')).toBeDisabled()
	})
})

describe('Confirm Dialog props', () => {
	it('passes align to the Dialog', () => {
		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={() => {}} align="top" />)

		const wrapper = bySlot(document.body, 'confirm')?.parentElement

		expect(wrapper?.className).toContain('sm:items-start')
	})

	it('passes glass to the Dialog', () => {
		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={() => {}} glass />)

		expect(bySlot(document.body, 'confirm')).toHaveAttribute('data-glass', '')
	})

	it('passes dismissOnBackdrop to the Dialog', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Confirm open onOpenChange={onOpenChange} onConfirm={() => {}} dismissOnBackdrop={false} />,
		)

		fireEvent.click(getSlot(document.body, 'overlay-backdrop'))

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('passes container to the Dialog', () => {
		const container = attach(document.createElement('div'))

		renderUI(<Confirm open onOpenChange={() => {}} onConfirm={() => {}} container={container} />)

		expect(container).toContainElement(bySlot(document.body, 'confirm'))
	})

	it('passes initialFocus to the Dialog', async () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(
			<Confirm open onOpenChange={() => {}} onConfirm={() => {}} initialFocus={ref}>
				<input ref={ref} aria-label="Reason" />
			</Confirm>,
		)

		await waitFor(() => expect(document.activeElement).toBe(ref.current))
	})
})
