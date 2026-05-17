import { useCallback, useState } from 'react'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

type UseListboxStateParams<T> = {
	multiple: boolean
	nullable: boolean
	setValue: (
		value: T | T[] | undefined | ((prev: T | T[] | undefined) => T | T[] | undefined),
	) => void
}

export function useListboxState<T>({ multiple, nullable, setValue }: UseListboxStateParams<T>) {
	const [open, setOpen] = useState(false)

	const close = useCallback(() => {
		setOpen(false)
	}, [])

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
