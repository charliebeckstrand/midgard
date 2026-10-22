/**
 * Flex kata: the unit of `<Flex>` and `<Stack>`. The `base` slot is the flex
 * box, with the `wrap`, `full`, and `flex` axes and the responsive
 * `direction`, `align`, `gap`, and `justify` axes. The gap takes the step of
 * the nearest density scope.
 */
import { defineKata } from '../../core/recipe'
import { ma, narabi } from '../kiso'

const { direction, align, justify } = narabi.flex

/** Main-axis orientation: `row`, `col`, or their reversed variants. */
export type FlexDirection = keyof typeof direction

/** Cross-axis alignment (`align-items`): start, center, end, stretch, baseline. */
export type FlexAlign = keyof typeof align

/** Main-axis distribution (`justify-content`): start, center, end, between, around, evenly. */
export type FlexJustify = keyof typeof justify

export const k = defineKata({
	base: 'flex',
	wrap: { true: 'flex-wrap', false: '' },
	full: { true: 'w-full', false: '' },
	flex: { '1': 'flex-1', auto: 'flex-auto' },
	responsive: { direction, align, gap: ma.gap, justify },
	defaults: { direction: 'row' },
})
