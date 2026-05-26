import { defineRecipe } from '../../core/recipe'
import { iro, ji, sen } from '../kiso'

const root = defineRecipe({
	base: ji.sm,
	orientation: {
		horizontal: 'grid grid-cols-1 sm:grid-cols-[min(50%,--spacing(56))_auto]',
		vertical: 'flex flex-col',
	},
	defaults: { orientation: 'horizontal' },
})

const term = defineRecipe({
	base: [iro.text.muted, 'font-medium'],
	orientation: {
		horizontal: [
			'col-start-1',
			'border-t first:border-none',
			...sen.borderSubtleColor,
			'sm:py-2 pt-2 pr-2',
		],
		vertical: 'pt-4 first:pt-0',
	},
	defaults: { orientation: 'horizontal' },
})

const details = defineRecipe({
	base: iro.text.default,
	orientation: {
		horizontal: [...sen.borderSubtleColor, 'sm:border-t sm:py-2 pb-2', 'sm:nth-2:border-none'],
		vertical: 'pt-1',
	},
	defaults: { orientation: 'horizontal' },
})

export const k = {
	root,
	term,
	details,
}
