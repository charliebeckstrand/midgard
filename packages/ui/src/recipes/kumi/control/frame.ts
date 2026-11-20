/**
 * Control group: frame. The outer flex wrapper that hosts the
 * user-input element. Group-join behavior comes from the `tsunagi` classes
 * on the enclosing `<Group>` container. `chrome` is the kasane chrome that the
 * framed surfaces add.
 *
 * Layer: kumi · Group: control · Concern: frame
 */

import { mode } from '../../../core/recipe'
import { dan, kasane, narabi } from '../../kiso'
import { radius } from './density'

const { layers, softLayers } = kasane
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

export const frame = ['relative', 'group/control', flex.row, 'w-full']

/**
 * The chrome of the frame: the kasane layers and the radius. Each surface but
 * `bare` draws it (`./index.ts`).
 */
export const chrome = [...layers, ...frameRadius]

/** The chrome of a `soft` frame: the soft stack and the radius. */
export const softChrome = [...softLayers, ...frameRadius]

/**
 * The placeholder of a `soft` field. The hover wash of a soft frame is 10%
 * zinc on light and 20% white on dark. There the placeholder of `reset`
 * (`zinc-500`, `zinc-400`) misses the 4.5:1 text floor at 3.88:1 and 3.57:1.
 * `zinc-600` and `zinc-300` clear it at 6.22:1 and 6.35:1, and they are the
 * least emphatic rungs that do. `__tests__/recipes/contrast.test.ts` measures
 * them.
 */
export const softPlaceholder = mode('placeholder:text-zinc-600', 'dark:placeholder:text-zinc-300')
