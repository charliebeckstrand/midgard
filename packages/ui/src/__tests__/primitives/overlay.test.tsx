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

		// Glass backdrop: backdrop-blur token; base backdrop: plain bg.
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

	it('does not steal focus when modal=false', () => {
		const outside = document.createElement('button')

		document.body.appendChild(outside)

		outside.focus()

		renderUI(
			<Overlay open modal={false} onOpenChange={() => {}}>
				<button type="button">inside</button>
			</Overlay>,
		)

		expect(document.activeElement).toBe(outside)

		outside.remove()
	})

	it('does not lock body scroll when modal=false', () => {
		renderUI(
			<Overlay open modal={false} onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		expect(document.body.style.overflow).toBe('')
	})

	it('renders no backdrop and disables wrapper pointer events when modal=false', () => {
		renderUI(
			<Overlay open modal={false} onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		expect(document.querySelector('[data-slot="overlay-backdrop"]')).toBeNull()

		const overlay = document.querySelector('[data-slot="overlay"]') as HTMLElement

		expect(overlay.className).toContain('pointer-events-none')
	})

	it('renders a backdrop without modality when modal=false and backdrop is set', () => {
		renderUI(
			<Overlay open modal={false} backdrop onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		expect(document.querySelector('[data-slot="overlay-backdrop"]')).not.toBeNull()

		// The wrapper stays pointer-events-none, so the backdrop never intercepts
		// a press and the page behind remains interactive.
		const overlay = document.querySelector('[data-slot="overlay"]') as HTMLElement

		expect(overlay.className).toContain('pointer-events-none')

		// Backdrop is decoupled from modality: no focus trap, no scroll lock.
		expect(document.body.style.overflow).toBe('')
	})

	it('dismisses on a pointer press outside the panel when modal=false', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Overlay open modal={false} onOpenChange={onOpenChange}>
				<span>content</span>
			</Overlay>,
		)

		fireEvent.pointerDown(document.body)

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('does not dismiss on a pointer press inside the panel when modal=false', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Overlay open modal={false} onOpenChange={onOpenChange}>
				<button type="button">inside</button>
			</Overlay>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: 'inside' }))

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('still dismisses on Escape when modal=false', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Overlay open modal={false} onOpenChange={onOpenChange}>
				<span>content</span>
			</Overlay>,
		)

		fireEvent.keyDown(document, { key: 'Escape' })

		expect(onOpenChange).toHaveBeenCalledWith(false)
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

		// Scoped overlays do not apply the body scroll lock.
		expect(document.body.style.overflow).toBe('')

		document.body.removeChild(host)
	})
})
