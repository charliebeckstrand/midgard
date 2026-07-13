/**
 * Iro outline: bordered palette. No fill; the role shows as a border
 * (and ring, for kata that paint with rings). Text and hover share the
 * colour-axis sources.
 *
 * Layer: kiso · Concern: outline palette
 */

import { shades } from '../../../core/recipe'

import { hover } from './hover'
import { text } from './text'

export const outline = {
	border: shades({
		neutral: ['border-neutral-800', 'dark:border-neutral-600'],
		danger: ['border-danger-600', 'dark:border-danger-700'],
		warning: ['border-warning-500', 'dark:border-warning-600'],
		success: ['border-success-600', 'dark:border-success-700'],
		primary: ['border-primary-600', 'dark:border-primary-700'],
	}),
	ring: shades({
		neutral: ['ring-neutral-800', 'dark:ring-neutral-600'],
		danger: ['ring-danger-600', 'dark:ring-danger-700'],
		warning: ['ring-warning-500', 'dark:ring-warning-600'],
		success: ['ring-success-600', 'dark:ring-success-700'],
		primary: ['ring-primary-600', 'dark:ring-primary-700'],
	}),
	text,
	hover,
}
