/**
 * Control archetype: affix slot padding.
 *
 * Affix padding equals `density.px`; a text affix's content aligns with
 * the input text in an affix-less control. When the slot hosts an element
 * with its own outer chrome (a non-bare `<Button>` or a `<Badge>`,
 * matched on `data-slot`), the affix padding shrinks to a constant `1.5`
 * spacing-units at every density step. `affixStepDown`
 * (`primitives/affix/affix.ts`) reduces the slot's child one notch per
 * density step; both `density.px` and the stepped-down child padding grow
 * 0.5 per notch, and the per-step deltas cancel, holding the constant at
 * every step. The boundary test at
 * `__tests__/recipes/boundary/affix-compensation-boundary.test.ts` pins
 * this against the live recipes.
 *
 * Layer: kiso · Archetype: control · Concern: affix
 */

import { kasane } from '../kasane'

const { padding } = kasane

export const affix = {
	prefix: {
		sm: [
			padding.pl('2.5'),
			'has-[[data-slot=badge]]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
		],
		md: [
			padding.pl('3'),
			'has-[[data-slot=badge]]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
		],
		lg: [
			padding.pl('3.5'),
			'has-[[data-slot=badge]]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
		],
	},
	suffix: {
		sm: [
			padding.pr('2.5'),
			'has-[[data-slot=badge]]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
		],
		md: [
			padding.pr('3'),
			'has-[[data-slot=badge]]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
		],
		lg: [
			padding.pr('3.5'),
			'has-[[data-slot=badge]]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
		],
	},
} as const
