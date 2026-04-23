import { describe, expect, it, vi } from 'vitest'
import { Sheet, SheetClose, SheetOpen } from '../../components/sheet'
import { renderUI, screen } from '../helpers'

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

describe('SheetOpen', () => {
	it('invokes onClick and preserves the child onClick when clicked', () => {
		const childOnClick = vi.fn()
		const onClick = vi.fn()

		renderUI(
			<SheetOpen onClick={onClick}>
				<button type="button" onClick={childOnClick}>
					Open
				</button>
			</SheetOpen>,
		)

		screen.getByRole('button', { name: 'Open' }).click()

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

		screen.getByRole('button', { name: 'Close' }).click()

		expect(childOnClick).toHaveBeenCalledOnce()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
