'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
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
		children: React.ReactNode
	}

function toArray(value: string | string[] | null | undefined): string[] {
	if (value == null) return []

	return Array.isArray(value) ? value : [value]
}

export function Accordion(props: AccordionProps) {
	const { variant, className, children } = props

	const type = props.type ?? 'single'

	const collapsible = type === 'single' ? ((props as SingleProps).collapsible ?? true) : true

	const isControlled =
		type === 'multiple'
			? (props as MultipleProps).value !== undefined
			: (props as SingleProps).value !== undefined

	const [internal, setInternal] = useState<string[]>(() =>
		type === 'multiple'
			? ((props as MultipleProps).defaultValue ?? [])
			: toArray((props as SingleProps).defaultValue ?? null),
	)

	const current = isControlled
		? type === 'multiple'
			? ((props as MultipleProps).value ?? [])
			: toArray((props as SingleProps).value)
		: internal

	const onValueChangeRef = useRef(props.onValueChange)

	onValueChangeRef.current = props.onValueChange

	const setCurrent = useCallback(
		(next: string[]) => {
			if (!isControlled) setInternal(next)

			const onValueChange = onValueChangeRef.current

			if (type === 'multiple') {
				;(onValueChange as MultipleProps['onValueChange'])?.(next)
			} else {
				;(onValueChange as SingleProps['onValueChange'])?.(next[0] ?? null)
			}
		},
		[isControlled, type],
	)

	const isOpen = useCallback((value: string) => current.includes(value), [current])

	const toggle = useCallback(
		(value: string) => {
			if (type === 'multiple') {
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
		[current, collapsible, setCurrent, type],
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
