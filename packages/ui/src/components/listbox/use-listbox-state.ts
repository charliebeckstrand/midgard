'use client'

import { useCallback } from 'react'
import { useControllableFlag } from '../../hooks/use-controllable'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

type ListboxStateParams<T> = {
	multiple: boolean
	nullable: boolean
	value: T | T[] | undefined
	open?: boolean
	defaultOpen?: boolean
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
	defaultOpen,
	onOpenChange,
	setValue,
}: ListboxStateParams<T>) {
	const [open, setOpen] = useControllableFlag({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange,
	})

	const { toggle, commit, flushPending, selectionValue } = useDeferredToggle<T>({
		multiple,
		nullable,
		value,
		setValue,
		open,
	})

	const select = useCallback(
		(newValue: T) => {
			if (!multiple) {
				commit(newValue)

				setOpen(false)
			} else {
				toggle(newValue)
			}
		},
		[multiple, toggle, commit, setOpen],
	)

	return { open, setOpen, select, flushPending, selectionValue }
}
