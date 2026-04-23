'use client'

import { useMediaQuery } from './use-media-query'

/** True when the viewport is at least `px` wide. Defaults to true during SSR. */
export function useMinWidth(px: number): boolean {
	return useMediaQuery(`(min-width: ${px}px)`)
}
