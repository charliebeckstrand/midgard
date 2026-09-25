import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Overlay } from '../../primitives/overlay'
import { attach, fireEvent, present, renderUI, screen } from '../helpers'

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

	// With no backdrop to click, a modal overlay takes the press on its own root.
	// The root fills the screen behind the panel, so a press there is outside it.
	it('closes on a press outside the panel when modal and backdrop={false}', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Overlay open backdrop={false} onOpenChange={onOpenChange}>
				<span>content</span>
			</Overlay>,
		)

		expect(document.querySelector('[data-slot="overlay-backdrop"]')).toBeNull()

		fireEvent.click(screen.getByText('content'))

		expect(onOpenChange).not.toHaveBeenCalled()

		fireEvent.click(present(document.querySelector('[data-slot="overlay"]'), 'overlay root'))

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
	})

	it('keeps a modal overlay with backdrop={false} open when dismissOnBackdrop=false', () => {
		const onOpenChange = vi.fn()

		const onClick = vi.fn()

		renderUI(
			<Overlay
				open
				backdrop={false}
				dismissOnBackdrop={false}
				onOpenChange={onOpenChange}
				onClick={onClick}
			>
				<span>content</span>
			</Overlay>,
		)

		fireEvent.click(present(document.querySelector('[data-slot="overlay"]'), 'overlay root'))

		expect(onOpenChange).not.toHaveBeenCalled()

		// The caller's own handler on the root still runs.
		expect(onClick).toHaveBeenCalledOnce()
	})

	it('takes the backdrop class the panel hands it, in place of the base scrim', () => {
		// One styling channel: every panel drives its own surface through
		// `backdropClassName`, so nothing can be set and then silently outranked.
		// The glass fill this asserts is what `Dialog` passes from its own recipe.
		renderUI(
			<Overlay open backdropClassName="absolute inset-0 bg-white/75" onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		const backdrop = present(
			document.querySelector('[data-slot="overlay-backdrop"]'),
			'[data-slot="overlay-backdrop"]',
		)

		expect(backdrop.className).toContain('bg-white/75')

		// The base scrim's own fill and blur are replaced, not merged.
		expect(backdrop.className).not.toContain('bg-white/50')

		expect(backdrop.className).not.toContain('backdrop-blur')
	})

	it('applies a custom backdropClassName override on the backdrop', () => {
		renderUI(
			<Overlay open backdropClassName="custom-backdrop" onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		const backdrop = present(
			document.querySelector('[data-slot="overlay-backdrop"]'),
			'[data-slot="overlay-backdrop"]',
		)

		expect(backdrop.className).toBe('custom-backdrop')
	})

	it('does not steal focus when modal=false', () => {
		const outside = attach(document.createElement('button'))

		outside.focus()

		renderUI(
			<Overlay open modal={false} onOpenChange={() => {}}>
				<button type="button">inside</button>
			</Overlay>,
		)

		expect(document.activeElement).toBe(outside)
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

		const overlay = present(
			document.querySelector('[data-slot="overlay"]'),
			'[data-slot="overlay"]',
		)

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
		const overlay = present(
			document.querySelector('[data-slot="overlay"]'),
			'[data-slot="overlay"]',
		)

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

	// Outside-press dismissal reads the panel through the overlay's own ref. A
	// consumer ref must join it, or no press ever dismisses.
	it('dismisses on a press outside when a consumer holds a ref', () => {
		const onOpenChange = vi.fn()

		const ref = createRef<HTMLDivElement>()

		renderUI(
			<Overlay open modal={false} onOpenChange={onOpenChange} ref={ref}>
				<span>content</span>
			</Overlay>,
		)

		expect(ref.current?.dataset.slot).toBe('overlay')

		fireEvent.pointerDown(document.body)

		expect(onOpenChange).toHaveBeenCalledWith(false)
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
		const host = attach(document.createElement('div'))

		host.style.position = 'relative'

		renderUI(
			<Overlay open container={host} onOpenChange={() => {}}>
				<span>scoped content</span>
			</Overlay>,
		)

		const overlay = present(host.querySelector('[data-slot="overlay"]'), '[data-slot="overlay"]')

		expect(overlay).not.toBeNull()

		expect(overlay.className).toContain('absolute')

		// Scoped overlays do not apply the body scroll lock.
		expect(document.body.style.overflow).toBe('')
	})
})
