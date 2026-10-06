import { ugoki } from '../kiso'

const { duration, ease, spring, still } = ugoki

/**
 * `fade`: the outgoing panel fades out, and the incoming panel fades in as the
 * outgoing panel nears transparent. The two fades overlap only at low opacity,
 * so no double image shows, and the box never shows empty for more than a
 * frame. The box height moves across the whole switch.
 */
const fade = {
	exit: { duration: duration[150], ease: ease.linear },
	// The incoming panel starts as the outgoing panel nears one quarter of its
	// opacity.
	enter: { duration: duration[200], ease: ease.out, delay: duration[100] },
	height: { duration: duration[300], ease: ease.inOut },
}

/**
 * `slide`: the two panels slide side by side on the spring of the active
 * indicator, so the content travels with the tab line. The panels never
 * overlap, so no double image shows, and the box never shows empty. Each panel
 * also fades across its slide. The box height moves on the same spring.
 */
const slideTransition = { duration: duration[200], ease: ease.out, transform: spring.slide }

const slide = {
	transition: slideTransition,
	// Under reduced motion the panels change places at once, and the fade stays.
	still: still({ transition: slideTransition }).transition,
	height: spring.slide,
	// The panel waits beside the box. `side` is `1` for the trailing side and
	// `-1` for the leading side.
	away: (side: number) => ({ opacity: 0, transform: `translateX(${side * 100}%)` }),
	// The panel rests at `transform: none`. Any other transform makes the panel a
	// containing block for fixed descendants. Motion writes `none` as a zero
	// translate, so `transitionEnd` sets it on arrival.
	shown: { opacity: 1, transform: 'translateX(0%)', transitionEnd: { transform: 'none' } },
}

export const k = {
	fade,
	slide,
	instant: { duration: 0 },
}
