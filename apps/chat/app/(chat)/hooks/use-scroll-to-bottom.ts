'use client'

import { useCallback, useRef } from 'react'

export function useScrollToBottom() {
	const ref = useRef<HTMLDivElement>(null)

	const scrollToBottom = useCallback(() => {
		// Use requestAnimationFrame to ensure DOM has updated after React commit
		requestAnimationFrame(() => {
			ref.current?.scrollIntoView({ behavior: 'smooth' })
		})
	}, [])

	return { ref, scrollToBottom }
}
