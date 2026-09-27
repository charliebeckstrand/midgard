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
	frame: [
		'density-sm:p-2 density-md:p-3 density-lg:p-4',
		'density-sm:rounded-sm density-md:rounded-md density-lg:rounded-lg',
	],
	header: [text.default, 'density-sm:pb-2 density-md:pb-3 density-lg:pb-4'],
	footer: [
		'flex items-center',
		'density-sm:pt-2 density-md:pt-3 density-lg:pt-4',
		'density-sm:gap-1 density-md:gap-2 density-lg:gap-3',
	],
	description: [size.sm, text.muted],
} as const
