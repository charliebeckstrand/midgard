'use client'

import { Search } from 'lucide-react'
import { useComposedRefs } from 'motion/react'
import { type ChangeEvent, type KeyboardEvent, type ReactNode, useMemo } from 'react'
import { defineMessages } from 'react-intl'
import { cn, composeEventHandlers } from '../../core'
import { useFormValue } from '../../primitives/form/use-form-value'
import { useIntl } from '../../primitives/intl/use-intl'
import { clearNativeInput, isComposing } from '../../utilities'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { LoadingSpinner } from '../loading'

const messages = defineMessages({
	clear: {
		id: 'ui.searchInput.clear',
		defaultMessage: 'Clear search',
		description: 'The name of the button that empties a search field.',
	},
})

/**
 * Props for {@link SearchInput}: {@link InputProps} (less `type`/`prefix`/`suffix`/`value`/`defaultValue`/`clearable`/`clearLabel`) plus a loading flag and the clear affordance.
 *
 * @see {@link SearchInput}
 */
export type SearchInputProps = Omit<
	InputProps,
	'type' | 'prefix' | 'suffix' | 'value' | 'defaultValue' | 'clearable' | 'clearLabel'
> & {
	/** Controlled text. `undefined` leaves the field uncontrolled; `null` keeps it controlled and empty (CONVENTIONS §7.3). */
	value?: string | null
	/**
	 * The initial text when uncontrolled.
	 * @defaultValue ''
	 */
	defaultValue?: string
	/** Fires with the current query text; the value-first counterpart to `onChange`. */
	onValueChange?: (value: string) => void
	/**
	 * Replaces the clear button with a spinner suffix while a query is in flight.
	 * @defaultValue false
	 */
	loading?: boolean
	/**
	 * Renders the clear button of {@link Input} in the suffix once the query is
	 * non-empty.
	 *
	 * @defaultValue true
	 * @remarks
	 * The typed-text fields default it on (DateInput does the same), and the
	 * picker family defaults it off, because a trigger states its own emptiness.
	 */
	clearable?: boolean
	/**
	 * The accessible name of the clear button.
	 * @defaultValue `'Clear search'`, in the language of the reader.
	 */
	clearLabel?: string
	/** Fires when the field is cleared, whether by the clear button or by emptying it. */
	onClear?: () => void
	/**
	 * Extra trailing content rendered after the field's own suffix: the spinner
	 * or the clear button. One example is a go-to-result action once a search resolves
	 * to a single match. The field's own suffix keeps its slot either way.
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
 * Clearing drives a native `input` event, so controlled and uncontrolled
 * consumers see the same change. It then returns focus to the field as the
 * clear button unmounts (WCAG 2.4.3). Escape in a field that holds a query
 * clears it the same way and consumes the key, so an enclosing Dialog or
 * popover closes only on an Escape in the empty field. `loading` suppresses
 * the clear button: a spinner occupies the suffix while a query is in flight.
 * `clearable={false}` suppresses it outright.
 *
 * @see {@link SearchInputProps}
 */
export function SearchInput({
	value,
	defaultValue,
	loading,
	clearable = true,
	clearLabel: clearLabelProp,
	onChange,
	onValueChange,
	onClear,
	onBlur,
	onKeyDown,
	name,
	className,
	suffix: extraSuffix,
	ref,
	...props
}: SearchInputProps) {
	const intl = useIntl()

	const clearLabel = clearLabelProp ?? intl.formatMessage(messages.clear)

	const {
		value: current,
		resetRef,
		setValue,
		setTouched,
	} = useFormValue<string>(name, {
		value,
		defaultValue: defaultValue ?? '',
		// An empty query is `''`, not "no value", so the cleared null never
		// reaches the consumer.
		onValueChange: onValueChange && ((next) => onValueChange(next ?? '')),
	})

	const setRef = useComposedRefs(resetRef, ref)

	// Escape clears a query, as a native search field does in some browsers.
	// The clear here makes it the same in each browser. `preventDefault` stops
	// the native clear and tells the escape layer of an enclosing overlay that
	// the key is consumed, so one Escape does not also close the overlay.
	const handleKeyDown = composeEventHandlers(
		onKeyDown,
		(event: KeyboardEvent<HTMLInputElement>) => {
			const input = event.currentTarget

			if (event.key !== 'Escape' || isComposing(event)) return

			if (input.value === '' || input.readOnly || input.disabled) return

			event.preventDefault()

			clearNativeInput(input)
		},
	)

	// The value write runs whatever the caller does (CONVENTIONS.md §3.9). The
	// clear button of Input empties the field through a native input event, so
	// a clear reaches `onClear` here like any edit.
	const handleChange = useMemo(
		() =>
			composeEventHandlers(
				onChange,
				(event: ChangeEvent<HTMLInputElement>) => {
					setValue(event.target.value)

					if (event.target.value === '') onClear?.()
				},
				{ checkForDefaultPrevented: false },
			),
		[onChange, onClear, setValue],
	)

	return (
		<Input
			ref={setRef}
			data-slot="search-input"
			type="search"
			name={name}
			value={current ?? ''}
			onChange={handleChange}
			onKeyDown={handleKeyDown}
			// The touched mark runs whatever the caller does (CONVENTIONS.md §3.9).
			onBlur={composeEventHandlers(onBlur, setTouched, { checkForDefaultPrevented: false })}
			prefix={SEARCH_PREFIX}
			// The spinner takes the place of the clear button while a query is in flight.
			clearable={clearable && !loading}
			clearLabel={clearLabel}
			suffix={
				loading ? (
					<>
						<LoadingSpinner />
						{extraSuffix}
					</>
				) : (
					extraSuffix
				)
			}
			className={cn('[&::-webkit-search-cancel-button]:appearance-none', className)}
			{...props}
		/>
	)
}
