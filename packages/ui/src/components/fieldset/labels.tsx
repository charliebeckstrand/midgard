import type React from 'react'
import { cn } from '../../core'
import { ink, muted } from '../../recipes/text'

export function Label({ className, ...props }: React.ComponentPropsWithoutRef<'label'>) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: design system label component, control is provided by consumer
		<label
			data-slot="label"
			{...props}
			className={cn(`text-base/6 ${ink} select-none data-disabled:opacity-50`, className)}
		/>
	)
}

export function Legend({ className, ...props }: React.ComponentPropsWithoutRef<'legend'>) {
	return (
		<legend
			data-slot="legend"
			{...props}
			className={cn(`text-base/6 font-semibold ${ink} disabled:opacity-50`, className)}
		/>
	)
}

export function Description({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p
			data-slot="description"
			{...props}
			className={cn(`text-base/6 ${muted} data-disabled:opacity-50`, className)}
		/>
	)
}

export function ErrorMessage({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p
			data-slot="error"
			{...props}
			className={cn('text-base/6 text-red-600 data-disabled:opacity-50', className)}
		/>
	)
}
