import { ugoki } from '../kiso'

const { duration, ease, reveal } = ugoki

// The outgoing panel clears before the incoming panel starts to show. Two
// panels at half opacity read as one double image, most of all when the
// panels share a layout.
const exit = { duration: duration[100], ease: ease.out }

export const k = {
	transition: reveal.transition,
	exit,
	enter: { ...reveal.transition, delay: exit.duration },
}
