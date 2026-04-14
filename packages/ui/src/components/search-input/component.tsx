'use client'

import { Search, X } from 'lucide-react'
import { forwardRef, type Ref, useCallback } from 'react'
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
	const hasValue = value !== undefined ? value !== '' : undefined

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onChange?.(e)
			if (e.target.value === '') onClear?.()
		},
		[onChange, onClear],
	)

	const suffix = loading ? (
		<Spinner />
	) : hasValue !== false && onClear ? (
		<ClearButton onClear={onClear} />
	) : undefined

	return (
		<Input
			ref={ref}
			type="search"
			value={value}
			defaultValue={defaultValue}
			onChange={handleChange}
			prefix={<Icon icon={<Search />} />}
			suffix={suffix}
			{...props}
		/>
	)
})
