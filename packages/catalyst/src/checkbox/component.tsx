'use client'

import clsx from 'clsx'
import type React from 'react'
import type { VariantProps } from 'class-variance-authority'
import { useCallback } from 'react'
import { checkbox } from './variants'

export function CheckboxGroup({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="control"
			{...props}
			className={clsx(
				className,
				'space-y-3',
				'has-data-[slot=description]:space-y-6 has-data-[slot=description]:**:data-[slot=label]:font-medium',
			)}
		/>
	)
}

export function CheckboxField({
	className,
	disabled,
	...props
}: { className?: string; disabled?: boolean } & React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="field"
			data-disabled={disabled ? '' : undefined}
			{...props}
			className={clsx(
				className,
				'grid grid-cols-[1.125rem_1fr] gap-x-4 gap-y-1 sm:grid-cols-[1rem_1fr]',
				'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:mt-0.75 sm:*:data-[slot=control]:mt-1',
				'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
				'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
				'has-data-[slot=description]:**:data-[slot=label]:font-medium',
			)}
		/>
	)
}

type CheckboxProps = VariantProps<typeof checkbox> & {
	className?: string
	checked?: boolean
	defaultChecked?: boolean
	indeterminate?: boolean
	onChange?: (checked: boolean) => void
	disabled?: boolean
	name?: string
	value?: string
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'onChange'>

export function Checkbox({
	color,
	className,
	checked,
	defaultChecked,
	indeterminate,
	onChange,
	disabled,
	name,
	value,
	...props
}: CheckboxProps) {
	const handleClick = useCallback(() => {
		if (disabled) return
		onChange?.(!checked)
	}, [checked, disabled, onChange])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === ' ') {
				e.preventDefault()
				handleClick()
			}
		},
		[handleClick],
	)

	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={indeterminate ? 'mixed' : checked}
			data-slot="control"
			data-checked={checked ? '' : undefined}
			data-indeterminate={indeterminate ? '' : undefined}
			disabled={disabled}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={clsx(className, 'group inline-flex focus:outline-hidden')}
			{...props}
		>
			{name && <input type="hidden" name={name} value={checked ? (value ?? 'on') : ''} />}
			<span className={checkbox({ color })}>
				<svg
					className="size-4 stroke-(--checkbox-check) opacity-0 group-data-checked:opacity-100 sm:h-3.5 sm:w-3.5"
					viewBox="0 0 14 14"
					fill="none"
				>
					<path
						className="opacity-100 group-data-indeterminate:opacity-0"
						d="M3 8L6 11L11 3.5"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						className="opacity-0 group-data-indeterminate:opacity-100"
						d="M3 7H11"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</span>
		</button>
	)
}
