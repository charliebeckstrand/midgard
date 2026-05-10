import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/fieldset'

export type LegendProps = SlotProps<'legend'>

export const Legend = createSlot('legend', 'legend', k.legend)
