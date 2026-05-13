'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

let canvas: HTMLCanvasElement | null = null

function measureTextWidth(text: string, el: HTMLElement): number {
	canvas ??= document.createElement('canvas')

	const ctx = canvas.getContext('2d')

	if (!ctx) return 0

	const cs = getComputedStyle(el)

	ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`

	if ('letterSpacing' in ctx) {
		;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing
	}

	return ctx.measureText(text).width
}

function getContentWidth(el: HTMLElement): number {
	const cs = getComputedStyle(el)

	const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)

	return el.clientWidth - paddingX
}

/**
 * Returns true when `text` overflows the referenced element's content box.
 * Measures via canvas using the element's computed font, which avoids the
 * sub-pixel rounding that can make `scrollWidth > clientWidth` flip on/off
 * by a single pixel as layout shifts.
 */
export function useIsTruncated(ref: RefObject<HTMLElement | null>, text: string): boolean {
	const [truncated, setTruncated] = useState(false)

	useLayoutEffect(() => {
		const el = ref.current

		if (!el || !text) {
			setTruncated(false)

			return
		}

		const check = () => {
			const textWidth = measureTextWidth(text, el)

			const contentWidth = getContentWidth(el)

			setTruncated(textWidth > contentWidth)
		}

		check()

		const observer = new ResizeObserver(check)

		observer.observe(el)

		return () => observer.disconnect()
	}, [ref, text])

	return truncated
}
