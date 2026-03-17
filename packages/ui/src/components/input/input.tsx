'use client'

import type React from 'react'
import { cn } from '../../core'
import {
	controlInput,
	controlPadding,
	controlWrapper,
	dateInputOverrides,
} from '../../recipes/control'
import { iconSlot } from '../../recipes/icon'

export function InputGroup({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			data-slot="control"
			{...props}
			className={cn(
				'relative isolate block',
				'has-[[data-slot=icon]:first-child]:[&_input]:pl-10 has-[[data-slot=icon]:last-child]:[&_input]:pr-10 sm:has-[[data-slot=icon]:first-child]:[&_input]:pl-8 sm:has-[[data-slot=icon]:last-child]:[&_input]:pr-8',
				// Icon slots — sizing from shared recipe, input-specific positioning
				...iconSlot,
				'*:data-[slot=icon]:pointer-events-none *:data-[slot=icon]:absolute *:data-[slot=icon]:top-3 *:data-[slot=icon]:z-10 sm:*:data-[slot=icon]:top-2.5',
				'[&>[data-slot=icon]:first-child]:left-3 sm:[&>[data-slot=icon]:first-child]:left-2.5 [&>[data-slot=icon]:last-child]:right-3 sm:[&>[data-slot=icon]:last-child]:right-2.5',
				'*:data-[slot=icon]:text-zinc-500 dark:*:data-[slot=icon]:text-zinc-400',
				className,
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
			className={cn(
				controlWrapper,
				'has-read-only:before:bg-transparent has-read-only:before:shadow-none',
				className,
			)}
		>
			<input
				disabled={disabled}
				data-invalid={invalid ? '' : undefined}
				{...props}
				className={cn(
					props.type && dateTypes.includes(props.type) && dateInputOverrides,
					`relative block w-full appearance-none rounded-lg ${controlPadding}`,
					controlInput,
					'dark:scheme-dark',
					'dark:read-only:bg-transparent',
				)}
			/>
		</span>
	)
}
