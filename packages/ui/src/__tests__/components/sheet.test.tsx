import { describe, expect, it, vi } from 'vitest'
import { Sheet, SheetClose, SheetTrigger } from '../../components/sheet'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Sheet', () => {
	it('renders children with role="dialog" when open', () => {
		renderUI(
			<Sheet open onOpenChange={() => {}}>
				Sheet content
			</Sheet>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')

		expect(screen.getByText('Sheet content')).toBeInTheDocument()
	})

	it('omits aria-modal on a non-modal sheet', () => {
		renderUI(
			<Sheet open modal={false} onOpenChange={() => {}}>
				Peek content
			</Sheet>,
		)

		// A hover-peek neither traps focus nor locks scroll; announcing it as
		// modal would tell AT the rest of the page is inert when it isn't.
		expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal')
	})

	it('does not render when closed', () => {
		renderUI(
			<Sheet open={false} onOpenChange={() => {}}>
				Hidden
			</Sheet>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('names a title-less sheet via the aria-label escape hatch', () => {
		renderUI(
			<Sheet open onOpenChange={() => {}} aria-label="Navigation">
				content
			</Sheet>,
		)

		expect(screen.getByRole('dialog')).toHaveAccessibleName('Navigation')
	})
})

describe('SheetTrigger', () => {
	it('invokes onClick and preserves the child onClick when clicked', () => {
		const childOnClick = vi.fn()
		const onClick = vi.fn()

		renderUI(
			<SheetTrigger onClick={onClick}>
				<button type="button" onClick={childOnClick}>
					Open
				</button>
			</SheetTrigger>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Open' }))

		expect(childOnClick).toHaveBeenCalledOnce()

		expect(onClick).toHaveBeenCalledOnce()
	})
})

describe('SheetClose', () => {
	it('invokes the child onClick and closes the sheet when clicked', () => {
		const childOnClick = vi.fn()
		const onOpenChange = vi.fn()

		renderUI(
			<Sheet open onOpenChange={onOpenChange}>
				<SheetClose>
					<button type="button" onClick={childOnClick}>
						Close
					</button>
				</SheetClose>
			</Sheet>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Close' }))

		expect(childOnClick).toHaveBeenCalledOnce()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('renders with side="left"', () => {
		renderUI(
			<Sheet open side="left" onOpenChange={() => {}}>
				Left sheet
			</Sheet>,
		)

		expect(screen.getByText('Left sheet')).toBeInTheDocument()
	})

	it('renders with side="top"', () => {
		renderUI(
			<Sheet open side="top" onOpenChange={() => {}}>
				Top sheet
			</Sheet>,
		)

		expect(screen.getByText('Top sheet')).toBeInTheDocument()
	})

	it('renders with side="bottom"', () => {
		renderUI(
			<Sheet open side="bottom" onOpenChange={() => {}}>
				Bottom sheet
			</Sheet>,
		)

		expect(screen.getByText('Bottom sheet')).toBeInTheDocument()
	})
})

describe('Sheet uncontrolled', () => {
	it('opens from defaultOpen', () => {
		renderUI(<Sheet defaultOpen>Sheet body</Sheet>)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByText('Sheet body')).toBeInTheDocument()
	})

	it('stays closed with neither open nor defaultOpen', () => {
		renderUI(<Sheet>Hidden</Sheet>)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('closes itself when uncontrolled and a SheetClose is activated', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Sheet defaultOpen onOpenChange={onOpenChange}>
				<SheetClose>
					<button type="button">Done</button>
				</SheetClose>
			</Sheet>,
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Done'))

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
