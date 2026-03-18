'use client'

import type React from 'react'
import { cn } from '../../core'
import { ma, omote } from '../../recipes'

export type TextareaProps = {
	className?: string
	resizable?: boolean
	disabled?: boolean
	invalid?: boolean
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({
	className,
	resizable = true,
	disabled,
	invalid,
	readOnly,
	...props
}: TextareaProps) {
	return (
		<span
			data-slot="control"
			className={cn(
				omote.control,
				'has-read-only:before:bg-transparent has-read-only:before:shadow-none',
				className,
			)}
		>
			<textarea
				disabled={disabled}
				readOnly={readOnly}
				tabIndex={readOnly ? -1 : undefined}
				data-invalid={invalid ? '' : undefined}
				{...props}
				className={cn(
					`relative block h-full min-h-11 w-full appearance-none rounded-lg sm:min-h-9 ${ma.control}`,
					omote.input,
					resizable ? 'resize-y' : 'resize-none',
				)}
			/>
		</span>
	)
}
