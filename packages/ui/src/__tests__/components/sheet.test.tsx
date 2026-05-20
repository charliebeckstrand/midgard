import { describe, expect, it, vi } from 'vitest'
import { Sheet, SheetClose, SheetTrigger } from '../../components/sheet'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Sheet', () => {
	it('renders with role="dialog" when open', () => {
		renderUI(
			<Sheet open onOpenChange={() => {}}>
				content
			</Sheet>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')
	})

	it('renders children when open', () => {
		renderUI(
			<Sheet open onOpenChange={() => {}}>
				Sheet content
			</Sheet>,
		)

		expect(screen.getByText('Sheet content')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<Sheet open={false} onOpenChange={() => {}}>
				Hidden
			</Sheet>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

	it('renders with an explicit size variant', () => {
		renderUI(
			<Sheet open size="sm" onOpenChange={() => {}}>
				Small sheet
			</Sheet>,
		)

		expect(screen.getByText('Small sheet')).toBeInTheDocument()
	})
})
