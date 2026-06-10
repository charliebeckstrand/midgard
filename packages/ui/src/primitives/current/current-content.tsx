'use client'

import { type HTMLMotionProps, motion } from 'motion/react'
import type { ComponentPropsWithoutRef, Ref } from 'react'
import { k } from '../../recipes/kata/current'
import { useCurrent, useCurrentFade } from './current'

export type CurrentContentProps = ComponentPropsWithoutRef<'div'> & {
	/** Slot prefix stamped as `data-slot="<slotPrefix>-content"`. */
	slotPrefix: string
	/** Match against the surrounding `CurrentContext`. Omit to render unconditionally. */
	value?: string
	/** Ref to the rendered element (forwarded in both fade and non-fade modes). */
	ref?: Ref<HTMLDivElement>
}

/**
 * Per-panel wrapper that renders when its `value` matches the surrounding
 * `CurrentContext`. Inside a fading `CurrentContents`, animates opacity in
 * place; otherwise unmatched values are unmounted.
 */
export function CurrentContent({
	slotPrefix,
	value,
	className,
	children,
	ref,
	...props
}: CurrentContentProps) {
	const context = useCurrent()

	const fade = useCurrentFade()

	const current = value === undefined || context?.value === undefined || context.value === value

	if (!fade) {
		if (!current) return null

		return (
			<div ref={ref} data-slot={`${slotPrefix}-content`} className={className} {...props}>
				{children}
			</div>
		)
	}

	return (
		<motion.div
			ref={ref}
			// Forward caller props (id, role, aria-*) in fade mode; the cast
			// sidesteps motion's redefined animation/drag handler signatures.
			{...(props as HTMLMotionProps<'div'>)}
			data-slot={`${slotPrefix}-content`}
			data-current={current || undefined}
			animate={current ? { opacity: 1 } : { opacity: 0 }}
			initial={false}
			transition={k.transition}
			style={
				current ? { position: 'relative' } : { position: 'absolute', top: 0, left: 0, right: 0 }
			}
			inert={!current}
			className={className}
		>
			{children}
		</motion.div>
	)
}
