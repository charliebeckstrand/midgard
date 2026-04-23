'use client'

import { useMediaQuery } from './use-media-query'

/** True when the device has a hover-capable pointer. Defaults to true during SSR. */
export function useHasHover(): boolean {
	return useMediaQuery('(hover: hover)')
}
