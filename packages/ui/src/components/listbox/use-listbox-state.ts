'use client'

import { useCallback } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

type UseListboxStateParams<T> = {
	multiple: boolean
	nullable: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	setValue: (
		value: T | T[] | undefined | ((prev: T | T[] | undefined) => T | T[] | undefined),
	) => void
}

export function useListboxState<T>({
	multiple,
	nullable,
	open: openProp,
	onOpenChange,
	setValue,
}: UseListboxStateParams<T>) {
	const [open = false, setOpen] = useControllable<boolean>({
		value: openProp,
		defaultValue: false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const close = useCallback(() => {
		setOpen(false)
	}, [setOpen])

	const { toggle, enqueue, flushPending } = useDeferredToggle<T>({ multiple, nullable, setValue })

	const select = useCallback(
		(newValue: T) => {
			if (!multiple) {
				enqueue(newValue)
				close()
			} else {
				toggle(newValue)
			}
		},
		[multiple, toggle, enqueue, close],
	)

	return { open, setOpen, close, select, flushPending }
}
