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
 * An icon-only bare `<Button>` carries no outer chrome, so its glyph
 * aligns to the text line rather than the chip-content line: the override
 * subtracts the button's stepped-down compound padding (`kata/button.ts`)
 * from `density.px`, landing the icon exactly where a text affix sits. The
 * non-bare constant has no counterpart here — the bare compound scale
 * grows 0.25 per notch (half of `density.px`'s 0.5), so the deltas can't
 * cancel and the padding drifts (`1.75 → 2 → 2.25`). A *labeled* bare
 * button carries the regular `p` and stays on the `density.px` base path,
 * hence the `:not([data-has-label])` scope.
 *
 * The bare arm keys on `data-variant`, not `data-slot`: a wrapper can
 * hijack the slot id (e.g. `<TooltipTrigger>` rewrites a child's
 * `data-slot` to `tooltip-trigger`, as the `<PasswordInput>` toggle does),
 * but `data-variant` survives. It also stays exclusive to `<Button>` —
 * `<Badge>` emits only `data-slot=badge` — and matches the button whether
 * it renders as `<button>` or, with `href`, as `<a>`.
 *
 * Slot icons and spinners size here, not in the leaf: each step projects
 * the stepped-down `shaku.icon` row onto direct `data-slot=icon` children
 * (sm → xs, md → sm, lg → md), the same one-notch reduction
 * `affixStepDown` broadcasts, plus the matching `kata/loading` spinner
 * size onto `data-slot=loading-spinner` children. `<Icon>` and
 * `<LoadingSpinner>` are static (server-renderable) leaves and read no
 * context; the projection keeps a slot indicator in lockstep with the
 * control, and it owns the slot: an explicit `size` on a slot icon or
 * spinner does not override it. Client slot children (`<Button>`) read
 * the stepped-down size from AffixContext.
 *
 * Layer: kiso · Archetype: control · Concern: affix
 */

import { kasane } from '../kasane'
import { shaku } from '../shaku'

const { padding } = kasane
const { icon } = shaku

export const affix = {
	prefix: {
		sm: [
			padding.pl('2.5'),
			icon.xs,
			'*:data-[slot=loading-spinner]:size-3',
			'has-[[data-slot=badge]]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:pl-[calc(--spacing(1.75)-1px)]',
		],
		md: [
			padding.pl('3'),
			icon.sm,
			'*:data-[slot=loading-spinner]:size-4',
			'has-[[data-slot=badge]]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:pl-[calc(--spacing(2)-1px)]',
		],
		lg: [
			padding.pl('3.5'),
			icon.md,
			'*:data-[slot=loading-spinner]:size-5',
			'has-[[data-slot=badge]]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pl-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:pl-[calc(--spacing(2.25)-1px)]',
		],
	},
	suffix: {
		sm: [
			padding.pr('2.5'),
			icon.xs,
			'*:data-[slot=loading-spinner]:size-3',
			'has-[[data-slot=badge]]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:pr-[calc(--spacing(1.75)-1px)]',
		],
		md: [
			padding.pr('3'),
			icon.sm,
			'*:data-[slot=loading-spinner]:size-4',
			'has-[[data-slot=badge]]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:pr-[calc(--spacing(2)-1px)]',
		],
		lg: [
			padding.pr('3.5'),
			icon.md,
			'*:data-[slot=loading-spinner]:size-5',
			'has-[[data-slot=badge]]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pr-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:pr-[calc(--spacing(2.25)-1px)]',
		],
	},
} as const
