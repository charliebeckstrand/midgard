import { type RefObject, useCallback, useState } from 'react'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

type UseListboxSelectionParams<T> = {
	multiple: boolean
	nullable: boolean
	setValue: (
		value: T | T[] | undefined | ((prev: T | T[] | undefined) => T | T[] | undefined),
	) => void
	triggerRef: RefObject<HTMLButtonElement | null>
}

export function useListboxSelection<T>({
	multiple,
	nullable,
	setValue,
	triggerRef,
}: UseListboxSelectionParams<T>) {
	const [open, setOpen] = useState(false)

	const close = useCallback(() => {
		setOpen(false)

		triggerRef.current?.focus()
	}, [triggerRef])

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
