'use client'

import type { VariantProps } from 'class-variance-authority'
import clsx from 'clsx'
import type React from 'react'
import { useCallback } from 'react'
import { switchVariants } from './variants'

export function SwitchGroup({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="control"
			{...props}
			className={clsx(
				className,
				'space-y-3 **:data-[slot=label]:font-normal',
				'has-data-[slot=description]:space-y-6 has-data-[slot=description]:**:data-[slot=label]:font-medium',
			)}
		/>
	)
}

export function SwitchField({
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
				'grid grid-cols-[1fr_auto] gap-x-8 gap-y-1 sm:grid-cols-[1fr_auto]',
				'*:data-[slot=control]:col-start-2 *:data-[slot=control]:self-start sm:*:data-[slot=control]:mt-0.5',
				'*:data-[slot=label]:col-start-1 *:data-[slot=label]:row-start-1',
				'*:data-[slot=description]:col-start-1 *:data-[slot=description]:row-start-2',
				'has-data-[slot=description]:**:data-[slot=label]:font-medium',
			)}
		/>
	)
}

type SwitchProps = VariantProps<typeof switchVariants> & {
	className?: string
	checked?: boolean
	defaultChecked?: boolean
	onChange?: (checked: boolean) => void
	disabled?: boolean
	name?: string
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'onChange'>

export function Switch({
	color,
	className,
	checked,
	onChange,
	disabled,
	name,
	...props
}: SwitchProps) {
	const handleClick = useCallback(() => {
		if (disabled) return
		onChange?.(!checked)
	}, [checked, disabled, onChange])

	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			data-slot="control"
			data-checked={checked ? '' : undefined}
			disabled={disabled}
			onClick={handleClick}
			className={switchVariants({ color, className })}
			{...props}
		>
			{name && <input type="hidden" name={name} value={checked ? 'on' : ''} />}
			<span
				aria-hidden="true"
				className={clsx(
					'pointer-events-none relative inline-block size-4.5 rounded-full sm:size-3.5',
					'translate-x-0 transition duration-200 ease-in-out',
					'border border-transparent',
					'bg-white shadow-sm ring-1 ring-black/5',
					'group-data-checked:bg-(--switch) group-data-checked:shadow-(--switch-shadow) group-data-checked:ring-(--switch-ring)',
					'group-data-checked:translate-x-4 sm:group-data-checked:translate-x-3',
					'group-data-checked:group-disabled:bg-white group-data-checked:group-disabled:shadow-sm group-data-checked:group-disabled:ring-black/5',
				)}
			/>
		</button>
	)
}
