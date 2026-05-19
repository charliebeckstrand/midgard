import { render, renderHook } from '@testing-library/react'
import { type RefObject, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIsTruncated } from '../../hooks/use-is-truncated'
import { makeCanvasContext } from '../helpers'

afterEach(() => {
	document.body.innerHTML = ''
})

function TruncationProbe({
	text,
	clientWidth,
	measuredWidth,
	onResult,
}: {
	text: string
	clientWidth: number
	measuredWidth: number
	onResult: (truncated: boolean) => void
}) {
	const ref = useRef<HTMLDivElement>(null)

	// Patch the element's getters before the layout effect reads them.
	const setRef = (node: HTMLDivElement | null) => {
		ref.current = node

		if (node) {
			Object.defineProperty(node, 'clientWidth', {
				configurable: true,
				value: clientWidth,
			})

			const cssPartial: Partial<CSSStyleDeclaration> = {
				paddingLeft: '0px',
				paddingRight: '0px',
				fontStyle: 'normal',
				fontWeight: '400',
				fontSize: '16px',
				fontFamily: 'system-ui',
				letterSpacing: '0px',
			}

			vi.spyOn(window, 'getComputedStyle').mockImplementation(
				() => cssPartial as CSSStyleDeclaration,
			)

			const ctx = makeCanvasContext({
				font: '',
				letterSpacing: '0px',
				measureText: () => ({ width: measuredWidth }) as TextMetrics,
			})

			vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx)
		}
	}

	const truncated = useIsTruncated(ref as RefObject<HTMLElement | null>, text)

	onResult(truncated)

	return <div ref={setRef}>{text}</div>
}

describe('useIsTruncated', () => {
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

	it('returns true when the measured text exceeds the content width', () => {
		const seen: boolean[] = []

		render(
			<TruncationProbe
				text="a really long piece of text"
				clientWidth={50}
				measuredWidth={200}
				onResult={(v) => seen.push(v)}
			/>,
		)

		expect(seen.at(-1)).toBe(true)
	})

	it('returns false when the measured text fits in the content width', () => {
		const seen: boolean[] = []

		render(
			<TruncationProbe
				text="abc"
				clientWidth={200}
				measuredWidth={50}
				onResult={(v) => seen.push(v)}
			/>,
		)

		expect(seen.at(-1)).toBe(false)
	})
})
