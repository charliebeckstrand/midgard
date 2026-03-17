import type React from 'react'
import { cn } from '../../core'

export function Fieldset({
	className,
	disabled,
	...props
}: { className?: string; disabled?: boolean } & Omit<
	React.ComponentPropsWithoutRef<'fieldset'>,
	'className'
>) {
	return (
		<fieldset
			disabled={disabled}
			{...props}
			className={cn('*:data-[slot=text]:mt-1 [&>*+[data-slot=control]]:mt-6', className)}
		/>
	)
}

export function FieldGroup({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div data-slot="control" {...props} className={cn('space-y-8', className)} />
}

export function Field({
	className,
	disabled,
	...props
}: { className?: string; disabled?: boolean } & Omit<
	React.ComponentPropsWithoutRef<'div'>,
	'className'
>) {
	return (
		<div
			data-disabled={disabled ? '' : undefined}
			{...props}
			className={cn(
				'[&>[data-slot=label]+[data-slot=control]]:mt-3',
				'[&>[data-slot=label]+[data-slot=description]]:mt-1',
				'[&>[data-slot=description]+[data-slot=control]]:mt-3',
				'[&>[data-slot=control]+[data-slot=description]]:mt-3',
				'[&>[data-slot=control]+[data-slot=error]]:mt-3',
				'*:data-[slot=label]:font-medium',
				className,
			)}
		/>
	)
}
