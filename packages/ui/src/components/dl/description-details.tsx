'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dl'
import { useDlOrientation } from './context'

export type DescriptionDetailsProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dd'>, 'className'>

export function DescriptionDetails({ className, ...props }: DescriptionDetailsProps) {
	const orientation = useDlOrientation()

	return (
		<dd data-slot="dl-details" className={cn(k.details({ orientation }), className)} {...props} />
	)
}
