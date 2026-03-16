import clsx from 'clsx'
import type React from 'react'

export function Label({ className, ...props }: React.ComponentPropsWithoutRef<'label'>) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: design system label component, control is provided by consumer
		<label
			data-slot="label"
			{...props}
			className={clsx(
				className,
				'text-base/6 text-zinc-950 select-none data-disabled:opacity-50  dark:text-white',
			)}
		/>
	)
}

export function Legend({ className, ...props }: React.ComponentPropsWithoutRef<'legend'>) {
	return (
		<legend
			data-slot="legend"
			{...props}
			className={clsx(
				className,
				'text-base/6 font-semibold text-zinc-950 disabled:opacity-50  dark:text-white',
			)}
		/>
	)
}

export function Description({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p
			data-slot="description"
			{...props}
			className={clsx(
				className,
				'text-base/6 text-zinc-500 data-disabled:opacity-50  dark:text-zinc-400',
			)}
		/>
	)
}

export function ErrorMessage({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p
			data-slot="error"
			{...props}
			className={clsx(className, 'text-base/6 text-red-500 data-disabled:opacity-50 ')}
		/>
	)
}
