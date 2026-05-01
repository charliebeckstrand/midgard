import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type DlOrientation, DlProvider } from './context'
import { dlVariants } from './variants'

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
				className={cn(dlVariants({ orientation }), className)}
				{...props}
			/>
		</DlProvider>
	)
}
