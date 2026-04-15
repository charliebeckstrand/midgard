'use client'

import { motion } from 'motion/react'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../core'
import { useControllable } from '../hooks'
import { ugoki } from '../recipes'

// ── Context ──────────────────────────────────────────────

export type CurrentContextValue = {
	value: string | undefined
	onChange: ((value: string) => void) | undefined
}

const CurrentContext = createContext<CurrentContextValue | undefined>(undefined)

export const CurrentProvider = CurrentContext.Provider

export function useCurrentContext() {
	return useContext(CurrentContext)
}

// ── useCurrent ───────────────────────────────────────────

export function useCurrent(props: {
	value?: string
	defaultValue?: string
	onChange?: (value: string | undefined) => void
}): [CurrentContextValue, string | undefined, (value: string) => void] {
	const [value, setValue] = useControllable({
		value: props.value,
		defaultValue: props.defaultValue,
		onChange: props.onChange,
	})

	const ctx = useMemo<CurrentContextValue>(() => ({ value, onChange: setValue }), [value, setValue])

	return [ctx, value, setValue]
}

// ── createCurrentContent ─────────────────────────────────

const hidden = { opacity: 0 }
const visible = { opacity: 1 }

const inFlow = { position: 'relative' as const }
const outOfFlow = { position: 'absolute' as const, top: 0, left: 0, right: 0 }

export function createCurrentContent(slotPrefix: string) {
	const FadeContext = createContext(false)

	function Contents({
		fade = true,
		className,
		children,
		...props
	}: React.ComponentPropsWithoutRef<'div'> & { fade?: boolean }) {
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
					if ((child as HTMLElement).style.position !== 'absolute') {
						ro.observe(child)

						break
					}
				}
			}

			observe()

			const mo = new MutationObserver(observe)

			mo.observe(el, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ['style'],
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
			<FadeContext.Provider value>
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
			</FadeContext.Provider>
		)
	}

	function Content({
		value,
		className,
		children,
		...props
	}: React.ComponentPropsWithoutRef<'div'> & { value?: string }) {
		const ctx = useCurrentContext()

		const fade = useContext(FadeContext)

		const current = value === undefined || ctx?.value === undefined || ctx.value === value

		if (fade) {
			return (
				<motion.div
					data-slot={`${slotPrefix}-content`}
					animate={current ? visible : hidden}
					initial={false}
					transition={ugoki.reveal.transition}
					style={{ ...(current ? inFlow : outOfFlow), pointerEvents: current ? undefined : 'none' }}
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
