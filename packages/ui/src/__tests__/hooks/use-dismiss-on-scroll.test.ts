import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDismissOnScroll } from '../../hooks/use-dismiss-on-scroll'

/** Dispatch a scroll from `target`; capture-phase listeners on `window` catch it. */
function scroll(target: EventTarget = document): void {
	target.dispatchEvent(new Event('scroll'))
}

describe('useDismissOnScroll', () => {
	it('clears on scroll while active', () => {
		const onScroll = vi.fn()

		renderHook(() => useDismissOnScroll(true, onScroll))

		scroll()

		expect(onScroll).toHaveBeenCalledOnce()
	})

	it('catches a scroll from a nested ancestor in the capture phase', () => {
		const onScroll = vi.fn()

		renderHook(() => useDismissOnScroll(true, onScroll))

		const scroller = document.createElement('div')

		document.body.appendChild(scroller)

		scroll(scroller)

		expect(onScroll).toHaveBeenCalledOnce()

		document.body.removeChild(scroller)
	})

	it('ignores scroll when inactive', () => {
		const onScroll = vi.fn()

		renderHook(() => useDismissOnScroll(false, onScroll))

		scroll()

		expect(onScroll).not.toHaveBeenCalled()
	})

	it('detaches the listener when it goes inactive', () => {
		const onScroll = vi.fn()

		const { rerender } = renderHook(
			({ active }: { active: boolean }) => useDismissOnScroll(active, onScroll),
			{ initialProps: { active: true } },
		)

		rerender({ active: false })

		scroll()

		expect(onScroll).not.toHaveBeenCalled()
	})

	it('reads the latest callback without resubscribing', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { rerender } = renderHook(
			({ onScroll }: { onScroll: () => void }) => useDismissOnScroll(true, onScroll),
			{ initialProps: { onScroll: first } },
		)

		rerender({ onScroll: second })

		scroll()

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledOnce()
	})
})
