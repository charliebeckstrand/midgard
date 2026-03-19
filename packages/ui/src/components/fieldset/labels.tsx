import type React from 'react'
import { cn } from '../../core'
import { sumi, yasumi } from '../../recipes'

export function Label({ className, ...props }: React.ComponentPropsWithoutRef<'label'>) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: design system label component, control is provided by consumer
		<label
			data-slot="label"
			{...props}
			className={cn(`text-base/6 ${sumi.base} select-none ${yasumi.base}`, className)}
		/>
	)
}

export function Legend({ className, ...props }: React.ComponentPropsWithoutRef<'legend'>) {
	return (
		<legend
			data-slot="legend"
			{...props}
			className={cn(`text-base/6 font-semibold ${sumi.base} ${yasumi.base}`, className)}
		/>
	)
}

export function Description({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p
			data-slot="description"
			{...props}
			className={cn(`text-base/6 ${sumi.usui} ${yasumi.base}`, className)}
		/>
	)
}

export function ErrorMessage({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p
			data-slot="error"
			{...props}
			className={cn(`text-base/6 text-red-600 ${yasumi.base}`, className)}
		/>
	)
}
