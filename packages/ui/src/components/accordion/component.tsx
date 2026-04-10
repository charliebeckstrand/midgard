'use client'

import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useState } from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { Icon } from '../icon'
import {
	AccordionItemProvider,
	AccordionRootProvider,
	useAccordionItem,
	useAccordionRoot,
} from './context'
import { type AccordionVariants, accordionItemVariants, accordionVariants } from './variants'

const k = katachi.accordion

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

	const setCurrent = useCallback(
		(next: string[]) => {
			if (!isControlled) setInternal(next)

			if (type === 'multiple') {
				;(props as MultipleProps).onValueChange?.(next)
			} else {
				;(props as SingleProps).onValueChange?.(next[0] ?? null)
			}
		},
		[isControlled, type, props],
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

			const collapsible = (props as SingleProps).collapsible ?? true

			if (current.includes(value)) {
				if (collapsible) setCurrent([])
			} else {
				setCurrent([value])
			}
		},
		[current, props, setCurrent, type],
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

// ── AccordionItem ───────────────────────────────────────

export type AccordionItemProps = {
	value: string
	disabled?: boolean
	className?: string
	children: React.ReactNode
}

export function AccordionItem({
	value,
	disabled = false,
	className,
	children,
}: AccordionItemProps) {
	const root = useAccordionRoot()

	const open = root.isOpen(value)

	const toggle = useCallback(() => {
		if (!disabled) root.toggle(value)
	}, [disabled, root, value])

	const ctx = useMemo(() => ({ value, open, toggle, disabled }), [value, open, toggle, disabled])

	return (
		<AccordionItemProvider value={ctx}>
			<div
				data-slot="accordion-item"
				data-open={open || undefined}
				className={cn(accordionItemVariants({ variant: root.variant }), className)}
			>
				{children}
			</div>
		</AccordionItemProvider>
	)
}

// ── AccordionButton ─────────────────────────────────────

export type AccordionButtonProps = Omit<React.ComponentPropsWithoutRef<'button'>, 'children'> & {
	children: React.ReactNode | ((bag: { open: boolean }) => React.ReactNode)
}

export function AccordionButton({ className, children, ...props }: AccordionButtonProps) {
	const { open, toggle, disabled, value } = useAccordionItem()

	return (
		<button
			type="button"
			data-slot="accordion-button"
			aria-expanded={open}
			aria-controls={`accordion-panel-${value}`}
			id={`accordion-button-${value}`}
			disabled={disabled}
			onClick={toggle}
			className={cn(k.button, className)}
			{...props}
		>
			<span className="flex-1">
				{typeof children === 'function' ? children({ open }) : children}
			</span>
			<Icon icon={<ChevronDown />} className={cn(k.indicator)} />
		</button>
	)
}

// ── AccordionPanel ──────────────────────────────────────

export type AccordionPanelProps = {
	className?: string
	children: React.ReactNode
}

export function AccordionPanel({ className, children }: AccordionPanelProps) {
	const { open, value } = useAccordionItem()

	return (
		<AnimatePresence initial={false}>
			{open && (
				<motion.div
					data-slot="accordion-panel"
					id={`accordion-panel-${value}`}
					role="region"
					aria-labelledby={`accordion-button-${value}`}
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: 'auto', opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={{ duration: 0.2, ease: 'easeInOut' }}
					className={cn(k.panel)}
				>
					<div className={cn(k.body, className)}>{children}</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
