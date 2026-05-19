'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import type { ToastData, ToastPosition, ToastType } from '../../providers/toast/types'
import { ugoki } from '../../recipes'
import { k } from '../../recipes/kata/toast'
import { Alert } from '../alert'

function getToastMotion(position: ToastPosition) {
	if (position.startsWith('bottom')) return ugoki.toast.bottom
	if (position.startsWith('top')) return ugoki.toast.top
	if (position.endsWith('right')) return ugoki.toast.right

	return ugoki.toast.left
}

const typeAlertMap: Record<
	NonNullable<ToastType>,
	{ variant: 'solid' | 'soft'; color: 'blue' | 'zinc' | 'green' | 'amber' | 'red' }
> = {
	default: { variant: 'solid', color: 'blue' },
	secondary: { variant: 'solid', color: 'zinc' },
	success: { variant: 'solid', color: 'green' },
	warning: { variant: 'solid', color: 'amber' },
	error: { variant: 'solid', color: 'red' },
}

type ToastAlertProps = {
	toast: ToastData
	position: ToastPosition
	zIndex: number
	showCloseButton?: boolean
	onOpenChange: (open: boolean, id: string) => void
	onPause: () => void
	onResume: () => void
	onReset: (id: string) => void
}

export function ToastAlert({
	toast: t,
	position,
	zIndex,
	showCloseButton = true,
	onOpenChange,
	onPause,
	onResume,
	onReset,
}: ToastAlertProps) {
	const motionConfig = getToastMotion(position)

	const { variant, color } = typeAlertMap[t.type ?? 'default']

	return (
		<motion.div
			layout
			style={{
				...(position.startsWith('top') ? { paddingBottom: 8 } : { paddingTop: 8 }),
				zIndex,
			}}
			exit={{
				height: 0,
				...(position.startsWith('top') ? { paddingBottom: 0 } : { paddingTop: 0 }),
				transition: { duration: 0.15 },
			}}
			transition={{ layout: { type: 'spring', stiffness: 500, damping: 25 } }}
		>
			<motion.div
				initial={{ ...motionConfig.initial, opacity: 0 }}
				animate={t.dismissed ? { opacity: 0 } : motionConfig.animate}
				transition={t.dismissed ? { duration: 0.15 } : motionConfig.transition}
				onMouseEnter={onPause}
				onMouseLeave={onResume}
				onClick={() => onReset(t.id)}
			>
				<Alert
					variant={variant}
					color={color}
					title={t.title}
					description={t.description}
					actions={t.actions}
					closable={showCloseButton}
					onOpenChange={(open) => onOpenChange(open, t.id)}
					className={cn(k.card)}
				/>
			</motion.div>
		</motion.div>
	)
}
