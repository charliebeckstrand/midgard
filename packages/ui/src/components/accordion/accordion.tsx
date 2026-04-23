'use client'

import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { AccordionRootProvider } from './context'
import { type AccordionVariants, accordionVariants } from './variants'

// ── Accordion (root) ────────────────────────────────────

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

export function Accordion(props: AccordionProps) {
	const { variant, className, children } = props

	const type = props.type ?? 'single'

	const isMultiple = type === 'multiple'

	const collapsible = isMultiple ? true : ((props as SingleProps).collapsible ?? true)

	const controlledValue = isMultiple
		? (props as MultipleProps).value
		: (props as SingleProps).value !== undefined
			? toArray((props as SingleProps).value)
			: undefined

	const defaultValue = isMultiple
		? ((props as MultipleProps).defaultValue ?? [])
		: toArray((props as SingleProps).defaultValue ?? null)

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
		onChange: onControllableChange,
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

	const ctx = useMemo(
		() => ({ variant: variant ?? 'separated', isOpen, toggle }),
		[variant, isOpen, toggle],
	)

	return (
		<AccordionRootProvider value={ctx}>
			<div data-slot="accordion" className={cn(accordionVariants({ variant }), className)}>
				{children}
			</div>
		</AccordionRootProvider>
	)
}
