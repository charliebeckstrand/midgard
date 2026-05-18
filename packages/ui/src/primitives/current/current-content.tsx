'use client'

import { motion } from 'motion/react'
import type { ComponentPropsWithoutRef } from 'react'
import { ugoki } from '../../recipes'
import { useCurrent, useCurrentFade } from './current'

export type CurrentContentProps = ComponentPropsWithoutRef<'div'> & {
	/** Slot prefix used to stamp `data-slot="<slotPrefix>-content"`. */
	slotPrefix: string
	/** Match against the surrounding `CurrentProvider`. Omit to render unconditionally. */
	value?: string
}

/**
 * Per-panel wrapper that renders when its `value` matches the surrounding
 * `CurrentProvider`. Inside a fading `CurrentContents`, animates opacity in
 * place; otherwise unmatched values are unmounted.
 */
export function CurrentContent({
	slotPrefix,
	value,
	className,
	children,
	...props
}: CurrentContentProps) {
	const context = useCurrent()

	const fade = useCurrentFade()

	const current = value === undefined || context?.value === undefined || context.value === value

	if (!fade) {
		if (!current) return null

		return (
			<div data-slot={`${slotPrefix}-content`} className={className} {...props}>
				{children}
			</div>
		)
	}

	return (
		<motion.div
			data-slot={`${slotPrefix}-content`}
			data-current={current ? '' : undefined}
			animate={current ? { opacity: 1 } : { opacity: 0 }}
			initial={false}
			transition={ugoki.reveal.transition}
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
