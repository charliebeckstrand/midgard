'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'

/**
 * The search param that opens a Drawer, such as `?region=ga` on a national
 * map or `?county=13121` on a state tab. Each open is a history entry, so Back
 * closes the Drawer. A close of a Drawer that this page opened goes back to
 * that entry; a close of a Drawer that the address opened replaces it.
 *
 * @param name - The search param, `region` or `county`.
 * @returns The value of the param or `null`, a function that opens the Drawer
 * on a value, and a function that closes it.
 */
export function useDrawerParam(name: string): {
	value: string | null
	open: (value: string) => void
	close: () => void
} {
	const router = useRouter()

	const pathname = usePathname()

	const params = useSearchParams()

	// Whether the open entry is one this page pushed, so Back leads to the page without it.
	const pushed = useRef(false)

	const value = params.get(name)

	function href(next: string | null): string {
		const search = new URLSearchParams(params)

		if (next === null) search.delete(name)
		else search.set(name, next)

		const query = search.toString()

		return query === '' ? pathname : `${pathname}?${query}`
	}

	return {
		value,
		open: (next) => {
			if (value === null) {
				pushed.current = true

				router.push(href(next), { scroll: false })
			} else {
				router.replace(href(next), { scroll: false })
			}
		},
		close: () => {
			if (pushed.current) {
				pushed.current = false

				router.back()
			} else {
				router.replace(href(null), { scroll: false })
			}
		},
	}
}
