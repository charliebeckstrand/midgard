/**
 * Ugoki tooltip: tooltip fade with subtle scale, tuned for rapid show/hide.
 *
 * Layer: kiso · Concern: tooltip motion
 */

import { duration, ease } from './base'

export const tooltip = {
	initial: { opacity: 0, scale: 0.95 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.95 },
	transition: { duration: duration[100], ease: ease.out },
}
