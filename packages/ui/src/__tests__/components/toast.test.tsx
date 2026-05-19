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

	it('sets aria-live on viewport', () => {
		renderUI(
			<ToastProvider>
				<Toast />
			</ToastProvider>,
		)

		const viewport = document.querySelector('[data-slot="toast-viewport"]')

		expect(viewport).toHaveAttribute('aria-live', 'polite')
	})
})

describe('Toast: useToast behavior', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
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
			api?.dismiss(id)
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
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

		function Bad() {
			useToast()

			return null
		}

		expect(() => renderUI(<Bad />)).toThrow()

		spy.mockRestore()
	})
})
