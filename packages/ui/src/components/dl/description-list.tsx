import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dl'
import type { Orientation } from '../../types'

export type DlOrientation = Orientation

export type DescriptionListVariants = {
	orientation?: DlOrientation
}

export type DescriptionListProps = DescriptionListVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dl'>, 'className'>

/**
 * Semantic description list. Static leaf: renders in React Server
 * Components. The list owns every orientation-varying style and projects it
 * onto direct `dt` / `dd` children, so term and details read no context.
 */
export function DescriptionList({
	orientation = 'horizontal',
	className,
	...props
}: DescriptionListProps) {
	return (
		<dl
			data-slot="dl"
			data-orientation={orientation}
			className={cn(k.root({ orientation }), k.projection[orientation], className)}
			{...props}
		/>
	)
}
