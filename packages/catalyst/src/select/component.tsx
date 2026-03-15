'use client'

import clsx from 'clsx'
import type React from 'react'
import { controlWrapper, controlInput } from '../utils'

type SelectProps = {
	className?: string
	multiple?: boolean
	disabled?: boolean
	invalid?: boolean
} & Omit<React.ComponentPropsWithoutRef<'select'>, 'className'>

export function Select({ className, multiple, disabled, invalid, ...props }: SelectProps) {
	return (
		<span
			data-slot="control"
			className={clsx(className, 'group', controlWrapper)}
		>
			<select
				multiple={multiple}
				disabled={disabled}
				data-invalid={invalid ? '' : undefined}
				{...props}
				className={clsx(
					'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
					multiple
						? 'px-[calc(--spacing(3.5)-1px)] sm:px-[calc(--spacing(3)-1px)]'
						: 'pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
					'[&_optgroup]:font-semibold',
					controlInput,
					'dark:*:text-white dark:*:bg-zinc-800',
				)}
			/>
			{!multiple && (
				<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
					<svg
						className="size-5 stroke-zinc-500 group-has-[:disabled]:stroke-zinc-600 sm:size-4 dark:stroke-zinc-400 forced-colors:stroke-[CanvasText]"
						viewBox="0 0 16 16"
						aria-hidden="true"
						fill="none"
					>
						<path d="M5.75 10.75L8 13L10.25 10.75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
						<path d="M10.25 5.25L8 3L5.75 5.25" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</span>
			)}
		</span>
	)
}
