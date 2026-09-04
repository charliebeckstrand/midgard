import { useEffect, useState } from 'react'

/**
 * A `localStorage`-backed choice among `options`. Reads the stored value on
 * mount, falls back to `fallback` when it is absent or no longer an option,
 * and writes every change back under `key`.
 */
export function usePersistedChoice<T extends string>(
	key: string,
	options: readonly T[],
	fallback: T,
) {
	const [value, setValue] = useState<T>(() => {
		const stored = localStorage.getItem(key)

		return options.find((option) => option === stored) ?? fallback
	})

	useEffect(() => {
		localStorage.setItem(key, value)
	}, [key, value])

	return [value, setValue] as const
}
