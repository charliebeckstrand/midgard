import { defineRecipe } from '../../core/recipe'
import { iro, ji, narabi, sen } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex } = narabi
const { border } = sen

const root = defineRecipe({
	base: size.sm,
	orientation: {
		horizontal: 'grid grid-cols-1 sm:grid-cols-[min(50%,--spacing(56))_auto]',
		vertical: flex.col,
	},
	defaults: { orientation: 'horizontal' },
})

const term = defineRecipe({
	base: [text.muted, weight.medium],
	orientation: {
		horizontal: [
			'col-start-1',
			'border-t first:border-none',
			...border.subtleColor,
			'sm:py-2 pt-2 pr-2',
		],
		vertical: 'pt-4 first:pt-0',
	},
	defaults: { orientation: 'horizontal' },
})

const details = defineRecipe({
	base: text.default,
	orientation: {
		horizontal: [...border.subtleColor, 'sm:border-t sm:py-2 pb-2', 'sm:nth-2:border-none'],
		vertical: 'pt-1',
	},
	defaults: { orientation: 'horizontal' },
})

export const k = {
	root,
	term,
	details,
} as const
