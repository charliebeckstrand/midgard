import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dl'
import { type DlOrientation, DlProvider } from './context'

export type DescriptionListVariants = {
	orientation?: DlOrientation
}

export type DescriptionListProps = DescriptionListVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dl'>, 'className'>

export function DescriptionList({
	orientation = 'horizontal',
	className,
	...props
}: DescriptionListProps) {
	return (
		<DlProvider value={orientation}>
			<dl
				data-slot="dl"
				data-orientation={orientation}
				className={cn(k.root({ orientation }), className)}
				{...props}
			/>
		</DlProvider>
	)
}
