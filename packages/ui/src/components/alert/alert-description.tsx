import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/alert'

/** Props for {@link AlertDescription}: standard `<div>` slot props. */
export type AlertDescriptionProps = ComponentProps<'div'>

/** Secondary-text slot for {@link Alert}, rendered below the title. */
export const AlertDescription = createSlot('div', 'alert-description', k.description)
