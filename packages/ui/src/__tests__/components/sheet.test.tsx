import { describe, expect, it } from 'vitest'
import { Sheet } from '../../components/sheet'
import { renderUI, screen } from '../helpers'

describe('Sheet', () => {
	it('renders with role="dialog" when open', () => {
		renderUI(
			<Sheet open onClose={() => {}}>
				content
			</Sheet>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')
	})

	it('renders children when open', () => {
		renderUI(
			<Sheet open onClose={() => {}}>
				Sheet content
			</Sheet>,
		)

		expect(screen.getByText('Sheet content')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<Sheet open={false} onClose={() => {}}>
				Hidden
			</Sheet>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})
