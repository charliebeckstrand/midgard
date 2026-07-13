/**
 * Iro solid: opaque fill palette. The role paints the background; text is
 * the role's `-fg` token (white for every default ramp but warning, whose
 * amber fill carries a dark foreground). Hover darkens the fill by one step.
 *
 * Layer: kiso · Concern: solid palette
 */

import { shades } from '../../../core/recipe'

export const solid = {
	bg: shades({
		neutral: 'bg-neutral-600',
		danger: 'bg-danger-600',
		warning: 'bg-warning-500',
		success: 'bg-success-700',
		primary: 'bg-primary-600',
	}),
	text: shades({
		neutral: 'text-neutral-fg',
		danger: 'text-danger-fg',
		warning: 'text-warning-fg',
		success: 'text-success-fg',
		primary: 'text-primary-fg',
	}),
	hover: shades({
		neutral: 'not-disabled:hover:bg-neutral-700',
		danger: 'not-disabled:hover:bg-danger-700',
		warning: 'not-disabled:hover:bg-warning-600',
		success: 'not-disabled:hover:bg-success-800',
		primary: 'not-disabled:hover:bg-primary-700',
	}),
}
