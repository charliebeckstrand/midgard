/**
 * Panel kata: the unit of the panel slots that `createPanel` gives by default.
 * `stack` is the column of the slots, at the gap of the slot rhythm, which a
 * region inside a panel takes to keep that rhythm.
 */
import { defineKata } from '../../core/recipe'
import { panel, stack } from '../kumi/panel'

export const k = defineKata({ extends: panel }, { stack })
