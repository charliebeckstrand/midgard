'use client'

import { Search, X } from 'lucide-react'
import { forwardRef, type Ref, useCallback } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input, type InputProps, useInputSize } from '../input'
import { Spinner } from '../spinner'

export type SearchInputProps = Omit<
	InputProps,
	'type' | 'prefix' | 'suffix' | 'value' | 'defaultValue'
> & {
	value?: string
	defaultValue?: string
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
			prefix={<Icon icon={<X />} />}
			onClick={onClear}
		/>
	)
}

export const SearchInput = forwardRef(function SearchInput(
	{ loading, onClear, value, defaultValue, onChange, ...props }: SearchInputProps,
	ref: Ref<HTMLInputElement>,
) {
	const [currentValue = '', setCurrentValue] = useControllable<string>({
		value,
		defaultValue: defaultValue ?? '',
	})

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setCurrentValue(e.target.value)

			onChange?.(e)

			if (e.target.value === '') onClear?.()
		},
		[onChange, onClear, setCurrentValue],
	)

	const handleClear = useCallback(() => {
		setCurrentValue('')

		onClear?.()
	}, [onClear, setCurrentValue])

	const suffix = loading ? (
		<Spinner />
	) : currentValue !== '' ? (
		<ClearButton onClear={handleClear} />
	) : undefined

	return (
		<Input
			ref={ref}
			value={currentValue}
			onChange={handleChange}
			prefix={<Icon icon={<Search />} />}
			suffix={suffix}
			{...props}
		/>
	)
})
