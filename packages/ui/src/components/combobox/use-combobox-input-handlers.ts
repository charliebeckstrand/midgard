import {
	type ChangeEvent,
	type FocusEvent,
	type KeyboardEvent,
	type KeyboardEventHandler,
	type RefObject,
	useCallback,
} from 'react'
import { selectActiveOrSingleOption } from './utilities'

type UseComboboxInputHandlersParams<T> = {
	multiple: boolean
	clearOnEmpty: boolean
	value: T | T[] | undefined
	setValue: (value: T | T[] | undefined) => void
	setEditing: (editing: boolean) => void
	setQuery: (query: string) => void
	setOpen: (open: boolean) => void
	close: () => void
	waitForKeyboard: (cb: () => void) => void
	floatingRef: RefObject<HTMLElement | null>
	optionsRef: RefObject<HTMLDivElement | null>
	rovingKeyDown: KeyboardEventHandler<HTMLInputElement>
}

export function useComboboxInputHandlers<T>({
	multiple,
	clearOnEmpty,
	value,
	setValue,
	setEditing,
	setQuery,
	setOpen,
	close,
	waitForKeyboard,
	floatingRef,
	optionsRef,
	rovingKeyDown,
}: UseComboboxInputHandlersParams<T>) {
	const onChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const next = e.target.value

			setEditing(true)

			setQuery(next)

			setOpen(true)

			if (clearOnEmpty && next === '' && !multiple && value !== undefined) {
				setValue(undefined)
			}
		},
		[clearOnEmpty, multiple, value, setEditing, setQuery, setOpen, setValue],
	)

	const onFocus = useCallback(() => {
		waitForKeyboard(() => setOpen(true))
	}, [setOpen, waitForKeyboard])

	const onBlur = useCallback(
		(e: FocusEvent<HTMLInputElement>) => {
			const floating = floatingRef.current

			if (floating?.contains(e.relatedTarget as Node)) return

			close()
		},
		[close, floatingRef],
	)

	const onKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Escape') {
				close()

				return
			}

			if (e.key === 'Enter') {
				const container = optionsRef.current

				if (container && selectActiveOrSingleOption(container)) {
					e.preventDefault()

					return
				}
			}

			rovingKeyDown(e)
		},
		[close, optionsRef, rovingKeyDown],
	)

	return { onChange, onFocus, onBlur, onKeyDown }
}
