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

	it('renders with align="start"', () => {
		renderUI(
			<Dialog open align="start" onOpenChange={() => {}}>
				Start-aligned
			</Dialog>,
		)

		expect(screen.getByText('Start-aligned')).toBeInTheDocument()
	})

	it('renders with align="center" (default)', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				Center
			</Dialog>,
		)

		expect(screen.getByText('Center')).toBeInTheDocument()
	})

	it('renders with explicit size variant', () => {
		renderUI(
			<Dialog open size="sm" onOpenChange={() => {}}>
				Small
			</Dialog>,
		)

		expect(screen.getByText('Small')).toBeInTheDocument()
	})

	it('respects outsideClick=false', () => {
		renderUI(
			<Dialog open outsideClick={false} onOpenChange={() => {}}>
				Locked
			</Dialog>,
		)

		expect(screen.getByText('Locked')).toBeInTheDocument()
	})

	it('renders with the glass surface', () => {
		renderUI(
			<Dialog open glass onOpenChange={() => {}}>
				Glassy
			</Dialog>,
		)

		expect(screen.getByText('Glassy')).toBeInTheDocument()
	})
})
