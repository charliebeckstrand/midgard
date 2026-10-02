import { ugoki } from '../kiso'

const { duration, ease } = ugoki

// The incoming panel starts to show on the first frame, and the box height
// moves with it on the same curve. A fade-out of the outgoing panel either
// overlaps the fade-in, which shows a double image, or comes before it, which
// shows an empty box. The outgoing panel thus goes at once.
const enter = { duration: duration[200], ease: ease.out }

export const k = {
	transition: enter,
	exit: { duration: 0 },
	enter,
}
