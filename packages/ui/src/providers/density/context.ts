import type { InnerStep } from '../../core/density'
import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageDescriptor } from '../../primitives/intl/types'

/**
 * A friendly density level: the stored density setting, and the `density` prop
 * of `<DensityProvider>`. `'snug'` is the baseline.
 */
export type DensityLevel = 'loose' | 'snug' | 'compact'

const levelMessages = defineMessages({
	loose: {
		id: 'ui.settings.density.loose',
		defaultMessage: 'Loose',
		description: 'The density with the most space between items.',
	},
	snug: {
		id: 'ui.settings.density.snug',
		defaultMessage: 'Snug',
		description: 'The usual density.',
	},
	compact: {
		id: 'ui.settings.density.compact',
		defaultMessage: 'Compact',
		description: 'The density with the least space between items.',
	},
})

/**
 * The density levels, for a density picker, ordered loose → compact. Each
 * level has an English `label`, and a `message` that names the level in the
 * language of the reader.
 *
 * @see {@link levelToStep} for the step of each level.
 */
export const densityLevels: { label: string; message: MessageDescriptor; value: DensityLevel }[] = [
	{ label: 'Loose', message: levelMessages.loose, value: 'loose' },
	{ label: 'Snug', message: levelMessages.snug, value: 'snug' },
	{ label: 'Compact', message: levelMessages.compact, value: 'compact' },
]

/**
 * The density step of each friendly level: `loose` → `lg`, `snug` → `md`, and
 * `compact` → `sm`. The `md` step applies where no scope and no root step set
 * one.
 */
export const levelToStep = {
	loose: 'lg',
	snug: 'md',
	compact: 'sm',
} satisfies Record<DensityLevel, InnerStep>
