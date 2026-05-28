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
import { tsunagi } from '../tsunagi'

export const frame = [
	'group/control flex items-center',
	'relative w-full',
	...kasane.all,
	...tsunagi.base,
]
