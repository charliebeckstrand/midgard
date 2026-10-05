import { defineScale } from '../../core/density'
import { iro, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { flex } = narabi

/**
 * Card kata. Each step is a `density-*` class. Each part takes the step of its
 * nearest density scope. That scope is the card itself when it has a `size`,
 * else the scope around it. The card itself (`base`) owns the outer padding
 * and the radius. A section pads only an inner edge that it shares with a
 * sibling. The header pads its bottom edge when a sibling follows it. The
 * footer pads its top edge when a sibling other than the header comes before
 * it. Thus a section at an outer edge adds no pad, and with no body the header
 * owns the edge that it shares with the footer. The footer also owns its
 * action-row gap, one step tighter than `ma.gap`, so actions sit close. A
 * nested card with a `size` is its own scope, so its sections do not follow
 * the outer card.
 */
export const k = {
	base: [dan.space.box.base, dan.radius.card],
	header: [text.default, dan.space.card.header.bottom],
	footer: [flex.row, dan.space.card.footer.top, dan.gap.default],
	description: [dan.text.small, text.muted],
} as const

/**
 * The size scale of {@link Card}: the steps of its padding, gap, and radius
 * ramps. A section pad has the list of the frame pad behind a variant, so the
 * frame pad gives its steps.
 */
export const scale = defineScale(dan.space.box.base, dan.gap.default, dan.radius.card)
