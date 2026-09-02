'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useA11yAnnouncements } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import type { AccessibleName } from '../../types'
import { Flex } from '../flex'
import { FiltersContext, type FiltersContextValue, type FiltersLayout } from './context'

type FilterValue = Record<string, unknown>

/**
 * True when a field value counts as set: not `undefined`, `null`, `''`, or an
 * empty array.
 *
 * @remarks
 * An explicit `false` counts as set, so a Checkbox or Switch filter toggled off
 * stays in the payload and in the active count. Deliberate — an explicit "no" is
 * a filter — but it does read against the "drops empty fields" contract.
 *
 * @internal
 */
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
	/**
	 * How the bar answers a width that cannot hold its fields — see
	 * {@link FiltersLayout}.
	 *
	 * A `rail` keeps its fields at the width they were given, so give them one: a
	 * field left at its `w-full` default would fill the rail and the reader would
	 * scroll one field at a time.
	 *
	 * @defaultValue 'stack'
	 */
	layout?: FiltersLayout
	/**
	 * Classes for the scrolling row itself, which only a `rail` has.
	 *
	 * The bar's padding belongs here rather than on `className`. Set outside the
	 * scroll container, a padded band is dead to the wheel: the reader aims at the
	 * strip above or below the controls — most of the bar's own height — and
	 * nothing moves. Set here it scrolls with the fields.
	 *
	 * `className` still reaches the bar as a whole, which is where anything the
	 * clear action shares belongs.
	 */
	railClassName?: string
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
	layout = 'stack',
	children,
	className,
	railClassName,
	...labelProps
}: FiltersProps<T>) {
	const [state, setState] = useControllable<T>({
		value: valueProp,
		defaultValue,
		onValueChange: onValueChange && ((v) => v != null && onValueChange(v)),
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

	// Without a default, drop keys entirely, matching setValue's delete semantics.
	const handleClear = useCallback(() => {
		setState(defaultValue ?? ({} as T))

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
		() => ({ value: filterValue, setValue, clear: handleClear, activeCount, layout }),
		[filterValue, setValue, handleClear, activeCount, layout],
	)

	const rail = layout === 'rail'

	// One row at every width on a rail, a column on a narrow screen otherwise.
	const direction = rail ? 'row' : ({ initial: 'col', sm: 'row' } as const)

	// A rail's controls are all the same height, so they centre; a stack lines its
	// fields up on their baselines once it is a row.
	const align = rail ? 'center' : ({ initial: 'start', md: 'end' } as const)

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
				<Flex direction={direction} gap="sm" align={align} full>
					{/* The scroll rides the fields alone, so the clear action stays put while
					    they travel under it — it acts on the whole bar, and an action that
					    scrolls out of reach of what it acts on is one the reader has to go
					    looking for. `min-w-0` is what lets the row overflow at all: a flex
					    child sizes to its content otherwise, and this one would push the
					    clear off the bar instead of scrolling. */}
					<Flex
						direction={direction}
						gap="sm"
						align={align}
						equal={equal}
						full
						flex="auto"
						className={cn(rail && ['min-w-0 overflow-x-auto overscroll-x-contain', railClassName])}
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
