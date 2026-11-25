'use client'

import { Activity } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { dataAttr } from '../../core/data-attr'
import { useFail } from '../../hooks/use-fail'
import { useLazyModule } from '../../hooks/use-lazy-module'
import { useSidebarLayoutPlacement } from '../../layouts/sidebar/context'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/events'
import { createLazyModule } from '../../utilities/lazy-module'
import { noop } from '../../utilities/noop'
import { markEventsRoot } from './engine/events-setting'
import { loadTools } from './events-load'
import { eventsMessages } from './events-messages'

const sheet = createLazyModule(() => import('./events-sheet'))

/**
 * The names of the button, one for each state. The root attributes show one
 * name and hide the others, as they show the dot and the ring. Each name is a
 * whole message, so a translation does not join parts. Each class is literal,
 * so that Tailwind finds it.
 */
const NAMES = [
	{
		message: eventsMessages.events,
		className: 'hidden [:root:not([data-events-capture]):not([data-events-reports])_&]:inline',
	},
	{
		message: eventsMessages.eventsCapturing,
		className: 'hidden [:root[data-events-capture]:not([data-events-reports])_&]:inline',
	},
	{
		message: eventsMessages.eventsReports,
		className: 'hidden [:root[data-events-reports]:not([data-events-capture])_&]:inline',
	},
	{
		message: eventsMessages.eventsCapturingReports,
		className: 'hidden [:root[data-events-capture][data-events-reports]_&]:inline',
	},
]

/**
 * The header button of the events. The server renders it, and CSS shows it
 * while the events run, by the attribute that the server writes on the root
 * element. Where the enclosing `SidebarLayout` is inline, it hides
 * while the panel is pinned, as the panel shows there. A dot
 * shows while the store holds a report. While a capture runs, the icon is red
 * and a ring shows. The same attributes show the hidden name of the state, such
 * as "Events, capture running". A hover or a focus loads the sheet before the
 * press, and a press before the sheet loads opens it when it arrives. While the sheet is open,
 * the button stamps `aria-expanded` and `data-open`. When it mounts, it writes
 * the root attributes again, so it stays after React renders `<html>` again on
 * the client, as after an error in the hydration.
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

	const fail = useFail()

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

		loadTools(sheet, true).then(() => setOpen(true), fail)
	}

	// A render of `<html>` on the client removes the root attributes.
	useEffect(markEventsRoot, [])

	const slots = k({ layout })

	// The attribute marks the button as a part of the tools (`TOOL_ATTRIBUTE`).
	return (
		<span data-events-tool="" className={slots.button}>
			<Button
				variant="bare"
				aria-haspopup="dialog"
				aria-expanded={open === true}
				data-open={dataAttr(open === true)}
				className="relative"
				onClick={show}
				onPointerEnter={preload}
				onFocus={preload}
			>
				<Icon icon={Activity} className="[:root[data-events-capture]_&]:text-red-600" />
				<span aria-hidden className={slots.dot} />
				<span aria-hidden className={slots.ring} />
				<span className="sr-only">
					{NAMES.map(({ message, className }) => (
						<span key={message.id} className={className}>
							{intl.formatMessage(message)}
						</span>
					))}
				</span>
			</Button>
			{open !== undefined && Sheet && <Sheet open={open} onOpenChange={setOpen} />}
		</span>
	)
}
