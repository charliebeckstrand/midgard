import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/dl'

/** Props for {@link DescriptionDetails}: native `<dd>` attributes. */
export type DescriptionDetailsProps = SlotProps<'dd'>

/**
 * Details cell (`<dd>`) for a `<DescriptionList>` term/details pair. Carries text styling only;
 * the parent `<DescriptionList>` projects the orientation layout onto it.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 */
export const DescriptionDetails = createSlot('dd', 'dl-details', k.details)
