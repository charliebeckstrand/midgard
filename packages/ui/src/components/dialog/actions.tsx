'use client'

import clsx from 'clsx'
import type React from 'react'

export function DialogActions({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				'mt-8 flex flex-col-reverse items-center justify-end gap-3 *:w-full sm:flex-row sm:*:w-auto',
			)}
		/>
	)
}
