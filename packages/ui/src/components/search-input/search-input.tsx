'use client'

import { Search, X } from 'lucide-react'
import { type ChangeEvent, type ReactNode, useCallback, useRef } from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks'
import { Button } from '../button'
import { useFormValue } from '../form/use-form-value'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { LoadingSpinner } from '../loading'

/**
 * Props for {@link SearchInput}: {@link InputProps} (less `type`/`prefix`/`suffix`/`value`/`defaultValue`) plus a loading flag and clear callback.
 *
 * @see {@link SearchInput}
 */
export type SearchInputProps = Omit<
	InputProps,
	'type' | 'prefix' | 'suffix' | 'value' | 'defaultValue'
> & {
	value?: string
	defaultValue?: string
	/** Replaces the clear button with a spinner suffix while a query is in flight. */
	loading?: boolean
	/** Fires when the field is cleared, whether by the clear button or by emptying it. */
	onClear?: () => void
	/**
	 * Extra trailing content rendered after the field's own suffix (the spinner
	 * or clear button) — e.g. a go-to-result action once a search resolves to a
	 * single match. The field's own suffix keeps its slot either way.
	 */
	suffix?: ReactNode
}

const SEARCH_PREFIX = <Icon icon={<Search />} />

/**
 * Search-type {@link Input} with a leading search icon. Shows a {@link LoadingSpinner}
 * while `loading` and a clear button once non-empty, binding to an enclosing
 * `<Form>` field by `name`.
 *
 * @remarks
 * Clearing drives a native `input` event so controlled and uncontrolled
 * consumers see the same change, then returns focus to the field as the clear
 * button unmounts (WCAG 2.4.3). `loading` suppresses the clear button: a spinner
 * occupies the suffix while a query is in flight.
 *
 * @see {@link SearchInputProps}
 */
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
	suffix: extraSuffix,
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
		(event: ChangeEvent<HTMLInputElement>) => {
			setCurrentValue(event.target.value)

			onChange?.(event)

			if (event.target.value === '') onClear?.()
		},
		[onChange, onClear, setCurrentValue],
	)

	const handleClear = useCallback(() => {
		const input = inputRef.current

		// Drive the clear through a native input event; it flows through
		// `handleChange` like any edit. `setCurrentValue('')` alone is a no-op
		// while controlled; the dispatch reaches both controlled and
		// uncontrolled consumers.
		if (input) {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

			setter?.call(input, '')

			input.dispatchEvent(new Event('input', { bubbles: true }))
		}

		// Returns focus to the input when the clear button unmounts (WCAG 2.4.3).
		input?.focus()
	}, [])

	const ownSuffix = loading ? (
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

	// The consumer's trailing content joins after the field's own suffix; with
	// neither present the slot stays empty (no wrapper), as before.
	const suffix =
		extraSuffix != null ? (
			<>
				{ownSuffix}
				{extraSuffix}
			</>
		) : (
			ownSuffix
		)

	return (
		<Input
			ref={setRefs}
			data-slot="search-input"
			type="search"
			name={name}
			value={currentValue}
			onChange={handleChange}
			onBlur={(event) => {
				setTouched()

				onBlur?.(event)
			}}
			prefix={SEARCH_PREFIX}
			suffix={suffix}
			className={cn('[&::-webkit-search-cancel-button]:appearance-none', className)}
			{...props}
		/>
	)
}
