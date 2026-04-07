'use client'

import { ugoki } from '../recipes'

/**
 * Tap feedback — returns spreadable motion props for press interactions.
 *
 * `<motion.button {...tap}>` or `<motion.span {...tap}>`
 */
export function useTap(enabled = true) {
	if (!enabled) return {}

	return {
		whileTap: { scale: 0.97 } as const,
		transition: ugoki.spring,
	}
}
