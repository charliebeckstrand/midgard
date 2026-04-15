import { type RefObject, useCallback, useRef, useState } from 'react'
import { useSelect } from '../../hooks/use-select'

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

	const toggle = useSelect({ multiple, nullable, setValue })

	const pendingRef = useRef<{ value: T } | null>(null)

	const select = useCallback(
		(newValue: T) => {
			if (!multiple) {
				pendingRef.current = { value: newValue }
				close()
			} else {
				toggle(newValue)
			}
		},
		[multiple, toggle, close],
	)

	const flushPending = useCallback(() => {
		if (pendingRef.current) {
			toggle(pendingRef.current.value)

			pendingRef.current = null
		}
	}, [toggle])

	return { open, setOpen, close, select, flushPending }
}
