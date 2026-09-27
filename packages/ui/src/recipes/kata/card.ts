import { iro, ji } from '../kiso'

const { text } = iro
const { size } = ji

/**
 * Card kata. Each step is a `density-*` class. Each part takes the step of its
 * nearest density scope. That scope is the card itself when it has a `size`,
 * else the scope around it. The frame owns the outer padding and the radius.
 * A section pads only the inner edge that it shares with the body: the header
 * below it, the footer above it. The footer also owns its action-row gap, one
 * step tighter than `ma.gap`, so actions sit close. A nested card with a
 * `size` is its own scope, so its sections do not follow the outer card.
 */
export const k = {
	frame: ['density-p-[2,3,4]', 'density-rounded-[sm,md,lg]'],
	header: [text.default, 'density-pb-[2,3,4]'],
	footer: ['flex items-center', 'density-pt-[2,3,4]', 'density-gap-[1,2,3]'],
	description: [size.sm, text.muted],
} as const
