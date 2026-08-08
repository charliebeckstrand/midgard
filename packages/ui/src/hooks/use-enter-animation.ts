'use client'

import { useRef } from 'react'

/**
 * Resolves an `animateOnMount` flag for a surface whose animated element mounts and
 * unmounts with its open state (`PresencePortal`), returning whether *this* mount
 * plays the enter animation.
 *
 * `animateOnMount={false}` describes the arrival — the surface was already open before
 * the user did anything, so playing the enter replays an opening they never performed.
 * It does not describe the opens that follow. The distinction has to be drawn here
 * because the element unmounts while closed, so the raw flag is re-read on every reopen
 * within the same mount: a bottom drawer that arrived open from `?view=`, minimized,
 * then maximized would stand back up in place instead of sliding.
 *
 * @param open Current open state, as handed to the presence gate.
 * @param animateOnMount The caller's flag.
 * @returns Whether to play the enter animation on this mount.
 * @internal
 */
export function useEnterAnimation(open: boolean, animateOnMount: boolean): boolean {
	// Whether what is on screen is still the open state this component mounted with.
	// Once the surface has closed, every later open is a gesture of the user's own, and
	// the flag has nothing left to say. Adjusted during render: the reopen's very first
	// frame is the one that needs the answer.
	const arrivedOpenRef = useRef(open)

	if (!open) arrivedOpenRef.current = false

	return animateOnMount || !arrivedOpenRef.current
}
