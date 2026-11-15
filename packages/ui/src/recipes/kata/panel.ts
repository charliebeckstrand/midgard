/**
 * Panel kata: the unit of the panel slots that `createPanel` gives by default.
 * `stack` is the column of the slots, at the gap of the slot rhythm, which a
 * region inside a panel takes to keep that rhythm. `bar` is the header of a
 * closable panel.
 */
import { defineKata } from '../../core/recipe'
import { dan, narabi } from '../kiso'
import { panel, stack } from '../kumi/panel'

const { flex } = narabi

/**
 * The header of a closable panel: a row with the column of the title (`lead`)
 * and the X close at the end. `lead` keeps the tight gap of the header between
 * the title and the description. It shrinks, so a long title wraps and does
 * not push the X past the edge.
 */
const bar = {
	base: 'flex-row items-center',
	lead: [flex.col, 'min-w-0', 'flex-1', dan.gap.scale.sm],
}

export const k = defineKata({ extends: panel }, { stack, bar })
