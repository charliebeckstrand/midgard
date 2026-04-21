'use client'

import { X } from 'lucide-react'
import type React from 'react'
import { cn } from '../../core'
import {
	createPanel,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelTitleProps,
} from '../../primitives'
import { Button } from '../button'
import { Icon } from '../icon'
import { useInspectorContext } from './component'
import {
	inspectorActionsVariants,
	inspectorBodyVariants,
	inspectorCloseVariants,
	inspectorDescriptionVariants,
	inspectorHeaderVariants,
	inspectorTitleVariants,
} from './variants'

export type InspectorTitleProps = PanelTitleProps
export type InspectorDescriptionProps = PanelDescriptionProps
export type InspectorBodyProps = PanelBodyProps
export type InspectorActionsProps = PanelActionsProps

const { Title, Description, Body, Actions } = createPanel('inspector', {
	title: inspectorTitleVariants,
	description: inspectorDescriptionVariants,
	body: inspectorBodyVariants,
	actions: inspectorActionsVariants,
})

export {
	Actions as InspectorActions,
	Body as InspectorBody,
	Description as InspectorDescription,
	Title as InspectorTitle,
}

export type InspectorHeaderProps = {
	className?: string
	children: React.ReactNode
}

export function InspectorHeader({ className, children }: InspectorHeaderProps) {
	return (
		<div data-slot="inspector-header" className={cn(inspectorHeaderVariants(), className)}>
			{children}
		</div>
	)
}

export type InspectorCloseProps = {
	className?: string
	icon?: React.ReactNode
	'aria-label'?: string
	onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export function InspectorClose({
	className,
	icon,
	onClick,
	'aria-label': ariaLabel = 'Close inspector',
}: InspectorCloseProps) {
	const { close } = useInspectorContext()

	return (
		<Button
			variant="plain"
			aria-label={ariaLabel}
			data-slot="inspector-close"
			className={cn(inspectorCloseVariants(), className)}
			prefix={icon ?? <Icon icon={<X />} />}
			onClick={(e) => {
				onClick?.(e)
				close()
			}}
		/>
	)
}
