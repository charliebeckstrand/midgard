import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/fieldset'

/** Props for {@link Fieldset}: the native `<fieldset>` attributes via `SlotProps`. */
export type FieldsetProps = SlotProps<'fieldset'>

/**
 * Groups related form controls in a native `<fieldset>`. Caption it with a
 * `<Legend>` and lay out each control as a `<Field>` (`<Label>`, the control,
 * `<Description>`, and `<Message>`).
 */
export const Fieldset = createSlot('fieldset', 'fieldset', k.base)
