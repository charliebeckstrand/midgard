/**
 * Control group: frame. The outer flex wrapper that hosts the
 * user-input element. Group-join behavior comes from the `tsunagi` classes
 * on the enclosing `<Group>` container; the frame carries kasane chrome.
 *
 * Layer: kumi · Group: control · Concern: frame
 */

import { dan } from '../../kiso/dan'
import { kasane } from '../../kiso/kasane'
import { narabi } from '../../kiso/narabi'
import { radius } from './density'

const { layers } = kasane
const { flex } = narabi

/**
 * The radius of the frame: the outer box, the inset fill, and the overlay. It
 * is the same as `py` at each step, and it takes the step of the nearest
 * density scope. The fill and the overlay are pseudo-elements, and each takes
 * the step of the box. The fill sits 1px inside the box, so its radius is 1px
 * less at each step. The overlay fills the box, so it inherits the radius of
 * the box.
 */
const frameRadius = [radius, dan.radius.fill, 'after:rounded-[inherit]'] as const

export const frame = ['relative', 'group/control', flex.row, 'w-full', ...layers, ...frameRadius]
