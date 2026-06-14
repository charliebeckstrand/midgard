'use client'

import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving, useControllable } from '../../hooks'
import { type AccordionVariants, k } from '../../recipes/kata/accordion'
import { AccordionContext } from './context'

type SingleProps = {
	type?: 'single'
	value?: string | null
	defaultValue?: string | null
	onValueChange?: (value: string | null) => void
	/**
	 * Allow closing the open section to leave none open.
	 * @defaultValue true
	 */
	collapsible?: boolean
}

type MultipleProps = {
	type: 'multiple'
	value?: string[]
	defaultValue?: string[]
	onValueChange?: (value: string[]) => void
}

/**
 * Props for {@link Accordion}. The `type` discriminant selects single- vs
 * multiple-open semantics and the matching `value`/`defaultValue`/`onValueChange`
 * shapes.
 */
export type AccordionProps = (SingleProps | MultipleProps) &
	AccordionVariants & {
		className?: string
		children: ReactNode
	}

/**
 * Normalizes single-mode `value`/`defaultValue` to the array shape the shared
 * open-set state uses; `null`/`undefined` collapse to an empty array.
 * @internal
 */
function toArray(value: string | string[] | null | undefined): string[] {
	if (value == null) return []

	return Array.isArray(value) ? value : [value]
}

/**
 * Vertically stacked set of collapsible sections. `type='single'` keeps at
 * most one open (optionally `collapsible` to none); `type='multiple'` allows
 * any number. Controlled via `value`/`onValueChange` or uncontrolled. `variant`
 * defaults to `'separated'`.
 *
 * @remarks
 * Triggers share a roving tabindex: Arrow keys move focus between enabled header
 * buttons, skipping disabled ones. The container carries no ARIA role, per the
 * WAI-ARIA accordion pattern.
 *
 * @see {@link AccordionItem}
 * @see {@link AccordionTrigger}
 * @see {@link AccordionPanel}
 */
export function Accordion(props: AccordionProps) {
	const { variant, className, children } = props

	const isMultiple = props.type === 'multiple'

	const collapsible = isMultiple ? true : (props.collapsible ?? true)

	// The single-mode `toArray` wrap mints a new array each call; memoization
	// keeps the context identity stable across controlled renders.
	const controlledValue = useMemo(
		() =>
			props.type === 'multiple'
				? props.value
				: props.value !== undefined
					? toArray(props.value)
					: undefined,
		[props.type, props.value],
	)

	const defaultValue = isMultiple ? (props.defaultValue ?? []) : toArray(props.defaultValue)

	const onValueChangeRef = useRef(props.onValueChange)

	onValueChangeRef.current = props.onValueChange

	const onControllableChange = useCallback(
		(next: string[] | undefined) => {
			const resolved = next ?? []

			const onValueChange = onValueChangeRef.current

			if (isMultiple) {
				;(onValueChange as MultipleProps['onValueChange'])?.(resolved)
			} else {
				;(onValueChange as SingleProps['onValueChange'])?.(resolved[0] ?? null)
			}
		},
		[isMultiple],
	)

	const [current = [], setCurrent] = useControllable<string[]>({
		value: controlledValue,
		defaultValue,
		onValueChange: onControllableChange,
	})

	const isOpen = useCallback((value: string) => current.includes(value), [current])

	const toggle = useCallback(
		(value: string) => {
			if (isMultiple) {
				const next = current.includes(value)
					? current.filter((v) => v !== value)
					: [...current, value]

				setCurrent(next)

				return
			}

			if (current.includes(value)) {
				if (collapsible) setCurrent([])
			} else {
				setCurrent([value])
			}
		},
		[current, collapsible, setCurrent, isMultiple],
	)

	const context = useMemo(
		() => ({ variant: variant ?? 'separated', isOpen, toggle }),
		[variant, isOpen, toggle],
	)

	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="accordion-trigger"]:not(:disabled)',
	})

	return (
		<AccordionContext value={context}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: the WAI-ARIA accordion pattern defines no role for the container; the roving tabindex handler must live here to navigate between header buttons */}
			<div
				ref={ref}
				data-slot="accordion"
				className={cn(k({ variant }), className)}
				onKeyDown={handleKeyDown}
			>
				{children}
			</div>
		</AccordionContext>
	)
}
