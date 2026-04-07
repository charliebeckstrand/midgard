'use client'

import { motion } from 'motion/react'
import { useCallback, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { CloseIcon } from '../../primitives'
import { katachi, ugoki } from '../../recipes'
import type { ToastData } from './toast'
import { toastCardVariants } from './variants'

type ToastCardProps = {
	toast: ToastData
	onDismiss: (id: string) => void
}

export function ToastCard({ toast: t, onDismiss }: ToastCardProps) {
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
	const remainingRef = useRef(t.duration ?? 5000)
	const startRef = useRef(Date.now())

	const startTimer = useCallback(() => {
		startRef.current = Date.now()
		timerRef.current = setTimeout(() => onDismiss(t.id), remainingRef.current)
	}, [t.id, onDismiss])

	const pauseTimer = useCallback(() => {
		clearTimeout(timerRef.current)
		remainingRef.current -= Date.now() - startRef.current
	}, [])

	useEffect(() => {
		startTimer()
		return () => clearTimeout(timerRef.current)
	}, [startTimer])

	return (
		<motion.div
			layout
			{...ugoki.toast}
			data-slot="toast"
			className={cn('relative', toastCardVariants({ type: t.type }))}
			onMouseEnter={pauseTimer}
			onMouseLeave={startTimer}
		>
			<div className={cn(katachi.toast.title)}>{t.title}</div>

			{t.description && <div className={cn(katachi.toast.description)}>{t.description}</div>}

			{t.action && (
				<div className={cn(katachi.toast.actions)}>
					<button
						type="button"
						onClick={t.action.onClick}
						className="text-sm font-medium underline"
					>
						{t.action.label}
					</button>
				</div>
			)}

			<button
				type="button"
				onClick={() => onDismiss(t.id)}
				className={cn(katachi.toast.close)}
				aria-label="Dismiss"
			>
				<CloseIcon />
			</button>
		</motion.div>
	)
}
