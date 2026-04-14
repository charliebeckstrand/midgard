'use client'

import { useCallback } from 'react'

type UseSelectOptions<T> = {
	multiple: boolean
	nullable: boolean
	setValue: (updater: (prev: T | T[] | undefined) => T | T[] | undefined) => void
}

/** Shared select / toggle logic for Listbox and Combobox. */
export function useSelect<T>({ multiple, nullable, setValue }: UseSelectOptions<T>) {
	return useCallback(
		(newValue: T) => {
			setValue((prev) => {
				if (multiple) {
					const arr = (Array.isArray(prev) ? prev : []) as T[]

					return arr.includes(newValue) ? arr.filter((v) => v !== newValue) : [...arr, newValue]
				}

				if (nullable && prev === newValue) return undefined

				return newValue as T | T[]
			})
		},
		[multiple, nullable, setValue],
	)
}
