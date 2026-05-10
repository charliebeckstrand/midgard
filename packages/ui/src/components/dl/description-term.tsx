import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { dlTermVariants } from '../../recipes/kata/dl'
import { useDlOrientation } from './context'

export type DescriptionTermProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dt'>, 'className'>

export function DescriptionTerm({ className, ...props }: DescriptionTermProps) {
	const orientation = useDlOrientation()

	return (
		<dt data-slot="dl-term" className={cn(dlTermVariants({ orientation }), className)} {...props} />
	)
}
