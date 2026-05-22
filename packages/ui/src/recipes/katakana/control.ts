/**
 * Control applicator — the text-input branch of the Control family
 * archetype. Covers `input`, `textarea`, `listbox`, `combobox`, and
 * `date-picker` — every kata that frames a user-input element with the
 * library's signature kasane chrome and the `default` / `outline` / `glass`
 * surface vocabulary.
 *
 * The check-input branch (`checkbox`, `radio`, `switch`) reads different
 * fragments (`check.surface` / `check.hidden`) and will land as its own
 * applicator — `check` — when this mock graduates.
 *
 * Mock note: this file still sources `control` fragments from
 * `genkei/control` so the rest of the package keeps type-checking. When
 * katakana lands for real, the genkei content moves into this directory
 * (likely as `katakana/control/{frame,density,surface,affix,resets}.ts`)
 * and the genkei folder dissolves.
 */

import type { ClassValue } from 'clsx'

import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { control } from '../genkei/control'

const { input, density, size, surface, affix, resets } = control

/** The surface vocabulary every text-input control inherits. */
type Surface = 'default' | 'outline' | 'glass'

type ControlInput<Slots extends Record<string, ClassValue>> = {
	/** Extra classes appended to the control frame base. */
	base?: ClassValue
	/** Border-radius for the frame. Defaults to `rounded-lg`. */
	rounded?: ClassValue
	/** Kata-defined slots. `number` is auto-wired and need not be redeclared. */
	slots?: Slots
	/** Defaults for the variant / density / size axes. */
	defaults?: {
		variant?: Surface
		density?: 'sm' | 'md' | 'lg'
		size?: 'sm' | 'md' | 'lg'
	}
}

/**
 * Build the kata `k` surface for a text-input control.
 *
 * The returned recipe:
 *   - is callable as `k({ variant, density, size })` — outer frame classes
 *   - exposes `k.number` and any caller-defined slots as direct strings
 *   - exposes `k.inputControl({ variant })` — surface recipe for the inner
 *     `<input>` element (`default` paints surface.default, `glass` paints
 *     surface.glass, `outline` is empty so kata can layer borders)
 *   - exposes `k.prefix` / `k.suffix` / `k.autofill` — density-keyed
 *     affix-padding tables read by the component
 */
export function control_<Slots extends Record<string, ClassValue> = Record<string, never>>(
	cfg: ControlInput<Slots> = {},
) {
	const rounded = cfg.rounded ?? 'rounded-lg'

	const callerBase: ClassValue[] = cfg.base === undefined ? [] : [cfg.base]

	const main = defineRecipe(
		{
			base: [...input, rounded, ...callerBase],
			variant: {
				default: [],
				outline: [],
				glass: [],
			},
			density,
			size,
			slots: {
				number: resets.number,
				...(cfg.slots ?? ({} as Slots)),
			},
			defaults: {
				variant: 'default',
				density: 'md',
				size: 'md',
				...cfg.defaults,
			},
		},
		{
			inputControl: defineRecipe({
				variant: {
					default: surface.default,
					outline: [],
					glass: surface.glass,
				},
				defaults: { variant: 'default' },
			}),
			prefix: affix.prefix,
			suffix: affix.suffix,
			autofill: affix.autofill,
		},
	)

	return main
}

// `control` is also the name of the const in `genkei/control`. While both
// layers coexist during the mock, this file's public binding takes the
// underscore-suffixed form; the barrel renames it back to `control` on the
// way out so kata sites read `control({ … })`.
export { control_ as control }

/** Prop union of the outer-frame recipe — the shape a kata's main `k({…})` accepts. */
export type ControlVariants = VariantPropsOf<ReturnType<typeof control_>>
