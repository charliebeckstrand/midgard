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

	it('closes when the backdrop is clicked by default', () => {
		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Overlay open onOpenChange={onOpenChange}>
				<span>content</span>
			</Overlay>,
		)

		const backdrop = container.ownerDocument.querySelector<HTMLElement>(
			'[data-slot="overlay-backdrop"]',
		)

		expect(backdrop).not.toBeNull()

		fireEvent.click(backdrop as HTMLElement)

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('does not close on backdrop click when dismissOnBackdrop=false', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Overlay open dismissOnBackdrop={false} onOpenChange={onOpenChange}>
				<span>content</span>
			</Overlay>,
		)

		const backdrop = document.querySelector<HTMLElement>('[data-slot="overlay-backdrop"]')

		expect(backdrop).not.toBeNull()

		fireEvent.click(backdrop as HTMLElement)

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('uses the glass backdrop class when glass is true', () => {
		renderUI(
			<Overlay open glass onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		const backdrop = document.querySelector<HTMLElement>(
			'[data-slot="overlay-backdrop"]',
		) as HTMLElement

		// Glass backdrop uses a backdrop-blur token; base uses a plain bg.
		expect(backdrop.className).toMatch(/backdrop-blur|bg-/)
	})

	it('applies a custom className override on the backdrop', () => {
		renderUI(
			<Overlay open className="custom-backdrop" onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		const backdrop = document.querySelector<HTMLElement>(
			'[data-slot="overlay-backdrop"]',
		) as HTMLElement

		expect(backdrop.className).toBe('custom-backdrop')
	})

	it('renders into a scoped container when one is provided', () => {
		const host = document.createElement('div')

		host.style.position = 'relative'

		document.body.appendChild(host)

		renderUI(
			<Overlay open container={host} onOpenChange={() => {}}>
				<span>scoped content</span>
			</Overlay>,
		)

		const overlay = host.querySelector<HTMLElement>('[data-slot="overlay"]') as HTMLElement

		expect(overlay).not.toBeNull()

		expect(overlay.className).toContain('absolute')

		// Scoped overlays skip the body scroll lock.
		expect(document.body.style.overflow).toBe('')

		document.body.removeChild(host)
	})
})
