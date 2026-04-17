import { describe, expect, it, vi } from 'vitest'
import { Overlay } from '../../primitives/overlay'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Overlay', () => {
	it('renders children when open', () => {
		renderUI(
			<Overlay open onOpenChange={() => {}}>
				<span>Overlay content</span>
			</Overlay>,
		)

		expect(screen.getByText('Overlay content')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<Overlay open={false} onOpenChange={() => {}}>
				<span>Hidden</span>
			</Overlay>,
		)

		expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
	})

	it('calls onOpenChange(false) on Escape key', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Overlay open onOpenChange={onOpenChange}>
				<span>content</span>
			</Overlay>,
		)

		fireEvent.keyDown(document, { key: 'Escape' })

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('hides body overflow when open', () => {
		renderUI(
			<Overlay open onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		expect(document.body.style.overflow).toBe('hidden')
	})

	it('restores body overflow on unmount', () => {
		const { unmount } = renderUI(
			<Overlay open onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		unmount()

		expect(document.body.style.overflow).toBe('')
	})
})
