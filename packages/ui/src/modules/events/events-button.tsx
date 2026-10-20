'use client'

import { Activity } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { useLazyModule } from '../../hooks/use-lazy-module'
import { useSidebarLayoutPlacement } from '../../layouts/sidebar/sidebar'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/events'
import { resolveVariant } from '../../types'
import { createLazyModule } from '../../utilities/lazy-module'
import { noop } from '../../utilities/noop'
import { loadTools } from './events-load'
import { eventsMessages } from './events-messages'

const sheet = createLazyModule(() => import('./events-sheet'))

/**
 * The header button of the events. The server renders it, and CSS shows it
 * while the events run, by the attribute that `EventsScript` writes before
 * the first paint. Where the enclosing `SidebarLayout` is inline, it hides
 * while the panel is pinned, as the panel shows there. A dot
 * shows while the store holds a report, and the icon is red while a capture
 * runs. A hover or a focus loads the sheet before the press, and a press
 * before the sheet loads opens it when it arrives.
 *
 * @remarks The store pauses while the sheet loads, so it does not record the
 * load of its own sheet. After a press, the pause stays until the sheet
 * closes. A preload with no press ends it when the load ends. A load that
 * fails throws in the next render, so the nearest error boundary shows it.
 */
export function EventsButton() {
	const intl = useIntl()

	// No sheet renders before the first open.
	const [open, setOpen] = useState<boolean>()

	const [failure, setFailure] = useState<{ error: unknown }>()

	if (failure) throw failure.error

	const Sheet = useLazyModule(sheet, false)?.EventsSheet

	// Outside a sidebar layout no panel shows, so the button never hides for it.
	const layout = useSidebarLayoutPlacement() ?? 'drawer'

	// A failed preload goes out. The press loads again, and shows the error.
	const preload = () => {
		if (!Sheet) loadTools(sheet, false).catch(noop)
	}

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

	// The attribute marks the button as a part of the tools (`TOOL_ATTRIBUTE`).
	return (
		<span
			data-events-tool=""
			className={cn('hidden [:root[data-events]_&]:contents', resolveVariant(layout, k.button))}
		>
			<Button
				variant="bare"
				aria-label={intl.formatMessage(eventsMessages.events)}
				className="relative"
				onClick={show}
				onPointerEnter={preload}
				onFocus={preload}
			>
				<Icon icon={<Activity />} className="[:root[data-events-capture]_&]:text-red-600" />
				<span className="absolute end-1 top-1 hidden size-1.5 rounded-full bg-red-500 [:root[data-events-reports]_&]:block" />
			</Button>
			{open !== undefined && Sheet && <Sheet open={open} onOpenChange={setOpen} />}
		</span>
	)
}
