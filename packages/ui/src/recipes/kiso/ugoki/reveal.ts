/**
 * Ugoki reveal: placeholder-to-content crossfade with vertical shift
 * and blur. Used by `<ReadyReveal>` to animate the moment a skeleton
 * resolves into real content.
 *
 * Layer: kiso · Concern: content reveal
 */

import { duration, ease } from './base'

export const reveal = {
	initial: { opacity: 0, y: 4, filter: 'blur(4px)' },
	animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
	exit: { opacity: 0, y: -4, filter: 'blur(4px)' },
	transition: { duration: duration[250], ease: ease.standard },
}
