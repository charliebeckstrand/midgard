'use client'

import { useEffect, useState } from 'react'
import { createScheduler } from './use-timeout'

/** The frame that {@link useAnimationFrame} gives. Each function keeps its identity. */
export type AnimationFrame = {
	/**
	 * Requests the frame. It cancels a pending frame first, so the last call wins.
	 * A call after the effect cleanup of the component waits, and the frame is
	 * requested only when the effect runs again.
	 */
	set: (callback: () => void) => void
	/** Cancels a pending frame. It does nothing when no frame is pending. */
	clear: () => void
	/** Whether a frame is requested and has not run or been canceled. */
	pending: () => boolean
}

/**
 * One restartable animation frame that cancels on unmount.
 *
 * @returns An {@link AnimationFrame} that keeps its identity.
 * @remarks Use it to do work one time for each frame, or to do work after the
 * next paint. The frame belongs to the component, so no callback runs after the
 * component unmounts. A callback can call `set` again to poll frame by frame.
 * React runs the cleanup of a parent before the cleanups of its children. Thus
 * a child cleanup can call `set` after the frame canceled. That frame waits for
 * the effect to run again, as in `useTimeout`, so it is never requested after
 * an unmount.
 * @internal
 */
export function useAnimationFrame(): AnimationFrame {
	const [{ scheduler, mount }] = useState(createFrame)

	useEffect(mount, [mount])

	return scheduler
}

const createFrame = () =>
	createScheduler(
		(run) => requestAnimationFrame(run),
		(id) => cancelAnimationFrame(id),
	)
