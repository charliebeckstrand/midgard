'use client'

import { cloneElement, type ReactElement, useState } from 'react'

/** A trigger that the {@link Opener} wires: a `DialogTrigger`, `DrawerTrigger`, or `SheetTrigger`. */
type TriggerElement = ReactElement<{ open?: boolean; onClick?: () => void }>

/** A panel that the {@link Opener} wires: a `Dialog`, `Drawer`, or `Sheet`. */
type PanelElement = ReactElement<{ open?: boolean; onOpenChange?: (open: boolean) => void }>

/**
 * Connect a panel trigger to its panel in a demo. A panel trigger is a sibling
 * of its panel and shares no state with it, and the `render` of `Axes` must not
 * call a hook. This wrapper keeps the open state, gives it to both children,
 * and adds nothing to the DOM.
 *
 * @example
 * <Opener>
 * 	<DialogTrigger><Button>Open</Button></DialogTrigger>
 * 	<Dialog {...props}>…</Dialog>
 * </Opener>
 */
export function Opener({
	children: [trigger, panel],
}: {
	children: [TriggerElement, PanelElement]
}) {
	const [open, setOpen] = useState(false)

	return (
		<>
			{cloneElement(trigger, { open, onClick: () => setOpen(true) })}

			{cloneElement(panel, { open, onOpenChange: setOpen })}
		</>
	)
}
