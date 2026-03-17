'use client'

import type { VariantProps } from 'class-variance-authority'
import clsx from 'clsx'
import type React from 'react'
import { createContext, useCallback, useContext } from 'react'
import { useControllable } from '../../hooks'
import { CheckboxIcon } from '../../primitives'
import { controlFieldGrid } from '../../recipes/field'
import { checkbox } from './variants'

const DisabledContext = createContext(false)

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
	children,
	...props
}: { className?: string; disabled?: boolean } & React.ComponentPropsWithoutRef<'div'>) {
	return (
		<DisabledContext value={disabled ?? false}>
			<div
				data-slot="field"
				data-disabled={disabled ? '' : undefined}
				{...props}
				className={clsx(className, controlFieldGrid)}
			>
				{children}
			</div>
		</DisabledContext>
	)
}

export type CheckboxProps = VariantProps<typeof checkbox> & {
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
	checked: checkedProp,
	defaultChecked,
	indeterminate,
	onChange,
	disabled: disabledProp,
	name,
	value,
	...props
}: CheckboxProps) {
	const fieldDisabled = useContext(DisabledContext)
	const disabled = disabledProp ?? fieldDisabled

	const [checked, setChecked] = useControllable({
		value: checkedProp,
		defaultValue: defaultChecked ?? false,
		onChange,
	})

	const handleClick = useCallback(() => {
		if (disabled) return
		setChecked(!checked)
	}, [checked, disabled, setChecked])

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
		// biome-ignore lint/a11y/useSemanticElements: button with role="checkbox" is intentional for custom styled checkbox
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
				<CheckboxIcon />
			</span>
		</button>
	)
}
