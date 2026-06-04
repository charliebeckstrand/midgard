/**
 * Control archetype — frame. The outer flex wrapper that hosts the
 * user-input element. Group-join behaviour comes from the `tsunagi` classes
 * on the enclosing `<Group>` container — the frame just carries kasane chrome.
 *
 * Layer: katakana · Archetype: control · Concern: frame
 */

import { kasane } from '../../kiso/kasane'
import { narabi } from '../../kiso/narabi'

const { layers } = kasane
const { flex } = narabi

export const frame = ['relative', 'group/control', flex.row, 'w-full', ...layers.all]
