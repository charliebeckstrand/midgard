import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/fieldset'

export type FieldsetProps = SlotProps<'fieldset'>

export const Fieldset = createSlot('fieldset', 'fieldset', k.base)
