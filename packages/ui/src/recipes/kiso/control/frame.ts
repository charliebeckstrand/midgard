/**
 * Control archetype — frame. The outer flex wrapper that hosts the
 * user-input element. Group-join behaviour comes from
 * `styles/recipes/tsunagi.css` — the frame just carries kasane chrome.
 *
 * Layer: kiso · Archetype: control · Concern: frame
 */

import { kasane } from '../kasane'
import { narabi } from '../narabi'

const { layers } = kasane
const { flex } = narabi

export const frame = ['relative', 'group/control', flex.row, 'w-full', ...layers.all]
