/**
 * Control archetype: affix slot padding.
 *
 * Affix padding equals `density.px`; a text affix's content aligns with
 * the input text in an affix-less control. When the slot hosts an element
 * with its own outer chrome, the affix padding shrinks to a per-chip
 * constant at every density step. That element is a non-bare `<Button>` or
 * a `<Badge>`, matched on `data-slot`. The constant is `1.5` for a
 * `<Button>`, and `2` for a `<Badge>`. `affixStepDown`
 * (`primitives/affix/affix.ts`) reduces the slot's child one notch per
 * density step. Both `density.px` and the stepped-down child padding grow
 * 0.5 per notch, and the per-step deltas cancel. That holds each constant
 * at every step. The two differ because a `<Badge>` sits one notch below a
 * same-size `<Button>` on the shared `px` scale. Its stepped-down padding
 * is therefore 0.5 smaller, and the slot pads 0.5 more to compensate. The
 * boundary test at `__tests__/boundary/affix-compensation-boundary.test.ts`
 * pins both against the live recipes.
 *
 * The frame is a flex row, so a prefix sits at the inline start and a
 * suffix at the inline end. In a right-to-left control the slots mirror.
 * Thus every pad and margin here is logical (`ps` / `pe`, `ms` / `me`),
 * and mirrors with its slot. The browser test at
 * `__tests__/browser/input-affix-rtl.test.tsx` pins the pad side.
 *
 * An icon-only bare `<Button>` carries no outer chrome, so its glyph
 * aligns to the text line rather than the chip-content line. The override
 * subtracts the button's stepped-down compound padding (`kata/button.ts`)
 * from `density.px`, landing the icon exactly where a text affix sits. The
 * non-bare constant has no counterpart here. The bare compound scale
 * grows 0.25 per notch (half of `density.px`'s 0.5), so the deltas can't
 * cancel and the padding drifts (`1.75 → 2 → 2.25`). A *labeled* bare
 * button carries the regular `p` and stays on the `density.px` base path,
 * hence the `:not([data-has-label])` scope.
 *
 * The bare arm keys on `data-variant`, not `data-slot`: a wrapper can
 * hijack the slot id (e.g. `<TooltipTrigger>` rewrites a child's
 * `data-slot` to `tooltip-trigger`, as the `<PasswordInput>` toggle does),
 * but `data-variant` survives. It also stays exclusive to `<Button>`
 * (`<Badge>` emits only `data-slot=badge`) and matches the button whether
 * it renders as `<button>` or, with `href`, as `<a>`.
 *
 * Slot icons and spinners size here, not in the leaf. Each step projects
 * the stepped-down `shaku.icon` row onto direct `data-slot=icon` children.
 * That is sm → xs, md → sm, lg → md: the one-notch reduction
 * `affixStepDown` broadcasts. It also projects the matching `kata/loading`
 * spinner size onto `data-slot=loading-spinner` children. `<Icon>` and
 * `<LoadingSpinner>` are static (server-renderable) leaves and read no
 * context. The projection keeps a slot indicator in lockstep with the
 * control, and it owns the slot. An explicit `size` on a slot icon or
 * spinner does not override it. Client slot children (`<Button>`) read the
 * stepped-down size from AffixContext.
 *
 * `autofill` is the input-side counterpart. The browser's autofill
 * highlight paints the inner input's full box, which sits flush against
 * an affix slot. The slot's padding faces the frame edge, not the input,
 * so the fill dead-ends into the slot content. Each entry insets the
 * highlight by `density.px` on the affixed side only: `autofill:ms`
 * beside a prefix, `autofill:me` beside a suffix. It is gated on the
 * slot's presence via `group-has` against the frame's `group/control`. The
 * margins ride the `density` axis (`./density.ts`), so every control
 * input carries them. On elements that can't match `:autofill` (the
 * listbox / date-picker buttons) they are inert. The boundary test at
 * `__tests__/boundary/affix-compensation-boundary.test.ts` pins
 * the margin to `density.px` per step.
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
			padding.ps('2.5'),
			icon.xs,
			'*:data-[slot=loading-spinner]:size-3',
			'has-[[data-slot=badge]]:ps-[calc(--spacing(2)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:ps-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:ps-[calc(--spacing(1.75)-1px)]',
		],
		md: [
			padding.ps('3'),
			icon.sm,
			'*:data-[slot=loading-spinner]:size-4',
			'has-[[data-slot=badge]]:ps-[calc(--spacing(2)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:ps-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:ps-[calc(--spacing(2)-1px)]',
		],
		lg: [
			padding.ps('3.5'),
			icon.md,
			'*:data-[slot=loading-spinner]:size-5',
			'has-[[data-slot=badge]]:ps-[calc(--spacing(2)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:ps-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:ps-[calc(--spacing(2.25)-1px)]',
		],
	},
	suffix: {
		sm: [
			padding.pe('2.5'),
			icon.xs,
			'*:data-[slot=loading-spinner]:size-3',
			'has-[[data-slot=badge]]:pe-[calc(--spacing(2)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pe-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:pe-[calc(--spacing(1.75)-1px)]',
		],
		md: [
			padding.pe('3'),
			icon.sm,
			'*:data-[slot=loading-spinner]:size-4',
			'has-[[data-slot=badge]]:pe-[calc(--spacing(2)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pe-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:pe-[calc(--spacing(2)-1px)]',
		],
		lg: [
			padding.pe('3.5'),
			icon.md,
			'*:data-[slot=loading-spinner]:size-5',
			'has-[[data-slot=badge]]:pe-[calc(--spacing(2)-1px)]',
			'has-[[data-slot=button]:not([data-variant=bare])]:pe-[calc(--spacing(1.5)-1px)]',
			'has-[[data-variant=bare]:not([data-has-label])]:pe-[calc(--spacing(2.25)-1px)]',
		],
	},
	autofill: {
		prefix: {
			sm: 'group-has-[[data-slot=prefix]]/control:autofill:ms-[calc(--spacing(2.5)-1px)]',
			md: 'group-has-[[data-slot=prefix]]/control:autofill:ms-[calc(--spacing(3)-1px)]',
			lg: 'group-has-[[data-slot=prefix]]/control:autofill:ms-[calc(--spacing(3.5)-1px)]',
		},
		suffix: {
			sm: 'group-has-[[data-slot=suffix]]/control:autofill:me-[calc(--spacing(2.5)-1px)]',
			md: 'group-has-[[data-slot=suffix]]/control:autofill:me-[calc(--spacing(3)-1px)]',
			lg: 'group-has-[[data-slot=suffix]]/control:autofill:me-[calc(--spacing(3.5)-1px)]',
		},
	},
} as const
