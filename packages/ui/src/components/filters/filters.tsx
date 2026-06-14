'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useA11yAnnouncements } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import type { AccessibleName } from '../../types'
import { Flex } from '../flex'
import { FiltersContext, type FiltersContextValue } from './context'

type FilterValue = Record<string, unknown>

/** True when a field value counts as set: not `undefined`, `null`, `''`, or an empty array. @internal */
function isActive(v: unknown): boolean {
	if (v === undefined || v === null || v === '') return false

	if (Array.isArray(v) && v.length === 0) return false

	return true
}

/** Props for {@link Filters}. Generic over the filter-value record `T`. */
export type FiltersProps<T extends FilterValue = FilterValue> = AccessibleName & {
	value?: T
	defaultValue?: T
	onValueChange?: (value: T) => void
	onClear?: () => void
	/** Clear control rendered at the bar's trailing edge, typically a {@link FiltersClear}. */
	clear?: ReactNode
	/** Content placed above the control row. */
	prefix?: ReactNode
	/** Content placed below the control row. */
	suffix?: ReactNode
	/** Stretch each field to equal width. */
	equal?: boolean
	children: ReactNode
	className?: string
}

/**
 * Coordinator for a row of filter controls over a `Record` value. Shares
 * set/clear and an active-count through context to enclosed {@link FiltersField}
 * and {@link FiltersClear}, dropping empty fields (undefined, null, `''`, empty
 * array) from the payload so the value stays minimal.
 *
 * @remarks
 * Controlled via `value`/`onValueChange`, uncontrolled from `defaultValue`.
 * Clearing restores `defaultValue` when set, else empties the record. The bar
 * is a named `role="group"` (a `<fieldset>` would impose unwanted field
 * semantics) — pass `aria-label` or `aria-labelledby`. The active count is
 * announced to assistive tech on change (WCAG 4.1.3).
 *
 * @typeParam T - Shape of the filter-value record.
 */
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
			// Drop keys entirely, matching setValue's delete semantics.
			setState({} as T)
		}
		onClear?.()
	}, [defaultValue, setState, onClear])

	const activeCount = useMemo(
		() => Object.values(filterValue).filter(isActive).length,
		[filterValue],
	)

	// Changing a filter re-renders results silently; narrate the active count
	// (WCAG 4.1.3). The hook skips the initial value.
	useA11yAnnouncements(`${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} active`)

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
					direction={{ initial: 'col', sm: 'row' }}
					gap="sm"
					align={{ initial: 'start', md: 'end' }}
					full
				>
					<Flex
						direction={{ initial: 'col', sm: 'row' }}
						gap="sm"
						align={{ initial: 'start', md: 'end' }}
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
