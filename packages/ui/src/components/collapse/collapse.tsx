'use client'

import { type ReactNode, useCallback } from 'react'
import { cn } from '../../core/cn'
import { useControllable } from '../../hooks/use-controllable'
import { useIdScope } from '../../hooks/use-id-scope'
import { CollapsePanel } from './collapse-panel'
import { CollapseTrigger } from './collapse-trigger'
import { CollapseProvider } from './context'
import { k } from './variants'

export type CollapseProps = {
	/** Initial open state — uncontrolled. */
	defaultOpen?: boolean
	/** Controlled open state. */
	open?: boolean
	/** Called when the open state changes. */
	onOpenChange?: (open: boolean) => void
	/** Animation style for the panel. `true` or `'fade'` for height + opacity, `'slide'` for height only, `false` to disable. @default 'fade' */
	animate?: boolean | 'fade' | 'slide'
	/**
	 * Convenience trigger. Strings render as muted hover-highlighted text;
	 * other ReactNodes render unstyled. Omit for the compound API.
	 */
	trigger?: ReactNode
	children: ReactNode
	className?: string
}

export function Collapse({
	defaultOpen = false,
	open: openProp,
	onOpenChange,
	animate: animateProp = 'fade',
	trigger,
	children,
	className,
}: CollapseProps) {
	const [currentOpen, setCurrentOpen] = useControllable<boolean>({
		value: openProp,
		defaultValue: defaultOpen,
	})

	const open = currentOpen ?? false

	const toggle = useCallback(() => {
		const next = !open

		setCurrentOpen(next)

		onOpenChange?.(next)
	}, [open, setCurrentOpen, onOpenChange])

	const scope = useIdScope()

	const triggerId = scope.sub('trigger')
	const panelId = scope.sub('panel')

	return (
		<CollapseProvider value={{ open, toggle, animate: animateProp, triggerId, panelId }}>
			<div data-slot="collapse" data-open={open || undefined} className={cn(k.base, className)}>
				{trigger !== undefined ? (
					<>
						<CollapseTrigger>{trigger}</CollapseTrigger>
						<CollapsePanel>{children}</CollapsePanel>
					</>
				) : (
					children
				)}
			</div>
		</CollapseProvider>
	)
}
