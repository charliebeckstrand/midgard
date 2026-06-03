'use client'

import { Search, X } from 'lucide-react'
import { type ChangeEvent, useCallback } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
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

const SEARCH_PREFIX = <Icon icon={<Search />} />

export function SearchInput({
	value,
	defaultValue,
	loading,
	onChange,
	onClear,
	ref,
	className,
	...props
}: SearchInputProps) {
	const [currentValue = '', setCurrentValue] = useControllable<string>({
		value,
		defaultValue: defaultValue ?? '',
	})

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
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
			ref={ref}
			type="search"
			value={currentValue}
			onChange={handleChange}
			prefix={SEARCH_PREFIX}
			suffix={suffix}
			className={cn('[&::-webkit-search-cancel-button]:appearance-none', className)}
			{...props}
		/>
	)
}
