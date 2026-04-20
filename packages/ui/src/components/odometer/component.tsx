'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '../../core'

export type OdometerProps = {
	value: number
	duration?: number
	format?: (value: number) => string
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'span'>, 'className' | 'children'>

function defaultFormat(value: number) {
	return Math.round(value).toLocaleString()
}

export function Odometer({
	value,
	duration = 800,
	format = defaultFormat,
	className,
	...props
}: OdometerProps) {
	const [display, setDisplay] = useState(value)

	const fromRef = useRef(value)

	const rafRef = useRef<number | null>(null)

	useEffect(() => {
		const from = fromRef.current

		const to = value

		if (from === to) return

		if (duration <= 0) {
			fromRef.current = to

			setDisplay(to)

			return
		}

		const start = performance.now()

		const tick = () => {
			const t = Math.min(1, (performance.now() - start) / duration)

			const eased = 1 - (1 - t) ** 3

			setDisplay(from + (to - from) * eased)

			if (t < 1) {
				rafRef.current = requestAnimationFrame(tick)
			} else {
				fromRef.current = to
				rafRef.current = null
			}
		}

		rafRef.current = requestAnimationFrame(tick)

		return () => {
			if (rafRef.current != null) {
				cancelAnimationFrame(rafRef.current)

				rafRef.current = null
			}

			fromRef.current = to
		}
	}, [value, duration])

	return (
		<span
			data-slot="odometer"
			aria-live="polite"
			className={cn('tabular-nums', className)}
			{...props}
		>
			{format(display)}
		</span>
	)
}
