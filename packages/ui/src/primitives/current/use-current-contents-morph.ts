'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import { useReducedMotion } from 'motion/react'
import { type RefObject, useEffect } from 'react'
import { k } from '../../recipes/kata/current'

/** One observed panel's border box, split along the morph discriminator. @internal */
type PanelBox = {
	inline: number
	block: number
}

/**
 * A panel's border box, from the observer entry when it carries one. Border
 * box, not `contentRect`: the content box excludes panel padding/border,
 * under-sizing the container and clipping the bottom.
 */
function measureBox(target: Element, borderBox?: ResizeObserverSize): PanelBox {
	if (borderBox) return { inline: borderBox.inlineSize, block: borderBox.blockSize }

	const rect = target.getBoundingClientRect()

	return { inline: rect.width, block: rect.height }
}

/** The tallest tracked panel — the container's morph target. */
function tallest(boxes: Map<Element, PanelBox>): number {
	let max = 0

	for (const box of boxes.values()) max = Math.max(max, box.block)

	return max
}

/**
 * Folds a batch of observer entries into the tracked boxes and classifies the
 * change: `reflow` when any panel's width moved (the container is being
 * resized; height follows through layout), `discrete` when a panel's height
 * moved on its own. A target's first delivery is its baseline, not a change.
 */
function classifyEntries(
	boxes: Map<Element, PanelBox>,
	entries: ResizeObserverEntry[],
): { discrete: boolean; reflow: boolean } {
	let discrete = false

	let reflow = false

	for (const entry of entries) {
		const next = measureBox(entry.target, entry.borderBoxSize?.[0])

		const previous = boxes.get(entry.target)

		boxes.set(entry.target, next)

		if (!previous) continue

		if (next.inline !== previous.inline) reflow = true
		else if (next.block !== previous.block) discrete = true
	}

	return { discrete, reflow }
}

/**
 * Discrete height morphs for a fading current-panel container. At rest the
 * container holds `height: auto`, so a window drag — where every panel height
 * change is coupled to a width change — reflows through CSS with no observer
 * state and no re-render at all. Only a discrete height change morphs: the
 * `data-current` set swapping (a panel switch) or a panel growing at constant
 * width (content expanding in place). The morph pins the container at its
 * current height before the frame paints and tweens the inline style straight
 * to the target, all outside React: a render must never own the in-flight
 * height, because re-rendering would stamp the resting value back over the pin
 * and snap the box before the tween starts. A completed tween — or a
 * width-coupled change arriving mid-morph, which cancels it — clears the
 * inline height, handing the box back to `auto` and layout.
 *
 * Reduced motion opts the whole observer out: the container just reflows to
 * each panel switch while the crossfade (which `MotionConfig` keeps under
 * reduced motion) still plays.
 *
 * @internal
 */
export function useCurrentContentsMorph(ref: RefObject<HTMLElement | null>, enabled: boolean) {
	// Imperative `animate()` runs outside any MotionConfig; read the OS
	// preference directly and leave the height to layout under reduced motion.
	const reducedMotion = useReducedMotion()

	useEffect(() => {
		const element = ref.current

		if (!element || !enabled || reducedMotion) return

		// Track every `data-current` child's box; the container morphs to the
		// tallest. When the context value is undefined, all panels are
		// `data-current` and stacked.
		const boxes = new Map<Element, PanelBox>()

		// The container's last settled height. At rest the container sits at
		// `height: auto`, so by the time an observer fires it has already reflowed
		// to the incoming height and its live box reads that already-advanced value
		// (`live === to`, which would short-circuit the morph). Animate from this
		// tracked height in that case; mid-morph the container holds an explicit
		// tweening height (`live !== to`), so the live box is still the true visual
		// origin and an interrupted morph continues from where it visually is.
		let previousHeight = element.getBoundingClientRect().height

		let tween: AnimationPlaybackControls | null = null

		// Stops any in-flight tween and rests the box back at `height: auto`.
		const settle = () => {
			tween?.stop()

			tween = null

			element.style.height = ''
		}

		// Pins the container at its animation origin before this frame paints —
		// observer callbacks run after layout and before paint, so nothing in
		// between reaches the screen — then tweens the inline height to the
		// target and hands it back to `auto` on completion.
		const morph = (to: number) => {
			const live = element.getBoundingClientRect().height

			const from = live === to ? previousHeight : live

			previousHeight = to

			if (from === to) return

			tween?.stop()

			element.style.height = `${from}px`

			tween = animate(from, to, {
				...k.transition,
				onUpdate: (height) => {
					element.style.height = `${height}px`
				},
				onComplete: settle,
			})
		}

		const resizeObserver = new ResizeObserver((entries) => {
			const { discrete, reflow } = classifyEntries(boxes, entries)

			// A height-only change at constant width is content moving on its own —
			// morph to it. Anything width-coupled is the container reflowing; `auto`
			// already tracks it, so an in-flight morph stops steering instead.
			if (discrete && !reflow) morph(tallest(boxes))
			else if (reflow) {
				// Record the reflowed height so a following discrete morph animates
				// from it, and stop steering any in-flight morph.
				previousHeight = element.getBoundingClientRect().height

				settle()
			}
		})

		// (Re)collects the observed panels. A change in the `data-current` set is
		// itself a discrete height change — the panel switch — so it morphs from
		// the container's height to the incoming panel's, measured before this
		// frame paints.
		const observe = () => {
			const settled = boxes.size > 0

			resizeObserver.disconnect()

			boxes.clear()

			for (const child of element.children) {
				if (!child.hasAttribute('data-current')) continue

				resizeObserver.observe(child)

				boxes.set(child, measureBox(child))
			}

			if (settled) morph(tallest(boxes))
		}

		observe()

		// The observed set is always a subset of `element.children` (`observe`
		// scans only direct children), so just two mutations can change it: the
		// container's own child list, and a direct child's `data-current` flip.
		// Split scopes keep deep subtree churn — content re-rendering inside a
		// panel — from re-running `observe` and its forced-layout re-measure:
		// the child-list scope omits `subtree`, and the attribute scope (which
		// needs `subtree`, child attributes are unobservable without it) filters
		// to `data-current` plus a direct-child check that drops stamps from
		// nested widgets.
		const childListObserver = new MutationObserver(observe)

		childListObserver.observe(element, { childList: true })

		const currentObserver = new MutationObserver((records) => {
			if (records.some((record) => record.target.parentElement === element)) observe()
		})

		currentObserver.observe(element, {
			attributes: true,
			subtree: true,
			attributeFilter: ['data-current'],
		})

		return () => {
			settle()

			resizeObserver.disconnect()

			childListObserver.disconnect()

			currentObserver.disconnect()
		}
	}, [ref, enabled, reducedMotion])
}
