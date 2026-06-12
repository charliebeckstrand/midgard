import { useEffect, useState } from 'react'

export type SurfaceMode = 'default' | 'glass'

/** Surface options listed in the docs settings dialog. */
export const surfaceModes: { label: string; value: SurfaceMode }[] = [
	{ label: 'Default', value: 'default' },
	{ label: 'Glass', value: 'glass' },
]

const STORAGE_KEY = 'surface'

function readStoredSurface(): SurfaceMode {
	const stored = localStorage.getItem(STORAGE_KEY)

	if (stored === 'default' || stored === 'glass') return stored

	return 'default'
}

/**
 * Persisted docs surface preference (`default | glass`), defaulting to
 * `default`. While `glass`, the app shell enables its `GlassProvider` and
 * every glass-aware component renders its glass variant.
 */
export function useSurface() {
	const [surface, setSurface] = useState<SurfaceMode>(readStoredSurface)

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, surface)
	}, [surface])

	return [surface, setSurface] as const
}
