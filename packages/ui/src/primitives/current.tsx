'use client'

import { motion } from 'motion/react'
import { type ComponentPropsWithoutRef, useEffect, useMemo, useRef, useState } from 'react'
import { cn, createContext } from '../core'
import { useControllable } from '../hooks'
import { ugoki } from '../recipes'
import { ReducedMotion } from './reduced-motion'

export type CurrentContextValue = {
	value: string | undefined
	onChange: ((value: string) => void) | undefined
}

export const [CurrentProvider, useCurrent] = createContext<CurrentContextValue | undefined>(
	'Current',
	{ default: undefined },
)

export function useCurrentState(props: {
	value?: string
	defaultValue?: string
	onChange?: (value: string | undefined) => void
}): CurrentContextValue {
	const [value, setValue] = useControllable({
		value: props.value,
		defaultValue: props.defaultValue,
		onChange: props.onChange,
	})

	return useMemo<CurrentContextValue>(() => ({ value, onChange: setValue }), [value, setValue])
}

const hidden = { opacity: 0 }
const visible = { opacity: 1 }

const inFlow = { position: 'relative' as const }
const outOfFlow = { position: 'absolute' as const, top: 0, left: 0, right: 0 }

export function createCurrentContent(slotPrefix: string) {
	const [FadeProvider, useFade] = createContext<boolean>('Fade', { default: false })

	function Contents({
		fade = true,
		className,
		children,
		...props
	}: ComponentPropsWithoutRef<'div'> & { fade?: boolean }) {
		const ref = useRef<HTMLDivElement>(null)

		const [height, setHeight] = useState<number | undefined>(undefined)

		useEffect(() => {
			const el = ref.current

			if (!el || !fade) return

			const ro = new ResizeObserver(([entry]) => {
				if (entry) setHeight(entry.contentRect.height)
			})

			// Observe the in-flow child (active content)
			const observe = () => {
				ro.disconnect()

				for (const child of el.children) {
					if (child.hasAttribute('data-current')) {
						ro.observe(child)

						break
					}
				}
			}

			observe()

			const mo = new MutationObserver(observe)

			// Watch only the dedicated data-current attribute — not `style`,
			// which would fire on every framer-motion animation frame.
			mo.observe(el, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ['data-current'],
			})

			return () => {
				ro.disconnect()
				mo.disconnect()
			}
		}, [fade])

		if (!fade) {
			return (
				<div data-slot={`${slotPrefix}-contents`} className={className} {...props}>
					{children}
				</div>
			)
		}

		return (
			<FadeProvider value>
				<ReducedMotion>
					<motion.div
						ref={ref}
						data-slot={`${slotPrefix}-contents`}
						animate={height !== undefined ? { height } : undefined}
						initial={false}
						transition={ugoki.reveal.transition}
						className={cn('relative overflow-hidden', className)}
					>
						{children}
					</motion.div>
				</ReducedMotion>
			</FadeProvider>
		)
	}

	function Content({
		value,
		className,
		children,
		...props
	}: ComponentPropsWithoutRef<'div'> & { value?: string }) {
		const ctx = useCurrent()

		const fade = useFade()

		const current = value === undefined || ctx?.value === undefined || ctx.value === value

		if (fade) {
			return (
				<motion.div
					data-slot={`${slotPrefix}-content`}
					data-current={current ? '' : undefined}
					animate={current ? visible : hidden}
					initial={false}
					transition={ugoki.reveal.transition}
					style={current ? inFlow : outOfFlow}
					inert={!current}
					className={className}
				>
					{children}
				</motion.div>
			)
		}

		if (!current) return null

		return (
			<div data-slot={`${slotPrefix}-content`} className={className} {...props}>
				{children}
			</div>
		)
	}

	return { Contents, Content }
}
