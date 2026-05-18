import { type MouseEvent, type RefObject, useCallback } from 'react'

type UseComboboxTriggerParams = {
	open: boolean
	close: () => void
	setOpen: (open: boolean) => void
	inputRef: RefObject<HTMLInputElement | null>
}

export function useComboboxTrigger({ open, close, setOpen, inputRef }: UseComboboxTriggerParams) {
	const onMouseDown = useCallback(
		(e: MouseEvent<HTMLElement>) => {
			e.preventDefault()

			if (open) {
				close()
			} else {
				inputRef.current?.focus()
				inputRef.current?.select()

				setOpen(true)
			}
		},
		[open, close, setOpen, inputRef],
	)

	return { onMouseDown }
}
