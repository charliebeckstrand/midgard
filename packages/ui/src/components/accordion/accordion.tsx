'use client'

import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useControllable, useRoving } from '../../hooks'
import { type AccordionVariants, k } from '../../recipes/kata/accordion'
import { AccordionContext } from './context'

type SingleProps = {
	type?: 'single'
	value?: string | null
	defaultValue?: string | null
	onValueChange?: (value: string | null) => void
	collapsible?: boolean
}

type MultipleProps = {
	type: 'multiple'
	value?: string[]
	defaultValue?: string[]
	onValueChange?: (value: string[]) => void
}

export type AccordionProps = (SingleProps | MultipleProps) &
	AccordionVariants & {
		className?: string
		children: ReactNode
	}

function toArray(value: string | string[] | null | undefined): string[] {
	if (value == null) return []

	return Array.isArray(value) ? value : [value]
}

/**
 * Vertically stacked set of collapsible sections — `type='single'` keeps at
 * most one open (optionally `collapsible` to none); `type='multiple'` allows
 * any number. Controlled via `value`/`onValueChange` or uncontrolled, with
 * roving-tabindex keyboard navigation across triggers.
 */
export function Accordion(props: AccordionProps) {
	const { variant, className, children } = props

	const isMultiple = props.type === 'multiple'

	const collapsible = isMultiple ? true : (props.collapsible ?? true)

	const controlledValue = isMultiple
		? props.value
		: props.value !== undefined
			? toArray(props.value)
			: undefined

	const defaultValue = isMultiple ? (props.defaultValue ?? []) : toArray(props.defaultValue ?? null)

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

	const handleKeyDown = useRoving(ref, {
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
