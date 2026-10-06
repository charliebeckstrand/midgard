import { ugoki } from '../kiso'

const { duration, ease, spring, still } = ugoki

// A switch slides the two panels side by side, on the spring of the active
// indicator, so the content travels with the tab line. The panels never
// overlap, so no double image shows, and the box never shows empty. Each panel
// also fades across its slide. The box height moves on the same spring.
const slide = { duration: duration[200], ease: ease.out, transform: spring.slide }

// The panel sits beside the box. `side` is `1` for the trailing side and `-1`
// for the leading side.
const away = (side: number) => ({ opacity: 0, transform: `translateX(${side * 100}%)` })

// The panel rests at `transform: none`. Any other transform makes the panel a
// containing block for fixed descendants. Motion writes `none` as a zero
// translate, so `transitionEnd` sets it on arrival.
const shown = { opacity: 1, transform: 'translateX(0%)', transitionEnd: { transform: 'none' } }

export const k = {
	transition: spring.slide,
	away,
	shown,
	slide,
	// Under reduced motion the panels change places at once, and the fade stays.
	still: still({ transition: slide }).transition,
	instant: { duration: 0 },
}
