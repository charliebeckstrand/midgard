'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useMobileSidebar() {
	const [open, setOpen] = useState(false)

	const close = useCallback(() => setOpen(false), [])

	const mainRef = useRef<HTMLElement>(null)

	useEffect(() => {
		if (mainRef.current) {
			if (open) {
				mainRef.current.setAttribute('inert', '')
			} else {
				mainRef.current.removeAttribute('inert')
			}
		}
	}, [open])

	return { open, setOpen, close, mainRef }
}
