import { createSlot } from '../../core'
import { k } from '../../recipes/kata/alert'

/**
 * Default content slot for {@link Alert}, wrapping its loose children.
 *
 * Not barreled. The title and description are props on `Alert`, so no slot
 * trio remains for this to complete. A caller passes children, and the alert
 * wraps them here.
 *
 * @internal
 */
export const AlertBody = createSlot('div', 'alert-body', k.body)
