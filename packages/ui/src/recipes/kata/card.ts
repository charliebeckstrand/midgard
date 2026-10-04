import { defineScale } from '../../core/density'
import { iro, ji } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { size } = ji

/**
 * Card kata. Each step is a `density-*` class. Each part takes the step of its
 * nearest density scope. That scope is the card itself when it has a `size`,
 * else the scope around it. The card itself (`base`) owns the outer padding
 * and the radius. A section pads only the inner edge that it shares with the
 * body: the header below it, the footer above it. The footer also owns its
 * action-row gap, one step tighter than `ma.gap`, so actions sit close. A
 * nested card with a `size` is its own scope, so its sections do not follow
 * the outer card.
 */
export const k = {
	base: [dan.space.box.base, dan.radius.card],
	header: [text.default, dan.space.box.bottom],
	footer: ['flex items-center', dan.space.box.top, dan.gap.default],
	description: [size.sm, text.muted],
} as const

/** The size scale of {@link Card}: the steps of its padding, gap, and radius ramps. */
export const scale = defineScale(
	dan.space.box.base,
	dan.space.box.bottom,
	dan.space.box.top,
	dan.gap.default,
	dan.radius.card,
)
