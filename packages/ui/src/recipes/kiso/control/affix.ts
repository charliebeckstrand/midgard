/**
 * Control archetype: affix slot padding.
 *
 * Affix padding equals the control `px` (`density-px-ring-*` in
 * `./density.ts`); a text affix's content aligns with the input text in an
 * affix-less control. When the slot hosts an element with its own outer chrome,
 * the affix padding shrinks to a per-chip constant at every density step. That
 * element is a non-bare `<Button>` or a `<Badge>`, matched on `data-slot`. A
 * constant is a plain utility, so it wins over the stepped padding of the slot.
 * The constant is `1.5` for a `<Button>`, and `2` for a `<Badge>`. The slot
 * scope reduces the slot's child one step per density step. Both the control
 * `px` and the stepped-down child padding grow 0.5 per notch, and the per-step
 * deltas cancel. That holds each constant at every step. The two differ because
 * a `<Badge>` sits one notch below a same-size `<Button>` on the shared `px`
 * scale. Its stepped-down padding is therefore 0.5 smaller, and the slot pads
 * 0.5 more to compensate. `__tests__/recipes/affix-compensation.test.ts` pins
 * both against the live recipes.
 *
 * The frame is a flex row, so a prefix sits at the inline start and a suffix at
 * the inline end. In a right-to-left control the slots mirror. Thus every pad
 * and margin here is logical (`ps` / `pe`, `ms` / `me`), and mirrors with its
 * slot. The browser test at `__tests__/browser/input-affix-rtl.test.tsx` pins
 * the pad side.
 *
 * An icon-only bare `<Button>` carries no outer chrome, so its glyph aligns to
 * the text line rather than the chip-content line. The override subtracts the
 * button's stepped-down compound padding (`kata/button.ts`) from the control
 * `px`, landing the icon exactly where a text affix sits. The non-bare constant
 * has no counterpart here. The bare compound scale grows 0.25 per notch (half
 * the 0.5 of the control `px`), so the deltas can't cancel and the padding
 * drifts (`1.75 → 2 → 2.25 → 2.5`). A *labeled* bare button carries the regular `p`
 * and stays on the base path of the control `px`, hence the
 * `:not([data-has-label])` scope.
 *
 * The button arms key on `data-variant`, not `data-slot`. A wrapper can give
 * a `<Button>` a different anchor, as the close button of a dialog does with
 * `data-slot="dialog-close"`, but `data-variant` stays. On a `<button>` or an `<a>` it is exclusive
 * to `<Button>`: `<Badge>` emits only `data-slot=badge`, and the
 * `data-variant` of `<Swatch>` sits on a `<span>`. The arms match the
 * button whether it renders as `<button>` or, with `href`, as `<a>`.
 *
 * Each slot writes `data-density="slot"`. The rungs read it as a scope one
 * step below the scope above it (`slotStep` in `core/density`): sm → xs,
 * md → sm, lg → md, xl → lg. No step is below `xs`, so xs → xs. An `<Icon>`,
 * a `<LoadingSpinner>`, or a `<Badge>` in the slot takes that step through its
 * stepped classes, and so does a `<Button>`.
 * So the slot projects no size. An explicit `size` on a slot child wins, as it
 * does elsewhere.
 *
 * The slot is its own nearest scope, so its own padding takes the slot step
 * and not the step of the control. Each stepped list thus gives the value of a
 * control one step above: the `xs` value is for an `sm` control, the `sm`
 * value is for an `md` control, and so on to the `lg` value for an `xl`
 * control. A slot does not take `xl`, so the `xl` value continues the step of
 * the list. The slot of an `xs` control is `xs` too, so it takes the values of
 * the slot of an `sm` control.
 *
 * `autofill` is the input-side counterpart. The browser's autofill
 * highlight paints the inner input's full box, which sits flush against
 * an affix slot. The slot's padding faces the frame edge, not the input,
 * so the fill dead-ends into the slot content. Each entry insets the
 * highlight by the control `px` on the affixed side only: `autofill:ms`
 * beside a prefix, `autofill:me` beside a suffix. It is gated on the
 * slot's presence via `group-has` against the frame's `group/control`. The
 * margins ride the `density` axis (`./density.ts`), so every control
 * input carries them. On elements that can't match `:autofill` (the
 * listbox / date-picker buttons) they are inert.
 * `__tests__/recipes/affix-compensation.test.ts` pins the margin to the control
 * `px` at each step.
 *
 * Layer: kiso · Archetype: control · Concern: affix
 */

import { dan } from '../dan'
import { iro } from '../iro'
import { narabi } from '../narabi'

export const affix = {
	/**
	 * The layout that each affix slot shares: a centered row that can shrink, in
	 * the muted text color. An icon in the slot takes no pointer.
	 */
	base: [narabi.flex.row, 'min-w-0', '*:data-[slot=icon]:pointer-events-none', ...iro.text.muted],
	prefix: [
		dan.space.affix.prefix,
		'has-[[data-slot=badge]]:ps-ring-2',
		'has-[:is(button,a)[data-variant]:not([data-variant=bare])]:ps-ring-1.5',
		dan.space.affix.bare.prefix,
	],
	suffix: [
		dan.space.affix.suffix,
		'has-[[data-slot=badge]]:pe-ring-2',
		'has-[:is(button,a)[data-variant]:not([data-variant=bare])]:pe-ring-1.5',
		dan.space.affix.bare.suffix,
	],
	autofill: {
		prefix: dan.space.autofill.prefix,
		suffix: dan.space.autofill.suffix,
	},
} as const
