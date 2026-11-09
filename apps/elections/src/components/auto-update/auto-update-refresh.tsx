'use client'

import { LiveRefresh } from 'shared/refresh'
import { useAutoUpdate } from '../../hooks/use-auto-update'

/**
 * Renders the page again each minute while votes are counted and the Auto
 * update setting is on. `LiveRefresh` skips a refresh while the tab is hidden.
 */
export function AutoUpdateRefresh({ live }: { live: boolean }) {
	const autoUpdate = useAutoUpdate()

	return <LiveRefresh live={live && autoUpdate} />
}
