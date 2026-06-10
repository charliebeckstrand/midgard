'use client'

import { Search, X } from 'lucide-react'
import { type ChangeEvent, useCallback, useRef } from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks'
import { Button } from '../button'
import { useFormValue } from '../form/use-form-value'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { LoadingSpinner } from '../loading'

export type SearchInputProps = Omit<
	InputProps,
	'type' | 'prefix' | 'suffix' | 'value' | 'defaultValue'
> & {
	value?: string
	defaultValue?: string
	loading?: boolean
	onClear?: () => void
}

const SEARCH_PREFIX = <Icon icon={<Search />} />

/** Search-type Input with a leading search icon — shows a LoadingSpinner while `loading` and a clear button once non-empty, returning focus to the field on clear. Binds to an enclosing Form field by `name`. */
export function SearchInput({
	value,
	defaultValue,
	loading,
	onChange,
	onClear,
	onBlur,
	name,
	ref,
	className,
	...props
}: SearchInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	const setRefs = useComposedRef(inputRef, ref)

	const {
		value: current,
		setValue: setCurrentValue,
		setTouched,
	} = useFormValue<string>(name, {
		value,
		defaultValue: defaultValue ?? '',
	})

	const currentValue = current ?? ''

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			setCurrentValue(e.target.value)

			onChange?.(e)

			if (e.target.value === '') onClear?.()
		},
		[onChange, onClear, setCurrentValue],
	)

	const handleClear = useCallback(() => {
		const input = inputRef.current

		// Drive the clear through a native input event so it flows through
		// `handleChange` like any edit — `setCurrentValue('')` alone is a no-op
		// while controlled, so this dispatches the change to both controlled
		// and uncontrolled consumers.
		if (input) {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

			setter?.call(input, '')

			input.dispatchEvent(new Event('input', { bubbles: true }))
		}

		// Returns focus to the input when the clear button unmounts (WCAG 2.4.3).
		input?.focus()
	}, [])

	const suffix = loading ? (
		<LoadingSpinner />
	) : currentValue !== '' ? (
		<Button
			variant="bare"
			className="pointer-events-auto"
			aria-label="Clear search"
			onClick={handleClear}
		>
			<Icon icon={<X />} />
		</Button>
	) : undefined

	return (
		<Input
			ref={setRefs}
			data-slot="search-input"
			type="search"
			name={name}
			value={currentValue}
			onChange={handleChange}
			onBlur={(e) => {
				setTouched()

				onBlur?.(e)
			}}
			prefix={SEARCH_PREFIX}
			suffix={suffix}
			className={cn('[&::-webkit-search-cancel-button]:appearance-none', className)}
			{...props}
		/>
	)
}
