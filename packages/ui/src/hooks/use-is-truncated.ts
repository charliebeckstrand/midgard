'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

const HIDDEN_STYLES =
	'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;white-space:nowrap;width:auto;max-width:none;'

export function useIsTruncated(ref: RefObject<HTMLElement | null>, text: string): boolean {
	const [truncated, setTruncated] = useState(false)

	useLayoutEffect(() => {
		const el = ref.current

		if (!el || !text) {
			setTruncated(false)

			return
		}

		const measurer = document.createElement('span')

		measurer.textContent = text

		measurer.setAttribute('aria-hidden', 'true')

		measurer.style.cssText = HIDDEN_STYLES

		el.appendChild(measurer)

		const check = () => {
			const textWidth = measurer.getBoundingClientRect().width

			const cs = getComputedStyle(el)

			const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)

			const contentWidth = el.getBoundingClientRect().width - paddingX

			setTruncated(textWidth > contentWidth)
		}

		check()

		const observer = new ResizeObserver(check)

		observer.observe(el)

		let fontsCancelled = false

		document.fonts?.ready.then(() => {
			if (!fontsCancelled) check()
		})

		return () => {
			fontsCancelled = true

			observer.disconnect()

			measurer.remove()
		}
	}, [ref, text])

	return truncated
}
