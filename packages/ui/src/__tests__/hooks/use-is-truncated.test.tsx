import { act, render, renderHook } from '@testing-library/react'
import { type RefObject, useRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useIsTruncated } from '../../hooks/use-is-truncated'

type Dimensions = {
	containerWidth: number
	textWidth: number
	paddingLeft?: number
	paddingRight?: number
}

function mockLayout({ containerWidth, textWidth, paddingLeft = 0, paddingRight = 0 }: Dimensions) {
	const originalGetBCR = Element.prototype.getBoundingClientRect

	const originalRangeGetBCR = Range.prototype.getBoundingClientRect

	const originalGetComputedStyle = window.getComputedStyle

	const rect = (width: number): DOMRect =>
		({
			width,
			height: 0,
			top: 0,
			left: 0,
			right: width,
			bottom: 0,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		}) as DOMRect

	Element.prototype.getBoundingClientRect = () => rect(containerWidth)

	// jsdom implements no Range geometry; the hook feature-detects it, so the
	// measurement path only runs once this stub supplies it.
	Range.prototype.getBoundingClientRect = () => rect(textWidth)

	window.getComputedStyle = ((el: Element) => {
		const real = originalGetComputedStyle(el)

		return new Proxy(real, {
			get(target, prop) {
				if (prop === 'paddingLeft') return `${paddingLeft}px`

				if (prop === 'paddingRight') return `${paddingRight}px`

				return Reflect.get(target, prop)
			},
		})
	}) as typeof window.getComputedStyle

	return () => {
		Element.prototype.getBoundingClientRect = originalGetBCR

		Range.prototype.getBoundingClientRect = originalRangeGetBCR

		window.getComputedStyle = originalGetComputedStyle
	}
}

function Probe({ text, onResult }: { text: string; onResult: (v: boolean) => void }) {
	const ref = useRef<HTMLDivElement>(null)

	const truncated = useIsTruncated(ref as RefObject<HTMLElement | null>, text)

	onResult(truncated)

	return <div ref={ref}>{text}</div>
}

describe('useIsTruncated', () => {
	let restore: (() => void) | undefined

	afterEach(() => {
		restore?.()

		restore = undefined

		document.body.innerHTML = ''
	})

	describe('guards', () => {
		it('returns false when text is empty', () => {
			const { result } = renderHook(() => {
				const ref = useRef<HTMLElement>(null)

				return useIsTruncated(ref, '')
			})

			expect(result.current).toBe(false)
		})

		it('returns false when ref has no element attached', () => {
			const { result } = renderHook(() => {
				const ref = useRef<HTMLElement>(null)

				return useIsTruncated(ref, 'hello')
			})

			expect(result.current).toBe(false)
		})
	})

	describe('measurement', () => {
		it('reports truncated when text width exceeds content width', () => {
			restore = mockLayout({ containerWidth: 100, textWidth: 250 })

			const results: boolean[] = []

			render(<Probe text="long text" onResult={(v) => results.push(v)} />)

			expect(results.at(-1)).toBe(true)
		})

		it('reports not truncated when text fits in content width', () => {
			restore = mockLayout({ containerWidth: 200, textWidth: 80 })

			const results: boolean[] = []

			render(<Probe text="short" onResult={(v) => results.push(v)} />)

			expect(results.at(-1)).toBe(false)
		})

		it('accounts for horizontal padding when computing content width', () => {
			// 200px container, 30px padding each side → 140px content box; 150px text → truncated.
			restore = mockLayout({
				containerWidth: 200,
				textWidth: 150,
				paddingLeft: 30,
				paddingRight: 30,
			})

			const results: boolean[] = []

			render(<Probe text="padded" onResult={(v) => results.push(v)} />)

			expect(results.at(-1)).toBe(true)
		})

		it('treats exact equality as not truncated', () => {
			restore = mockLayout({ containerWidth: 100, textWidth: 100 })

			const results: boolean[] = []

			render(<Probe text="exact" onResult={(v) => results.push(v)} />)

			expect(results.at(-1)).toBe(false)
		})

		it('handles subpixel widths without rounding artifacts', () => {
			// getBoundingClientRect returns floats; 100.4px text in a 100.6px box → not truncated.
			restore = mockLayout({ containerWidth: 100.6, textWidth: 100.4 })

			const results: boolean[] = []

			render(<Probe text="subpixel" onResult={(v) => results.push(v)} />)

			expect(results.at(-1)).toBe(false)
		})
	})

	describe('lifecycle', () => {
		it('re-checks when ResizeObserver fires', () => {
			let observerCallback: ResizeObserverCallback | undefined

			const OriginalRO = window.ResizeObserver

			window.ResizeObserver = class {
				constructor(cb: ResizeObserverCallback) {
					observerCallback = cb
				}

				observe() {}
				unobserve() {}
				disconnect() {}
			} as unknown as typeof ResizeObserver

			let restoreLayout = mockLayout({ containerWidth: 500, textWidth: 100 })

			restore = () => {
				restoreLayout()

				window.ResizeObserver = OriginalRO
			}

			const results: boolean[] = []

			render(<Probe text="resizable" onResult={(v) => results.push(v)} />)

			expect(results.at(-1)).toBe(false)

			// Shrink the container below the text width.
			restoreLayout()

			restoreLayout = mockLayout({ containerWidth: 50, textWidth: 100 })

			act(() => {
				observerCallback?.([], {} as ResizeObserver)
			})

			expect(results.at(-1)).toBe(true)
		})

		it('injects nothing into the measured element and never duplicates its text', () => {
			restore = mockLayout({ containerWidth: 100, textWidth: 50 })

			const { container, unmount } = render(<Probe text="cleanup" onResult={() => {}} />)

			const div = container.querySelector('div')

			// A mirror node would land here as a child of a React-owned element and
			// put a second copy of the text in the accessibility tree.
			expect(div?.children).toHaveLength(0)

			expect(div?.textContent).toBe('cleanup')

			unmount()
		})
	})
})
