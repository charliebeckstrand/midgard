/**
 * Omote content: card content block with viewport-dependent chrome.
 * At `lg` and up the block paints a surface, shadow, and rounded corners;
 * below `lg` it sits flat against the page. Used for content wrappers
 * that should read as cards on desktop and flush sections on mobile.
 *
 * Layer: kiso · Concern: content block
 */

import { mode } from '../../../core/recipe'

export const content = [
	...mode('lg:bg-white', 'dark:lg:bg-zinc-900'),
	'lg:rounded-lg',
	'lg:shadow-xs',
]
