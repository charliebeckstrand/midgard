import { describe, expect, it } from 'vitest'
import { Dialog } from '../../components/dialog'
import { renderUI, screen } from '../helpers'

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
