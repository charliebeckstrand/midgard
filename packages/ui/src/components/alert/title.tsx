'use client'

import clsx from 'clsx'
import type React from 'react'
import { useAlert } from './context'

export function AlertTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useAlert()
	return (
		<h2
			id={titleId}
			{...props}
			className={clsx(
				className,
				'text-center text-base/6 font-semibold text-balance text-zinc-950 sm:text-left sm:text-wrap dark:text-white',
			)}
		/>
	)
}
