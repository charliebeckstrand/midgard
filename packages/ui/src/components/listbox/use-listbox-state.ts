import { useCallback, useState } from 'react'
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
	const [internalOpen, setInternalOpen] = useState(false)

	const isOpenControlled = openProp !== undefined

	const open = isOpenControlled ? openProp : internalOpen

	const setOpen = useCallback(
		(next: boolean) => {
			if (!isOpenControlled) setInternalOpen(next)

			onOpenChange?.(next)
		},
		[isOpenControlled, onOpenChange],
	)

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
