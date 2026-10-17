'use client'

import { Activity } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { useLazyModule } from '../../hooks/use-lazy-module'
import { useSidebarLayoutLayout } from '../../layouts/sidebar/sidebar'
import { k } from '../../recipes/kata/events'
import { resolveVariant } from '../../types'
import { createLazyModule } from '../../utilities/lazy-module'
import { loadTools } from './events-load'

const sheet = createLazyModule(() => import('./events-sheet'))

/**
 * The header button of the events. The server renders it, and CSS shows it
 * while the events run, by the attribute that `EventsScript` writes before
 * the first paint. Where the enclosing `SidebarLayout` is inline, it hides
 * while the panel is pinned, as the panel shows there. A dot
 * shows while the store holds a report, and the icon is red while a capture
 * runs. The first press loads the sheet.
 *
 * @remarks The store pauses from the press, so it does not record the load of
 * its own sheet, and the sheet ends the pause when it closes. A load that
 * fails throws in the next render, so the nearest error boundary shows it.
 */
export function EventsButton() {
	// No sheet renders before the first open.
	const [open, setOpen] = useState<boolean>()

	const [failure, setFailure] = useState<{ error: unknown }>()

	if (failure) throw failure.error

	const Sheet = useLazyModule(sheet, false)?.EventsSheet

	// Outside a sidebar layout no panel shows, so the button never hides for it.
	const layout = useSidebarLayoutLayout() ?? 'drawer'

	const show = () => {
		if (Sheet) {
			setOpen(true)

			return
		}

		loadTools(sheet, true).then(
			() => setOpen(true),
			(error: unknown) => setFailure({ error }),
		)
	}

	// The attribute marks the button as a part of the tools (`OWN`).
	return (
		<span
			data-events-tool=""
			className={cn(
				'hidden [:root[data-events]_&]:contents',
				resolveVariant(layout, k.layout.button),
			)}
		>
			<Button variant="bare" aria-label="Events" className="relative" onClick={show}>
				<Icon icon={<Activity />} className="[:root[data-events-capture]_&]:text-red-600" />
				<span className="absolute end-1 top-1 hidden size-1.5 rounded-full bg-red-500 [:root[data-events-reports]_&]:block" />
			</Button>
			{open !== undefined && Sheet && <Sheet open={open} onOpenChange={setOpen} />}
		</span>
	)
}
