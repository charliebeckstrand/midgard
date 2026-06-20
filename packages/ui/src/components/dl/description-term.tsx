import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/dl'

/** Props for {@link DescriptionTerm}: native `<dt>` attributes. */
export type DescriptionTermProps = SlotProps<'dt'>

/**
 * Term cell (`<dt>`) for a `<DescriptionList>` term/details pair. Carries text styling only;
 * the parent `<DescriptionList>` projects the orientation layout onto it.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 */
export const DescriptionTerm = createSlot('dt', 'dl-term', k.term)
