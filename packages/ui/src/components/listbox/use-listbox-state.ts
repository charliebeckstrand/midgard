'use client'

import { useCallback } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

type ListboxStateParams<T> = {
	multiple: boolean
	nullable: boolean
	value: T | T[] | undefined
	open?: boolean
	onOpenChange?: (open: boolean) => void
	setValue: (
		value: T | T[] | undefined | ((prev: T | T[] | undefined) => T | T[] | undefined),
	) => void
}

export function useListboxState<T>({
	multiple,
	nullable,
	value,
	open: openProp,
	onOpenChange,
	setValue,
}: ListboxStateParams<T>) {
	const [open = false, setOpen] = useControllable<boolean>({
		value: openProp,
		defaultValue: false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const close = useCallback(() => {
		setOpen(false)
	}, [setOpen])

	const { toggle, commit, flushPending, selectionValue } = useDeferredToggle<T>({
		multiple,
		nullable,
		value,
		setValue,
	})

	const select = useCallback(
		(newValue: T) => {
			if (!multiple) {
				commit(newValue)
				close()
			} else {
				toggle(newValue)
			}
		},
		[multiple, toggle, commit, close],
	)

	return { open, setOpen, close, select, flushPending, selectionValue }
}
