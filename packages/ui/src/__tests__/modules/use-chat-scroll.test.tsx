import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatScroll } from '../../modules/chat/use-chat-scroll'
import { renderUI } from '../helpers'

/**
 * The hook writes to the container it is given, so the container is what a test
 * watches. jsdom lays nothing out — every `scrollHeight` reads zero and a
 * `scrollTop` write on a box-less element is dropped — so the two properties are
 * staged on the prototype for the duration of each test. What is being stated
 * here is which call the hook makes and when, not what a browser does with it;
 * `browser/chat-transcript-scroll-confinement.test.tsx` holds the latter.
 */
const CONTENT_HEIGHT = 500

let scrollTops: number[]

let scrollToCalls: ScrollToOptions[]

const originals = {
	scrollHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight'),
	scrollTop: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop'),
	scrollTo: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo'),
}

beforeEach(() => {
	scrollTops = []

	scrollToCalls = []

	Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
		configurable: true,
		get: () => CONTENT_HEIGHT,
	})

	Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
		configurable: true,
		get: () => 0,
		set: (value: number) => {
			scrollTops.push(value)
		},
	})

	Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
		configurable: true,
		writable: true,
		value: (options: ScrollToOptions) => {
			scrollToCalls.push(options)
		},
	})
})

afterEach(() => {
	for (const [name, descriptor] of Object.entries(originals)) {
		if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor)
		else Reflect.deleteProperty(HTMLElement.prototype, name)
	}
})

function Harness({ dependency }: { dependency: unknown }) {
	const { containerRef } = useChatScroll(dependency)

	return <div ref={containerRef} data-testid="container" />
}

describe('useChatScroll', () => {
	it('jumps its container to the bottom before paint on mount, without animating', () => {
		renderUI(<Harness dependency="a" />)

		expect(scrollTops).toEqual([CONTENT_HEIGHT])

		expect(scrollToCalls).toEqual([])
	})

	it('does not also queue a smooth scroll on the mount pass', () => {
		const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)

		renderUI(<Harness dependency="a" />)

		expect(raf).not.toHaveBeenCalled()

		raf.mockRestore()
	})

	it('smooth-scrolls on the next animation frame when the dependency changes', () => {
		let frame: FrameRequestCallback | null = null

		const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
			frame = fn

			return 1
		})

		const { rerender } = renderUI(<Harness dependency="a" />)

		rerender(<Harness dependency="b" />)

		// Deferred a frame so the appended content has laid out first.
		expect(scrollToCalls).toEqual([])

		act(() => frame?.(0))

		expect(scrollToCalls).toEqual([{ top: CONTENT_HEIGHT, behavior: 'smooth' }])

		raf.mockRestore()
	})

	it('writes to nothing when the ref was never attached', () => {
		// A caller that renders no container gets no scroll, rather than a reach
		// for whatever else on the page happens to scroll.
		function Detached() {
			useChatScroll('a')

			return null
		}

		renderUI(<Detached />)

		expect(scrollTops).toEqual([])

		expect(scrollToCalls).toEqual([])
	})
})
