'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { katachi, ugoki } from '../../recipes'
import { Button } from '../button'
import { Icon } from '../icon'
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
	closeIcon?: React.ReactNode
	onDismiss: (id: string) => void
	onPause: () => void
	onResume: () => void
}

export function ToastCard({
	toast: t,
	position,
	showCloseButton = true,
	closeIcon,
	onDismiss,
	onPause,
	onResume,
}: ToastCardProps) {
	const motionConfig = getToastMotion(position)

	const overflow = ugoki.toast.overflow

	const isOverflow = t.overflow

	return (
		<motion.div
			layout
			style={{ paddingBottom: 8, zIndex: t.zIndex }}
			exit={{
				height: 0,
				paddingBottom: 0,
				transition: { duration: isOverflow ? 0 : 0.15 },
			}}
			transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}
		>
			<motion.div
				initial={motionConfig.initial}
				animate={isOverflow ? overflow.exit : motionConfig.animate}
				transition={isOverflow ? overflow.transition : motionConfig.transition}
				data-slot="toast"
				className={cn('relative', toastCardVariants({ type: t.type }))}
				onAnimationComplete={() => {
					if (isOverflow) onDismiss(t.id)
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
						{closeIcon ?? <Icon name="x" />}
					</Button>
				)}
			</motion.div>
		</motion.div>
	)
}
