import type { ClassValue } from 'clsx'
import { type ComponentPropsWithoutRef, createElement, type JSX } from 'react'
import { cn } from './cn'

type Tag = keyof JSX.IntrinsicElements

export type SlotProps<T extends Tag> = {
	className?: string
} & Omit<ComponentPropsWithoutRef<T>, 'className'>

/**
 * Creates a thin slot component that renders an intrinsic element with a
 * `data-slot` attribute, composes one or more recipe / utility classes with the
 * caller's `className`, and forwards all other props.
 *
 * Use only for slots whose entire body is element + class composition + prop
 * spread. If a slot needs hooks, conditional rendering, or wrapping context,
 * write it inline; the helper has no escape hatch.
 *
 * @example
 *   export const CardBody = createSlot('div', 'card-body', 'p-(--ui-padding)')
 *
 *   export const MenuSeparator = createSlot('hr', 'menu-separator', k.separator)
 */
export function createSlot<T extends Tag>(tag: T, slotName: string, ...classes: ClassValue[]) {
	function Slot({ className, ...props }: SlotProps<T>) {
		return createElement(tag, {
			'data-slot': slotName,
			className: cn(...classes, className),
			...props,
		})
	}

	Slot.displayName = slotName

	return Slot
}
