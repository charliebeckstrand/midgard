/**
 * Control archetype — frame. The outer flex wrapper that hosts the user-input
 * element. `tsunagi.base` is data-attribute-gated so it stays inert until a
 * `<Group>` stamps `data-group` / `data-group-orientation` on the frame —
 * including it here is what lets every ControlFrame-based component
 * participate in `<Group>` without per-component wiring.
 *
 * Layer: kiso · Archetype: control · Concern: frame
 */

import { kasane } from '../kasane'
import { narabi } from '../narabi'
import { tsunagi } from '../tsunagi'

const { layers } = kasane
const { flex } = narabi
const { base } = tsunagi

export const frame = ['relative', 'group/control', flex.row, 'w-full', ...layers.all, ...base]
