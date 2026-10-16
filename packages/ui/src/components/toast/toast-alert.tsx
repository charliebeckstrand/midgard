'use client'

import { type RefObject, useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react'
import { cn } from '../../core'
import { useAnnounceOnAppear } from '../../hooks/a11y/use-announce-on-appear'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../recipes/kata/toast'
import { Alert, type AlertVariants } from '../alert'
import type { ToastData, ToastSeverity } from './types'

/** Fade-out for a user dismissal; the height collapse is left to the neighbors' layout spring. @internal */
const manualDismiss = { opacity: 0, transition: k.motion.dismiss }

/**
 * Collapse for an auto-dismissal from a top viewport edge: height and the gap
 * padding below close together. The item clips the card while it closes, so the
 * card does not show over the toast below it.
 * @internal
 */
const autoDismissTop = {
	height: 0,
	paddingBottom: 0,
	overflow: 'hidden',
	transition: k.motion.dismiss,
}

/** Collapse for an auto-dismissal from a bottom viewport edge. @internal */
const autoDismissBottom = {
	height: 0,
	paddingTop: 0,
	overflow: 'hidden',
	transition: k.motion.dismiss,
}

/** The stack re-pack: neighbors FLIP into the dismissed toast's slot on the kata's layout spring. @internal */
const layoutTransition = { layout: k.spring }

/**
 * Maps each toast severity to an {@link Alert} variant/color pair. Typed from
 * the Alert recipe unions so a palette change there propagates here.
 * @internal
 */
const alertBySeverity = {
	info: { variant: 'solid', color: 'blue' },
	neutral: { variant: 'solid', color: 'zinc' },
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
	/** The viewport edge that the stack is on, at the `position` in force at the viewport. */
	edge: 'top' | 'bottom'
	zIndex: number
	/** @defaultValue true */
	closable?: boolean
	onOpenChange: (open: boolean, id: string) => void
	onPause: () => void
	onResume: () => void
	onReset: (id: string) => void
	/** Called when this toast is marked to leave while focus is inside it. */
	onLeave: () => void
}

/**
 * Single animated toast: maps severity to an {@link Alert} variant and a live
 * `role`, and slides in from the viewport edge. It drives the pause/resume/reset
 * lifecycle on pointer and focus.
 *
 * @remarks `warning`/`error` use `role="alert"` (assertive, announces on
 * insertion). Other severities use `role="status"` and are mirrored through the
 * persistent announcer on mount. A screen reader can miss a live region
 * inserted with its text (WCAG 4.1.3). Auto-dismiss pauses while a hovering
 * pointer (mouse or pen) or focus is inside the toast (WCAG 2.2.1). A touch does
 * not hold it. Hover and focus hold the shared timer
 * independently (source-counted), and unmount releases this toast's holds. A
 * node removed under a stationary pointer or held focus gets no
 * `pointerleave`/`blur`, and an unreleased hold would freeze auto-dismiss for
 * every later toast. The outer element is an `li` of the toast list, and the
 * live `role` stays on the inner element, because an `li` takes no live role.
 * Not exported; rendered by {@link Toast}.
 * @internal
 */
export function ToastAlert({
	toast,
	edge,
	zIndex,
	closable = true,
	onOpenChange,
	onPause,
	onResume,
	onReset,
	onLeave,
}: ToastAlertProps) {
	const positionTop = edge === 'top'

	// The slide moves `transform`, which `MotionConfig` does not hold still, so the
	// toast reads the setting itself (WCAG 2.3.3).
	const presets = usePrefersReducedMotion() ? k.still : k.motion

	const motionConfig = positionTop ? presets.top : presets.bottom

	const { variant, color } = alertBySeverity[toast.severity ?? 'info']

	// Warning/error interrupt (assertive); everything else queues politely.
	const assertive = toast.severity === 'warning' || toast.severity === 'error'

	const autoDismiss = positionTop ? autoDismissTop : autoDismissBottom

	// Screen readers do not reliably announce role="status" content mounted in
	// the same commit as the live region; mirror polite toasts through the
	// persistent announcer on mount (WCAG 4.1.3). role="alert" announces on
	// insertion.
	const contentRef = useRef<HTMLDivElement>(null)

	useAnnounceOnAppear(contentRef, true, { onMount: true, enabled: !assertive })

	// Hover and focus each hold the timer's source-counted pause at most once;
	// the flags keep every hold/release paired so the count balances.
	const hoverHeldRef = useRef(false)

	const focusHeldRef = useRef(false)

	// One hold/release pair per source; `held` is that source's flag.
	function hold(held: RefObject<boolean>) {
		if (held.current) return

		held.current = true

		onPause()
	}

	function release(held: RefObject<boolean>) {
		if (!held.current) return

		held.current = false

		onResume()
	}

	// An effect event: the unmount release must call the current resume without
	// the effect keying on it — a dep change would release still-live holds mid-life.
	const resume = useEffectEvent(() => onResume())

	const holdFocus = useEffectEvent(() => hold(focusHeldRef))

	// A toast removed while hovered or focused (close click, maxToasts eviction,
	// programmatic dismiss) gets no pointerleave/blur, so release its holds here —
	// otherwise the stuck count freezes auto-dismiss for every later toast.
	useEffect(() => {
		// Focus can be in the toast before this effect runs: a close moves focus to
		// a toast that mounts in the same commit. A re-run after the cleanup below
		// (a re-show under <Activity>, or Strict Mode) gets no new `focus` event, so
		// the effect takes the hold again.
		if (contentRef.current?.contains(document.activeElement)) holdFocus()

		return () => {
			if (hoverHeldRef.current) resume()

			if (focusHeldRef.current) resume()

			// Reset so a re-show under <Activity> (effect cleanup runs while the
			// refs persist) starts unheld — a stale flag would swallow the next
			// hold and let auto-dismiss run under the pointer.
			hoverHeldRef.current = false

			focusHeldRef.current = false
		}
	}, [])

	const itemRef = useRef<HTMLLIElement>(null)

	const leave = useEffectEvent(() => onLeave())

	// Every route that closes a toast marks it `dismissed` first: the close button,
	// an action that calls `dismiss(id)`, and an eviction. The item goes `inert`
	// only on its removal, a frame later, so a layout effect on the mark moves
	// focus out before focus falls to the body (WCAG 2.4.3).
	useLayoutEffect(() => {
		if (toast.dismissed && itemRef.current?.contains(document.activeElement)) leave()
	}, [toast.dismissed])

	return (
		<m.li
			ref={itemRef}
			layout
			className={cn(k.item[edge])}
			style={{ zIndex }}
			exit={toast.dismissed ? manualDismiss : autoDismiss}
			transition={layoutTransition}
		>
			<m.div
				initial={{ ...motionConfig.initial, opacity: 0 }}
				animate={motionConfig.animate}
				transition={motionConfig.transition}
				ref={contentRef}
				role={assertive ? 'alert' : 'status'}
				// Pointer and focus pause auto-dismiss independently (WCAG 2.2.1):
				// with both holds counted, releasing one under the other — Tab out
				// while hovered, mouse out while focused — keeps the timer paused.
				// Only a hovering pointer holds. A tap gets no leave until a later tap
				// lands elsewhere, and its hold would stop every countdown.
				onPointerEnter={(event) => {
					if (event.pointerType !== 'touch') hold(hoverHeldRef)
				}}
				onPointerLeave={() => release(hoverHeldRef)}
				// `onFocus`/`onBlur` bubble (focusin/focusout); a move within the
				// subtree re-fires them, so the held flag and the relatedTarget
				// check make those no-ops. Release only when focus leaves the toast.
				onFocus={() => hold(focusHeldRef)}
				onBlur={(event) => {
					if (event.currentTarget.contains(event.relatedTarget as Node | null)) return

					release(focusHeldRef)
				}}
				onClick={() => onReset(toast.id)}
			>
				<Alert
					open={true}
					variant={variant}
					color={color}
					title={toast.title}
					description={toast.description}
					actions={toast.actions}
					closable={closable}
					onOpenChange={(open) => onOpenChange(open, toast.id)}
					className={cn(k.card)}
				/>
			</m.div>
		</m.li>
	)
}
