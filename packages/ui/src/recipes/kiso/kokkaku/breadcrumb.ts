/**
 * Kokkaku skeleton: breadcrumb. Crumb lines at the line height of the text of
 * the list, with a separator of the size of the real separator between them.
 * Each takes the step of the nearest density scope. The crumb count comes from
 * the composing skeleton.
 *
 * Layer: kiso · Concern: skeleton form · Unit: breadcrumb
 */

import { dan } from '../dan'

export const breadcrumb = {
	item: [dan.text.body, 'h-lh w-16'],
	separator: dan.size.separator.base,
} as const
