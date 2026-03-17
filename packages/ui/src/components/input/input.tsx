'use client'

import clsx from 'clsx'
import type React from 'react'
import { controlInput, controlWrapper, dateInputOverrides } from '../../recipes/control'

export function InputGroup({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			data-slot="control"
			{...props}
			className={clsx(
				className,
				'relative isolate block',
				'has-[[data-slot=icon]:first-child]:[&_input]:pl-10 has-[[data-slot=icon]:last-child]:[&_input]:pr-10 sm:has-[[data-slot=icon]:first-child]:[&_input]:pl-8 sm:has-[[data-slot=icon]:last-child]:[&_input]:pr-8',
				'*:data-[slot=icon]:pointer-events-none *:data-[slot=icon]:absolute *:data-[slot=icon]:top-3 *:data-[slot=icon]:z-10 *:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:top-2.5 sm:*:data-[slot=icon]:size-4',
				'[&>[data-slot=icon]:first-child]:left-3 sm:[&>[data-slot=icon]:first-child]:left-2.5 [&>[data-slot=icon]:last-child]:right-3 sm:[&>[data-slot=icon]:last-child]:right-2.5',
				'*:data-[slot=icon]:text-zinc-500 dark:*:data-[slot=icon]:text-zinc-400',
			)}
		/>
	)
}

const dateTypes = ['date', 'datetime-local', 'month', 'time', 'week']
type DateType = (typeof dateTypes)[number]

export type InputProps = {
	className?: string
	disabled?: boolean
	invalid?: boolean
	type?: 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url' | DateType
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className'>

export function Input({ className, disabled, invalid, ...props }: InputProps) {
	return (
		<span
			data-slot="control"
			className={clsx(
				className,
				controlWrapper,
				'has-read-only:before:bg-transparent has-read-only:before:shadow-none',
			)}
		>
			<input
				disabled={disabled}
				data-invalid={invalid ? '' : undefined}
				{...props}
				className={clsx(
					props.type && dateTypes.includes(props.type) && dateInputOverrides,
					'relative block w-full appearance-none rounded-lg px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
					controlInput,
					'dark:scheme-dark',
					'dark:read-only:bg-transparent',
				)}
			/>
		</span>
	)
}
