/**
 * Control archetype — affix slot padding.
 *
 * Affix padding equals `density.px` so a text affix's *content* sits the
 * same distance from chrome as input-text does in an affix-less control.
 * When the slot hosts an element with its own outer chrome — a non-bare
 * `<Button>` or a `<Badge>`, matched on `data-slot` — the affix padding
 * shrinks to a constant `1.5` spacing-units at every density step,
 * pulling the chip's *content* 0.5 units inside the text-equidistance
 * line so its chrome reads with breathing room from the slot edge. The
 * single constant works at every density step because `affixStepDown`
 * (`primitives/affix/affix.ts`) moves the slot's child one notch down
 * per density step, and both `density.px` and the stepped-down child
 * padding grow 0.5 per notch — the per-step deltas cancel, leaving only
 * the 0.5 inset. The boundary test at
 * `__tests__/recipes/boundary/affix-compensation-boundary.test.ts` pins
 * this against the live recipes.
 *
 * Layer: kiso · Archetype: control · Concern: affix
 */

import { kasane } from '../kasane'

export const affix = {
	prefix: {
		sm: [
			kasane.padding.pl('2.5'),
			'has-[[data-slot=badge]]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
		],
		md: [
			kasane.padding.pl('3'),
			'has-[[data-slot=badge]]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
		],
		lg: [
			kasane.padding.pl('3.5'),
			'has-[[data-slot=badge]]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
		],
	},
	suffix: {
		sm: [
			kasane.padding.pr('2.5'),
			'has-[[data-slot=badge]]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
		],
		md: [
			kasane.padding.pr('3'),
			'has-[[data-slot=badge]]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
		],
		lg: [
			kasane.padding.pr('3.5'),
			'has-[[data-slot=badge]]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
		],
	},
} as const
