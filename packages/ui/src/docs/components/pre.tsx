import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'

export function Pre({ className, ...props }: ComponentProps<'pre'>) {
	return (
		<pre
			className={cn('p-4 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800', className)}
			{...props}
		/>
	)
}
