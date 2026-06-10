/**
 * Ugoki spring: fluid spring transition for Framer `layoutId`
 * transitions (segment indicator slide, tab indicator).
 *
 * Layer: kiso · Concern: spring transition
 */

export const spring = {
	type: 'spring' as const,
	stiffness: 300,
	damping: 30,
}
