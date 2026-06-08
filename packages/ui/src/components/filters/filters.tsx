'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import type { AccessibleName } from '../../types'
import { Flex } from '../flex'
import { FiltersContext, type FiltersContextValue } from './context'

type FilterValue = Record<string, unknown>

function isActive(v: unknown): boolean {
	if (v === undefined || v === null || v === '') return false

	if (Array.isArray(v) && v.length === 0) return false

	return true
}

export type FiltersProps<T extends FilterValue = FilterValue> = AccessibleName & {
	value?: T
	defaultValue?: T
	onValueChange?: (value: T) => void
	onClear?: () => void
	clear?: ReactNode
	prefix?: ReactNode
	suffix?: ReactNode
	equal?: boolean
	children: ReactNode
	className?: string
}

/** Coordinator for a row of filter controls over a `Record` value — shares set/clear and an active-count via context, dropping empty fields from the payload. The bar is a named `role="group"`, so require `aria-label`/`aria-labelledby`. */
export function Filters<T extends FilterValue = FilterValue>({
	value: valueProp,
	defaultValue,
	onValueChange,
	onClear,
	clear,
	prefix,
	suffix,
	equal,
	children,
	className,
	...labelProps
}: FiltersProps<T>) {
	const [state, setState] = useControllable<T>({
		value: valueProp,
		defaultValue,
		onValueChange: onValueChange && ((v) => v !== undefined && onValueChange(v)),
	})

	const filterValue = (state ?? {}) as T

	const setValue = useCallback(
		(name: string, fieldValue: unknown) => {
			setState((prev) => {
				const next = { ...(prev ?? {}) } as Record<string, unknown>

				if (isActive(fieldValue)) {
					next[name] = fieldValue
				} else {
					delete next[name]
				}

				return next as T
			})
		},
		[setState],
	)

	const handleClear = useCallback(() => {
		if (defaultValue) {
			setState(defaultValue)
		} else {
			// Drop the keys entirely rather than mapping each to undefined, matching
			// setValue's delete semantics; otherwise the payload leaks inactive
			// `{key: undefined}` entries into whatever the consumer spreads.
			setState({} as T)
		}
		onClear?.()
	}, [defaultValue, setState, onClear])

	const activeCount = useMemo(
		() => Object.values(filterValue).filter(isActive).length,
		[filterValue],
	)

	const context: FiltersContextValue = useMemo(
		() => ({ value: filterValue, setValue, clear: handleClear, activeCount }),
		[filterValue, setValue, handleClear, activeCount],
	)

	return (
		<FiltersContext value={context}>
			{/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> imposes form-field semantics and min-content layout quirks on this flex bar; a named role="group" is the right grouping for a row of filter controls */}
			<div
				data-slot="filters"
				role="group"
				className={cn('flex flex-col gap-4', className)}
				{...labelProps}
			>
				{prefix && <div data-slot="filters-prefix">{prefix}</div>}
				<Flex
					direction={{ initial: 'row', sm: 'col' }}
					gap="sm"
					align={{ initial: 'end', md: 'start' }}
					full
				>
					<Flex
						direction={{ initial: 'row', sm: 'col' }}
						gap="sm"
						align={{ initial: 'end', md: 'start' }}
						equal={equal}
						full
						flex="auto"
					>
						{children}
					</Flex>
					{clear}
				</Flex>
				{suffix && <div data-slot="filters-suffix">{suffix}</div>}
			</div>
		</FiltersContext>
	)
}
