'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import type { ToastData, ToastPosition, ToastSeverity } from '../../providers/toast/types'
import { k } from '../../recipes/kata/toast'
import { Alert } from '../alert'

function getToastMotion(position: ToastPosition) {
	return position.startsWith('top') ? k.motion.top : k.motion.bottom
}

const severityAlertMap: Record<
	NonNullable<ToastSeverity>,
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
	closable?: boolean
	onOpenChange: (open: boolean, id: string) => void
	onPause: () => void
	onResume: () => void
	onReset: (id: string) => void
}

export function ToastAlert({
	toast: t,
	position,
	zIndex,
	closable = true,
	onOpenChange,
	onPause,
	onResume,
	onReset,
}: ToastAlertProps) {
	const motionConfig = getToastMotion(position)

	const { variant, color } = severityAlertMap[t.severity ?? 'default']

	// Warning/error interrupt (assertive); everything else queues politely.
	const assertive = t.severity === 'warning' || t.severity === 'error'

	const positionTop = position.startsWith('top')

	const autoDismiss = {
		height: 0,
		...(positionTop ? { paddingBottom: 0 } : { paddingTop: 0 }),
		transition: { duration: 0.15 },
	}

	const manualDismiss = { opacity: 0, transition: { duration: 0.15 } }

	return (
		<motion.div
			layout
			style={{
				...(positionTop ? { paddingBottom: k.gap } : { paddingTop: k.gap }),
				zIndex,
			}}
			exit={t.dismissed ? manualDismiss : autoDismiss}
			transition={{ layout: { type: 'spring', stiffness: 500, damping: 25 } }}
		>
			<motion.div
				initial={{ ...motionConfig.initial, opacity: 0 }}
				animate={motionConfig.animate}
				transition={motionConfig.transition}
				role={assertive ? 'alert' : 'status'}
				onMouseEnter={onPause}
				onMouseLeave={onResume}
				// Keyboard parity with hover: pause the auto-dismiss timer while focus is
				// anywhere inside the toast so a keyboard/SR user reaching its action or
				// close button isn't timed out mid-interaction (WCAG 2.2.1). onFocus/onBlur
				// bubble (focusin/focusout); resume only once focus leaves the subtree.
				onFocus={onPause}
				onBlur={(e) => {
					if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onResume()
				}}
				onClick={() => onReset(t.id)}
			>
				<Alert
					open={true}
					variant={variant}
					color={color}
					title={t.title}
					description={t.description}
					actions={t.actions}
					closable={closable}
					onOpenChange={(open) => onOpenChange(open, t.id)}
					className={cn(k.card)}
				/>
			</motion.div>
		</motion.div>
	)
}
