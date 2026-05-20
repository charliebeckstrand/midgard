'use client'

import type { AriaAttributes, MouseEvent, MouseEventHandler, ReactElement } from 'react'
import { cloneElement } from 'react'

export type DrawerTriggerProps = {
	children: ReactElement<{ onClick?: MouseEventHandler } & AriaAttributes>
	onClick?: () => void
	/**
	 * Current open state of the paired Drawer. When provided, the trigger advertises
	 * `aria-haspopup="dialog"` and `aria-expanded={expanded}` so assistive tech can
	 * announce the popup relationship and its state.
	 */
	expanded?: boolean
}

export function DrawerTrigger({ children, onClick, expanded }: DrawerTriggerProps) {
	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
		...(expanded !== undefined && {
			'aria-haspopup': 'dialog' as const,
			'aria-expanded': expanded,
		}),
	})
}
