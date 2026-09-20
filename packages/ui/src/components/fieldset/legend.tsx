import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/fieldset'

/** Props for {@link Legend}: the native `<legend>` attributes plus `className`. */
export type LegendProps = ComponentProps<'legend'>

/**
 * Caption for a `<Fieldset>`, rendered as a native `<legend>` that names the
 * group for assistive tech.
 *
 * @remarks Static leaf — renders in React Server Components and fixes type scale
 * at the `md` step rather than reading the Density cascade.
 */
export const Legend = createSlot('legend', 'legend', k.legend({ size: 'md' }))
