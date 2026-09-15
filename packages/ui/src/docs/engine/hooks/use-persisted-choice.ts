import { useEffect, useState } from 'react'

/**
 * A `localStorage`-backed choice among `options`. It reads the stored value on
 * mount, and falls back to `fallback` when that value is absent or no longer an
 * option. Every change writes back under `key`.
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
