'use client'

import type React from 'react'
import { cn } from '../../core'
import { ChevronIcon } from '../../primitives/icons'
import { omote } from '../../recipes'

export type SelectProps = {
	className?: string
	multiple?: boolean
	disabled?: boolean
	invalid?: boolean
} & Omit<React.ComponentPropsWithoutRef<'select'>, 'className'>

export function Select({ className, multiple, disabled, invalid, ...props }: SelectProps) {
	return (
		<span data-slot="control" className={cn('group', omote.control, className)}>
			<select
				multiple={multiple}
				disabled={disabled}
				data-invalid={invalid ? '' : undefined}
				{...props}
				className={cn(
					'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
					multiple
						? 'px-[calc(--spacing(3.5)-1px)] sm:px-[calc(--spacing(3)-1px)]'
						: 'pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
					'[&_optgroup]:font-semibold',
					omote.input,
					'dark:*:text-white dark:*:bg-zinc-800',
				)}
			/>
			{!multiple && (
				<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
					<ChevronIcon className="group-has-[:disabled]:stroke-zinc-600" />
				</span>
			)}
		</span>
	)
}
