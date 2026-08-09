'use client'

import { useEffect, useRef, useState } from 'react'

/** Options for {@link useInView}. */
export type InViewOptions = {
	/**
	 * How far outside the viewport still counts as in view, as a CSS margin —
	 * the `rootMargin` an `IntersectionObserver` takes. Grow it to prepare
	 * content just before a reader reaches it.
	 *
	 * @defaultValue '200px'
	 */
	margin?: string
	/**
	 * Stop observing once the target has been seen once. For content that is
	 * mounted on first sight and then kept, the observer has nothing left to
	 * report.
	 *
	 * @defaultValue true
	 */
	once?: boolean
}

/** Return shape of {@link useInView}: the ref to attach, and whether it is in view. */
export type InView = {
	ref: React.RefObject<HTMLDivElement | null>
	inView: boolean
}

/**
 * Whether the referenced element is in (or near) the viewport.
 *
 * @remarks
 * Reports `true` where `IntersectionObserver` is not available — server
 * rendering, and jsdom. That is deliberate: the hook gates work that is
 * otherwise correct, so the safe answer when the environment cannot tell is
 * "show it". A caller that renders everything is slower than one that defers,
 * never wrong.
 *
 * `once` is the default because the common use is mount-on-first-sight and keep;
 * the observer disconnects the moment it reports, so a long list costs one
 * observation per item rather than one per scroll.
 *
 * One observer per element, where {@link useTruncation} pools its
 * `ResizeObserver` behind a module-level instance and a `WeakMap`. That pooling
 * is worth porting here if a caller ever observes thousands: it is the same
 * twenty lines, with `unobserve` in place of `disconnect`. It is not worth it
 * yet — the heaviest caller today defers a few hundred embeds, where the whole
 * per-embed mount measured about 0.2 ms including the observer, one time, off
 * the streaming path.
 *
 * @param options - See {@link InViewOptions}.
 * @returns The `ref` to attach to the observed element, and `inView`.
 */
export function useInView({ margin = '200px', once = true }: InViewOptions = {}): InView {
	const ref = useRef<HTMLDivElement>(null)

	// Starts true where nothing can observe, so the gated content renders rather
	// than never appearing.
	const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

	useEffect(() => {
		const element = ref.current

		if (!element || typeof IntersectionObserver === 'undefined') return

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries.some((entry) => entry.isIntersecting)

				if (!visible && once) return

				setInView(visible)

				// `once` implies visible by the guard above.
				if (once) observer.disconnect()
			},
			{ rootMargin: margin },
		)

		observer.observe(element)

		return () => {
			observer.disconnect()
		}
	}, [margin, once])

	return { ref, inView }
}
