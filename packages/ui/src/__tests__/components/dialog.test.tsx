import { describe, expect, it } from 'vitest'
import { Dialog, DialogHeader, DialogTitle } from '../../components/dialog'
import { DensityProvider } from '../../providers/density'
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

	it('renders with placement="top"', () => {
		renderUI(
			<Dialog open placement="top" onOpenChange={() => {}}>
				Top-placed
			</Dialog>,
		)

		expect(screen.getByText('Top-placed')).toBeInTheDocument()
	})

	it('renders with placement="center" (default)', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				Center
			</Dialog>,
		)

		expect(screen.getByText('Center')).toBeInTheDocument()
	})

	it('respects dismissOnBackdrop=false', () => {
		renderUI(
			<Dialog open dismissOnBackdrop={false} onOpenChange={() => {}}>
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

	it('DialogTitle holds the text-lg baseline at neutral density', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>
			</Dialog>,
		)

		expect(screen.getByText('Settings').className).toContain('text-lg')
	})

	it('DialogTitle scales down with an ambient compact density', () => {
		renderUI(
			<DensityProvider density="compact">
				<Dialog open onOpenChange={() => {}}>
					<DialogHeader>
						<DialogTitle>Settings</DialogTitle>
					</DialogHeader>
				</Dialog>
			</DensityProvider>,
		)

		expect(screen.getByText('Settings').className).toContain('text-base')
	})
})
