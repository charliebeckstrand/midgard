/**
 * Iro soft: translucent fill palette. Background is the role at 15%
 * opacity; text inherits the colour-axis text shade. Hover doubles the
 * opacity to 30%.
 *
 * Layer: kiso · Concern: soft palette
 */

import { shades } from '../../../core/recipe'

import { text } from './text'

export const soft = {
	bg: shades({
		neutral: 'bg-neutral-500/15',
		danger: 'bg-danger-500/15',
		warning: 'bg-warning-500/15',
		success: 'bg-success-500/15',
		primary: 'bg-primary-500/15',
	}),
	text,
	hover: shades({
		neutral: 'not-disabled:hover:bg-neutral-500/30',
		danger: 'not-disabled:hover:bg-danger-500/30',
		warning: 'not-disabled:hover:bg-warning-500/30',
		success: 'not-disabled:hover:bg-success-500/30',
		primary: 'not-disabled:hover:bg-primary-500/30',
	}),
}
