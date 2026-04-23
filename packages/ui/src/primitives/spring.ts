'use client'

import { ugoki } from '../recipes'

const active = {
	whileTap: { scale: 0.95 },
	transition: ugoki.spring,
} as const

/** Spreadable motion props for a press-scale spring effect. */
export function springProps(enabled = true) {
	return enabled ? active : {}
}
