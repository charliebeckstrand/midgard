'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { CloseIcon } from '../../primitives'
import { katachi, ugoki } from '../../recipes'
import { Button } from '../button'
import type { ToastData, ToastPosition } from './toast-context'
import { toastCardVariants } from './variants'

function getToastMotion(position: ToastPosition) {
	if (position.startsWith('bottom')) return ugoki.toast.bottom
	if (position.startsWith('top')) return ugoki.toast.top
	if (position.endsWith('right')) return ugoki.toast.right

	return ugoki.toast.left
}

type ToastCardProps = {
	toast: ToastData
	position: ToastPosition
	showCloseButton?: boolean
	onDismiss: (id: string) => void
	onPause: () => void
	onResume: () => void
}

export function ToastCard({
	toast: t,
	position,
	showCloseButton = true,
	onDismiss,
	onPause,
	onResume,
}: ToastCardProps) {
	const motionConfig = getToastMotion(position)

	const overflow = ugoki.toast.overflow

	return (
		<motion.div
			layout
			initial={motionConfig.initial}
			animate={t.overflow ? overflow.exit : motionConfig.animate}
			exit={
				t.overflow
					? { opacity: 0, transition: { duration: 0 } }
					: t.dismissed
						? { opacity: 0 }
						: motionConfig.exit
			}
			transition={t.overflow ? overflow.transition : motionConfig.transition}
			data-slot="toast"
			className={cn('relative', toastCardVariants({ type: t.type }))}
			onAnimationComplete={() => {
				if (t.overflow) onDismiss(t.id)
			}}
			onMouseEnter={onPause}
			onMouseLeave={onResume}
		>
			<div className="flex-1 min-w-0">
				<div className={cn(katachi.toast.title)}>{t.title}</div>

				{t.description && <div className={cn(katachi.toast.description)}>{t.description}</div>}

				{t.actions && <div className={cn(katachi.toast.actions)}>{t.actions}</div>}
			</div>

			{showCloseButton && (
				<Button
					variant="plain"
					color="inherit"
					aria-label="Dismiss"
					className={cn(katachi.toast.close)}
					onClick={() => onDismiss(t.id)}
				>
					<CloseIcon />
				</Button>
			)}
		</motion.div>
	)
}
