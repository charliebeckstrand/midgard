'use client'

import { useCallback, useRef, useState } from 'react'

type UseDelayedToggleOptions = {
	showDelay?: number
	hideDelay?: number
}

export function useDelayedToggle({
	showDelay = 700,
	hideDelay = 100,
}: UseDelayedToggleOptions = {}) {
	const [open, setOpen] = useState(false)
	const showTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
	const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

	const show = useCallback(() => {
		clearTimeout(hideTimer.current)
		showTimer.current = setTimeout(() => setOpen(true), showDelay)
	}, [showDelay])

	const hide = useCallback(() => {
		clearTimeout(showTimer.current)
		hideTimer.current = setTimeout(() => setOpen(false), hideDelay)
	}, [hideDelay])

	return { open, show, hide } as const
}
