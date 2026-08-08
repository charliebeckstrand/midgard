/**
 * Ugoki overlay: backdrop fade for dialogs and sheets. Opacity only.
 *
 * Layer: kiso · Concern: backdrop motion
 */

import { duration } from './base'

export const overlay = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
	transition: { duration: duration[150] },
}
