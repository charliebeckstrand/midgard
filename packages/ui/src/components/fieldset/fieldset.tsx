import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/fieldset'

/** Props for {@link Fieldset}: the native `<fieldset>` attributes. */
export type FieldsetProps = ComponentProps<'fieldset'>

/**
 * A native `<fieldset>` that groups related form controls. Caption it with a
 * `<Legend>` and lay out each control as a `<Field>` (`<Label>`, the control,
 * `<Description>`, and `<Message>`).
 */
export const Fieldset = createSlot('fieldset', 'fieldset', k.base)
