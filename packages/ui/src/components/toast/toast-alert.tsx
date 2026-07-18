'use client'

import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { announce, cn } from '../../core'
import type { ToastData, ToastPosition, ToastSeverity } from '../../providers/toast/types'
import { k } from '../../recipes/kata/toast'
import { Alert, type AlertVariants } from '../alert'

/** Fade-out for a user dismissal; the height collapse is left to the neighbours' layout spring. @internal */
const manualDismiss = { opacity: 0, transition: k.motion.dismiss }

/** Collapse for an auto-dismissal from a top viewport edge: height and the gap padding below close together. @internal */
const autoDismissTop = { height: 0, paddingBottom: 0, transition: k.motion.dismiss }

/** Collapse for an auto-dismissal from a bottom viewport edge. @internal */
const autoDismissBottom = { height: 0, paddingTop: 0, transition: k.motion.dismiss }

/** The stack re-pack: neighbours FLIP into the dismissed toast's slot on the kata's layout spring. @internal */
const layoutTransition = { layout: k.spring }

/**
 * Maps each toast severity to an {@link Alert} variant/color pair. Typed from
 * the Alert recipe unions so a palette change there propagates here.
 * @internal
 */
const severityAlertMap = {
	default: { variant: 'solid', color: 'blue' },
	secondary: { variant: 'solid', color: 'zinc' },
	success: { variant: 'solid', color: 'green' },
	warning: { variant: 'solid', color: 'amber' },
	error: { variant: 'solid', color: 'red' },
} satisfies Record<
	NonNullable<ToastSeverity>,
	{ variant: NonNullable<AlertVariants['variant']>; color: NonNullable<AlertVariants['color']> }
>

/** Props for {@link ToastAlert}, wired by {@link Toast} from the queue. @internal */
type ToastAlertProps = {
	toast: ToastData
	position: ToastPosition
	zIndex: number
	/** @defaultValue true */
	closable?: boolean
	onOpenChange: (open: boolean, id: string) => void
	onPause: () => void
	onResume: () => void
	onReset: (id: string) => void
}

/**
 * Single animated toast: maps severity to an {@link Alert} variant and a live
 * `role`, slides in from the viewport edge, and drives the pause/resume/reset
 * lifecycle on pointer and focus.
 *
 * @remarks `warning`/`error` use `role="alert"` (assertive, announces on
 * insertion); other severities use `role="status"` and are mirrored through the
 * persistent announcer on mount, since screen readers can miss a live region
 * inserted with its text (WCAG 4.1.3). Auto-dismiss pauses while the pointer or
 * focus is inside the toast (WCAG 2.2.1); hover and focus hold the shared timer
 * independently (source-counted), and unmount releases this toast's holds — a
 * node removed under a stationary pointer or held focus gets no
 * `mouseleave`/`blur`, and an unreleased hold would freeze auto-dismiss for
 * every later toast. Not exported; rendered by {@link Toast}.
 * @internal
 */
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
	const positionTop = position.startsWith('top')

	const motionConfig = positionTop ? k.motion.top : k.motion.bottom

	const { variant, color } = severityAlertMap[t.severity ?? 'default']

	// Warning/error interrupt (assertive); everything else queues politely.
	const assertive = t.severity === 'warning' || t.severity === 'error'

	const autoDismiss = positionTop ? autoDismissTop : autoDismissBottom

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

	// Hover and focus each hold the timer's source-counted pause at most once;
	// the flags keep every hold/release paired so the count balances.
	const hoverHeldRef = useRef(false)

	const focusHeldRef = useRef(false)

	// Latest-ref: the unmount release must call the current resume without the
	// effect keying on it — a dep change would release still-live holds mid-life.
	const onResumeRef = useRef(onResume)

	onResumeRef.current = onResume

	// A toast removed while hovered or focused (close click, maxToasts eviction,
	// programmatic dismiss) gets no mouseleave/blur, so release its holds here —
	// otherwise the stuck count freezes auto-dismiss for every later toast.
	useEffect(
		() => () => {
			if (hoverHeldRef.current) onResumeRef.current()

			if (focusHeldRef.current) onResumeRef.current()
		},
		[],
	)

	function holdHover() {
		if (hoverHeldRef.current) return

		hoverHeldRef.current = true

		onPause()
	}

	function releaseHover() {
		if (!hoverHeldRef.current) return

		hoverHeldRef.current = false

		onResume()
	}

	function holdFocus() {
		if (focusHeldRef.current) return

		focusHeldRef.current = true

		onPause()
	}

	function releaseFocus() {
		if (!focusHeldRef.current) return

		focusHeldRef.current = false

		onResume()
	}

	return (
		<motion.div
			layout
			style={{
				...(positionTop ? { paddingBottom: k.gap } : { paddingTop: k.gap }),
				zIndex,
			}}
			exit={t.dismissed ? manualDismiss : autoDismiss}
			transition={layoutTransition}
		>
			<motion.div
				initial={{ ...motionConfig.initial, opacity: 0 }}
				animate={motionConfig.animate}
				transition={motionConfig.transition}
				ref={contentRef}
				role={assertive ? 'alert' : 'status'}
				// Pointer and focus pause auto-dismiss independently (WCAG 2.2.1):
				// with both holds counted, releasing one under the other — Tab out
				// while hovered, mouse out while focused — keeps the timer paused.
				onMouseEnter={holdHover}
				onMouseLeave={releaseHover}
				// `onFocus`/`onBlur` bubble (focusin/focusout); a move within the
				// subtree re-fires them, so the held flag and the relatedTarget
				// check make those no-ops. Release only when focus leaves the toast.
				onFocus={holdFocus}
				onBlur={(event) => {
					if (event.currentTarget.contains(event.relatedTarget as Node | null)) return

					releaseFocus()
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
