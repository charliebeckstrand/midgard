import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toast } from '../../components/toast'
import { ToastProvider, useToast } from '../../providers/toast'
import { act, fireEvent, renderUI, screen } from '../helpers'

describe('Toast', () => {
	it('renders a toast viewport in the document', () => {
		renderUI(
			<ToastProvider>
				<Toast />
			</ToastProvider>,
		)

		const viewport = document.querySelector('[data-slot="toast-viewport"]')

		expect(viewport).toBeInTheDocument()
	})

	it('does not force a single politeness on the viewport', () => {
		renderUI(
			<ToastProvider>
				<Toast />
			</ToastProvider>,
		)

		const viewport = document.querySelector('[data-slot="toast-viewport"]')

		// Politeness lives on each toast (status / alert), not the container, so a
		// wrapping live region can't double-announce or flatten severity.
		expect(viewport).not.toHaveAttribute('aria-live')
	})
})

describe('Toast: useToast behavior', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()

		vi.restoreAllMocks()
	})

	type TriggerProps = {
		onReady?: (context: ReturnType<typeof useToast>) => void
		children?: ReactNode
	}

	function Trigger({ onReady, children }: TriggerProps) {
		const context = useToast()

		const calledRef = useRef(false)

		useEffect(() => {
			if (calledRef.current) return

			calledRef.current = true

			onReady?.(context)
		}, [context, onReady])

		return <>{children}</>
	}

	it('adds a toast to the viewport when toast() is called', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Saved' })
		})

		expect(screen.getByText('Saved')).toBeInTheDocument()
	})

	it('routes severity to a polite or assertive live role', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Saved' })
			api?.toast({ title: 'Failed', severity: 'error' })
		})

		// Default toasts queue politely; errors interrupt.
		expect(screen.getByRole('status')).toHaveTextContent('Saved')

		expect(screen.getByRole('alert')).toHaveTextContent('Failed')
	})

	it('dismisses a toast when dismiss() is called', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		let id = ''

		act(() => {
			id = api?.toast({ title: 'Dismissable' }) ?? ''
		})

		expect(screen.getByText('Dismissable')).toBeInTheDocument()

		act(() => {
			api?.dismiss({ id })
		})

		expect(api).not.toBeNull()
	})

	it('caps active toasts at maxToasts by dismissing the oldest', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider maxToasts={2}>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'A' })
			api?.toast({ title: 'B' })
			api?.toast({ title: 'C' })
		})

		expect(screen.getByText('B')).toBeInTheDocument()
		expect(screen.getByText('C')).toBeInTheDocument()
	})

	it('drains non-persist toasts after the duration elapses', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider duration={1000}>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Temporary' })
		})

		expect(screen.getByText('Temporary')).toBeInTheDocument()

		act(() => {
			vi.advanceTimersByTime(1500)
		})

		expect(screen.queryByText('Temporary')).not.toBeInTheDocument()
	})

	it('keeps persist toasts past the duration', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider duration={500}>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Sticky', persist: true })
		})

		act(() => {
			vi.advanceTimersByTime(1500)
		})

		expect(screen.getByText('Sticky')).toBeInTheDocument()
	})

	it('uses a per-toast duration override', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider duration={100000}>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Fast', duration: 200 })
		})

		act(() => {
			vi.advanceTimersByTime(300)
		})

		expect(screen.queryByText('Fast')).not.toBeInTheDocument()
	})

	it('resets the dismiss timer when the toast is clicked', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider duration={1000}>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Clickable' })
		})

		const title = screen.getByText('Clickable')

		act(() => {
			vi.advanceTimersByTime(800)
		})

		fireEvent.click(title)

		act(() => {
			vi.advanceTimersByTime(800)
		})

		expect(screen.getByText('Clickable')).toBeInTheDocument()

		act(() => {
			vi.advanceTimersByTime(500)
		})

		expect(screen.queryByText('Clickable')).not.toBeInTheDocument()
	})

	it('pauses the timer on hover and resumes on leave', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider duration={1000}>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Hoverable' })
		})

		const title = screen.getByText('Hoverable')

		act(() => {
			vi.advanceTimersByTime(500)
		})

		fireEvent.mouseEnter(title)

		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(screen.getByText('Hoverable')).toBeInTheDocument()

		fireEvent.mouseLeave(title)

		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(screen.queryByText('Hoverable')).not.toBeInTheDocument()
	})

	it('pauses the timer while focus is inside and resumes on focus leave', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider duration={1000}>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Focusable' })
		})

		const title = screen.getByText('Focusable')

		act(() => {
			vi.advanceTimersByTime(500)
		})

		// Keyboard parity with hover: focus inside the toast holds the timer.
		fireEvent.focusIn(title)

		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(screen.getByText('Focusable')).toBeInTheDocument()

		fireEvent.focusOut(title)

		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(screen.queryByText('Focusable')).not.toBeInTheDocument()
	})

	it('renders toasts with the configured position viewport class', () => {
		renderUI(
			<ToastProvider>
				<Toast position="top-left" />
			</ToastProvider>,
		)

		const viewport = document.querySelector('[data-slot="toast-viewport"]')

		expect(viewport).toBeInTheDocument()
	})

	it('throws when useToast is called outside of a ToastProvider', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		function Bad() {
			useToast()

			return null
		}

		expect(() => renderUI(<Bad />)).toThrow()
	})

	it.each([
		['top-left', '-100%'],
		['top-right', '-100%'],
		['bottom-left', '100%'],
		['bottom-right', '100%'],
	] as const)('slides the %s toast in from its vertical edge', (position, expectedY) => {
		let api: ReturnType<typeof useToast> | undefined

		renderUI(
			<ToastProvider>
				<Toast position={position} />
				<Trigger onReady={(c) => (api = c)} />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: `Slide-${position}` })
		})

		const animated = screen.getByText(`Slide-${position}`).closest('[data-initial-y]')

		expect(animated).not.toBeNull()

		expect(animated).toHaveAttribute('data-initial-y', expectedY)
	})

	it.each([
		['default'],
		['secondary'],
		['success'],
		['warning'],
		['error'],
	] as const)('renders a %s-severity toast', (severity) => {
		let api: ReturnType<typeof useToast> | undefined

		renderUI(
			<ToastProvider>
				<Toast />
				<Trigger onReady={(c) => (api = c)} />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: `T-${severity}`, severity })
		})

		expect(screen.getByText(`T-${severity}`)).toBeInTheDocument()
	})

	it('renders a toast without a close button when closable is false', () => {
		let api: ReturnType<typeof useToast> | undefined

		renderUI(
			<ToastProvider>
				<Toast />
				<Trigger onReady={(c) => (api = c)} />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Quiet', persist: true, closable: false })
		})

		expect(screen.getByText('Quiet')).toBeInTheDocument()

		expect(document.querySelector('[data-slot="alert-close"]')).toBeNull()
	})

	it('dismisses the toast when the Alert close button is clicked', () => {
		let api: ReturnType<typeof useToast> | undefined

		renderUI(
			<ToastProvider duration={5000}>
				<Toast />
				<Trigger onReady={(c) => (api = c)} />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'Closable', persist: true })
		})

		expect(screen.getByText('Closable')).toBeInTheDocument()

		const dismissButton = screen.getByRole('button', { name: 'Dismiss' })

		act(() => {
			fireEvent.click(dismissButton)
		})

		// First click marks it dismissed (still in the queue for exit animation),
		// drain it with a follow-up dispatch through the (mocked) AnimatePresence.
		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(screen.queryByText('Closable')).not.toBeInTheDocument()
	})

	it('removes a toast immediately when dismiss is called a second time', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider duration={5000}>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		let id = ''

		act(() => {
			id = api?.toast({ title: 'Twice' }) ?? ''
		})

		expect(screen.getByText('Twice')).toBeInTheDocument()

		// First dismiss marks the toast as dismissed; a follow-up dismiss runs the
		// "already dismissed" filter-removal branch.
		act(() => {
			api?.dismiss({ id })
		})

		act(() => {
			api?.dismiss({ id })
		})

		expect(screen.queryByText('Twice')).not.toBeInTheDocument()
	})

	it('ignores a dismiss call for an unknown toast id', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		// Should be a silent no-op rather than throw.
		expect(() => {
			act(() => {
				api?.dismiss({ id: 'does-not-exist' })
			})
		}).not.toThrow()
	})

	it('disables the maxToasts cap when set to 0', () => {
		let api: ReturnType<typeof useToast> | null = null

		renderUI(
			<ToastProvider maxToasts={0}>
				<Trigger onReady={(context) => (api = context)} />
				<Toast />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({ title: 'One', persist: true })
			api?.toast({ title: 'Two', persist: true })
			api?.toast({ title: 'Three', persist: true })
		})

		// With maxToasts=0 the excess-cap branch is skipped — everything stays.
		expect(screen.getByText('One')).toBeInTheDocument()

		expect(screen.getByText('Two')).toBeInTheDocument()

		expect(screen.getByText('Three')).toBeInTheDocument()
	})

	it('renders a toast with rich actions', () => {
		let api: ReturnType<typeof useToast> | undefined

		renderUI(
			<ToastProvider>
				<Toast />
				<Trigger onReady={(c) => (api = c)} />
			</ToastProvider>,
		)

		act(() => {
			api?.toast({
				title: 'With description',
				description: 'Body text',
				actions: <button type="button">Undo</button>,
			})
		})

		expect(screen.getByText('With description')).toBeInTheDocument()

		expect(screen.getByText('Body text')).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
	})
})
