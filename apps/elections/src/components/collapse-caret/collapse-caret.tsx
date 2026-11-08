'use client'

import { ChevronDown } from 'lucide-react'
import { useCollapseContext } from 'ui/collapse'
import { Icon } from 'ui/icon'

/** The caret of a Collapse trigger, which turns up while the panel is open. */
export function CollapseCaret() {
	const { open } = useCollapseContext()

	return (
		<Icon
			icon={<ChevronDown />}
			size="sm"
			className={
				open ? 'rotate-180 motion-safe:transition-transform' : 'motion-safe:transition-transform'
			}
		/>
	)
}
