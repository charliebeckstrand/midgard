import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type CodeVariants, k } from '../../recipes/kata/code'

export type CodeProps = ComponentPropsWithoutRef<'code'> & {
	size?: CodeVariants['size']
}

// `size` resolves from the prop or the recipe default only — inline Code is a
// pure, server-renderable display leaf and deliberately stays density-inert
// (reading ambient Density would force `'use client'` onto code in static content).
/** Inline monospace code span — `size` selects the type scale. */
export function Code({ className, size, ...props }: CodeProps) {
	return <code data-slot="code" className={cn(k({ size }), className)} {...props} />
}
