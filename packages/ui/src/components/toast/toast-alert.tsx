'use client'

import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { announce, cn } from '../../core'
import type { ToastData, ToastPosition, ToastSeverity } from '../../providers/toast/types'
import { k } from '../../recipes/kata/toast'
import { Alert, type AlertVariants } from '../alert'

function getToastMotion(position: ToastPosition) {
	return position.startsWith('top') ? k.motion.top : k.motion.bottom
}

// Derive the variant/color unions from the Alert recipe; a palette change
// there propagates here.
const severityAlertMap: Record<
	NonNullable<ToastSeverity>,
	{ variant: NonNullable<AlertVariants['variant']>; color: NonNullable<AlertVariants['color']> }
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

	// Screen readers do not reliably announce role="status" content mounted in
	// the same commit as the live region; mirror polite toasts through the
	// persistent announcer on mount (WCAG 4.1.3). role="alert" announces on
	// insertion.
	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (assertive) return

		const message = contentRef.current?.textContent?.trim()

		if (message) announce(message)
		// Mount-only: each toast id mounts exactly once.
	}, [assertive])

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
				ref={contentRef}
				role={assertive ? 'alert' : 'status'}
				onMouseEnter={onPause}
				onMouseLeave={(e) => {
					// Don't resume while focus is still inside the toast (keyboard user);
					// mirrors the onBlur guard. Auto-dismiss stays paused under focus
					// (WCAG 2.2.1).
					if (e.currentTarget.contains(document.activeElement)) return

					onResume()
				}}
				// Pauses the auto-dismiss timer while focus is anywhere inside the toast
				// (WCAG 2.2.1). `onFocus`/`onBlur` bubble (focusin/focusout); resumes
				// only once focus leaves the subtree.
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
