'use client'

import type React from 'react'
import { cn } from '../../core'
import { sumi } from '../../recipes'
import { useDialog } from './context'

export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useDialog()
	return (
		<h2
			id={titleId}
			data-slot="title"
			{...props}
			className={cn(`text-lg/6 font-semibold text-balance ${sumi.base} sm:text-base/6`, className)}
		/>
	)
}

export function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	const { descriptionId } = useDialog()
	return (
		<p
			id={descriptionId}
			data-slot="description"
			{...props}
			className={cn(`mt-2 text-base/6 ${sumi.usui} text-pretty`, className)}
		/>
	)
}

export function DialogBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div data-slot="body" {...props} className={cn(`mt-6 ${sumi.base}`, className)} />
}

export function DialogActions({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="actions"
			{...props}
			className={cn(
				'mt-8 flex flex-col-reverse items-center justify-end gap-3 *:w-full sm:flex-row sm:*:w-auto',
				className,
			)}
		/>
	)
}
