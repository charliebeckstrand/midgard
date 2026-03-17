'use client'

import clsx from 'clsx'
import type React from 'react'
import { useAlert } from './context'

export function AlertDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	const { descriptionId } = useAlert()
	return (
		<p
			id={descriptionId}
			{...props}
			className={clsx(
				className,
				'mt-2 text-center text-base/6 text-zinc-500 text-pretty sm:text-left dark:text-zinc-400',
			)}
		/>
	)
}
