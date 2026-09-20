import { describe, expect, it, vi } from 'vitest'
import { Overlay } from '../../primitives/overlay'
import { fireEvent, present, renderUI, screen } from '../helpers'

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

	it('takes the backdrop class the panel hands it, in place of the base scrim', () => {
		// One styling channel: every panel drives its own surface through
		// `backdropClassName`, so nothing can be set and then silently outranked.
		// The glass fill this asserts is what `Dialog` passes from its own recipe.
		renderUI(
			<Overlay open backdropClassName="absolute inset-0 bg-white/75" onOpenChange={() => {}}>
				<span>content</span>
			</Overlay>,
		)

		const backdrop = document.querySelector<HTMLElement>(
			'[data-slot="overlay-backdrop"]',
		) as HTMLElement

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

		const backdrop = document.querySelector<HTMLElement>(
			'[data-slot="overlay-backdrop"]',
		) as HTMLElement

		expect(backdrop.className).toBe('custom-backdrop')
	})

	it('does not steal focus when modal=false', () => {
		const outside = document.createElement('button')

		document.body.appendChild(outside)

		// try/finally so a failing assertion can't skip the cleanup and leave the
		// button on document.body for the next (shuffled) test's focus queries.
		try {
			outside.focus()

			renderUI(
				<Overlay open modal={false} onOpenChange={() => {}}>
					<button type="button">inside</button>
				</Overlay>,
			)

			expect(document.activeElement).toBe(outside)
		} finally {
			outside.remove()
		}
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

		// try/finally so a failing assertion can't leave `host` (and a mounted
		// overlay) on document.body for the next shuffled test.
		try {
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
		} finally {
			host.remove()
		}
	})
})
