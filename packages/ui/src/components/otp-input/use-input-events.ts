import { useCallback } from 'react'
import { deleteChar, isValidChar, isValidPaste, replaceChar } from './utilities'

type InputType = 'text' | 'number'

type UseInputEventsOptions = {
	value: string
	length: number
	type: InputType
	commit: (next: string) => void
	focusCell: (i: number) => void
}

export function useInputEvents({ value, length, type, commit, focusCell }: UseInputEventsOptions) {
	const handleChange = useCallback(
		(i: number, e: React.ChangeEvent<HTMLInputElement>) => {
			const char = e.target.value.slice(-1)

			if (!char || !isValidChar(char, type)) return

			commit(replaceChar(value, i, char))

			if (i < length - 1) focusCell(i + 1)
		},
		[value, length, type, commit, focusCell],
	)

	const handleKeyDown = useCallback(
		(i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
			switch (e.key) {
				case 'Backspace': {
					e.preventDefault()

					const { next, focus } = deleteChar(value, i)

					commit(next)

					if (focus !== null) focusCell(focus)

					break
				}

				case 'ArrowLeft':
					if (i > 0) {
						e.preventDefault()

						focusCell(i - 1)
					}

					break

				case 'ArrowRight':
					if (i < length - 1) {
						e.preventDefault()

						focusCell(i + 1)
					}

					break
			}
		},
		[value, length, commit, focusCell],
	)

	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			e.preventDefault()

			const text = e.clipboardData.getData('text').slice(0, length)

			if (!isValidPaste(text, type)) return

			commit(text)

			focusCell(Math.min(text.length, length - 1))
		},
		[length, type, commit, focusCell],
	)

	return { handleChange, handleKeyDown, handlePaste }
}
