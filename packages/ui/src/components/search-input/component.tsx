'use client'

import { Search, X } from 'lucide-react'
import { forwardRef, type Ref, useCallback, useRef, useState } from 'react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input, type InputProps, useInputSize } from '../input'
import { Spinner } from '../spinner'

export type SearchInputProps = Omit<InputProps, 'type' | 'prefix' | 'suffix'> & {
	loading?: boolean
	onClear?: () => void
}

function ClearButton({ onClear }: { onClear: () => void }) {
	const size = useInputSize()

	return (
		<Button
			variant="plain"
			size={size}
			className="pointer-events-auto"
			aria-label="Clear search"
			onClick={onClear}
		>
			<Icon icon={<X />} />
		</Button>
	)
}

export const SearchInput = forwardRef(function SearchInput(
	{ loading, onClear, value, defaultValue, onChange, ...props }: SearchInputProps,
	ref: Ref<HTMLInputElement>,
) {
	const inputRef = useRef<HTMLInputElement | null>(null)

	const [internalValue, setInternalValue] = useState(defaultValue ?? '')

	const currentValue = value !== undefined ? value : internalValue

	const composedRef = useCallback(
		(node: HTMLInputElement | null) => {
			inputRef.current = node

			if (typeof ref === 'function') ref(node)
			else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = node
		},
		[ref],
	)

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setInternalValue(e.target.value)

			onChange?.(e)

			if (e.target.value === '') onClear?.()
		},
		[onChange, onClear],
	)

	const handleClear = useCallback(() => {
		setInternalValue('')

		onClear?.()

		if (inputRef.current) {
			inputRef.current.value = ''

			inputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
		}
	}, [onClear])

	const suffix = loading ? (
		<Spinner />
	) : currentValue !== '' ? (
		<ClearButton onClear={handleClear} />
	) : undefined

	return (
		<Input
			ref={composedRef}
			value={value}
			defaultValue={defaultValue}
			onChange={handleChange}
			prefix={<Icon icon={<Search />} />}
			suffix={suffix}
			{...props}
		/>
	)
})
