'use client'

import { ugoki } from '../recipes'

type TapProps = {
	whileTap?: { readonly scale: number }
	transition?: typeof ugoki.spring
}

const tapProps: TapProps = {
	whileTap: { scale: 0.95 },
	transition: ugoki.spring,
}

const empty: TapProps = {}

/** Spreadable motion props for tap-feedback scale on press. */
export function useTap(enabled = true): TapProps {
	return enabled ? tapProps : empty
}
