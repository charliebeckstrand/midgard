'use client'

import type React from 'react'
import { cn } from '../../core'
import { kage, sumi } from '../../recipes'
import { useSheet } from './context'

export function SheetHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="header"
			{...props}
			className={cn('flex flex-col gap-1.5 px-6 pt-6', className)}
		/>
	)
}

export function SheetBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div data-slot="body" {...props} className={cn('flex-1 overflow-auto px-6 py-6', className)} />
	)
}

export function SheetFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="footer"
			{...props}
			className={cn(
				`mt-auto flex items-center justify-end gap-3 border-t ${kage.base} px-6 py-4`,
				className,
			)}
		/>
	)
}

export function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useSheet()
	return (
		<h2
			id={titleId}
			data-slot="title"
			{...props}
			className={cn(`text-lg/6 font-semibold ${sumi.base} sm:text-base/6`, className)}
		/>
	)
}

export function SheetSubtitle({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return (
		<p data-slot="description" {...props} className={cn(`text-sm/6 ${sumi.usui}`, className)} />
	)
}

export function SheetDescription({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const { descriptionId } = useSheet()
	return (
		<div
			id={descriptionId}
			data-slot="description"
			{...props}
			className={cn(`flex-1 overflow-y-auto px-6 text-base/6 ${sumi.usui}`, className)}
		/>
	)
}
