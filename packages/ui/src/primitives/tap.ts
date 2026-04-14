'use client'

import { ugoki } from '../recipes'

/** Spreadable motion props for tap-feedback scale on press. */
export function useTap(enabled = true) {
	if (!enabled) return {}

	return {
		whileTap: { scale: 0.95 } as const,
		transition: ugoki.spring,
	}
}
