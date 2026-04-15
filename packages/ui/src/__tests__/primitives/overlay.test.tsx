import { describe, expect, it, vi } from 'vitest'
import { Overlay } from '../../primitives/overlay'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Overlay', () => {
	it('renders children when open', () => {
		renderUI(
			<Overlay open onClose={() => {}}>
				<span>Overlay content</span>
			</Overlay>,
		)

		expect(screen.getByText('Overlay content')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<Overlay open={false} onClose={() => {}}>
				<span>Hidden</span>
			</Overlay>,
		)

		expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
	})

	it('calls onClose on Escape key', () => {
		const onClose = vi.fn()

		renderUI(
			<Overlay open onClose={onClose}>
				<span>content</span>
			</Overlay>,
		)

		fireEvent.keyDown(document, { key: 'Escape' })

		expect(onClose).toHaveBeenCalled()
	})

	it('hides body overflow when open', () => {
		renderUI(
			<Overlay open onClose={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		expect(document.body.style.overflow).toBe('hidden')
	})

	it('restores body overflow on unmount', () => {
		const { unmount } = renderUI(
			<Overlay open onClose={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		unmount()

		expect(document.body.style.overflow).toBe('')
	})
})
