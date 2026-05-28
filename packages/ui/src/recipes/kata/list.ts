import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, omote, sen } from '../kiso'

const { disabled } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border, divider, focus } = sen

export type ListVariant = 'separated' | 'outline' | 'plain' | 'solid'

const rootBase = [flex.col, 'm-0 p-0', 'k-none']

const rootVariant = {
	separated: ['gap-2'],
	outline: ['overflow-hidden', rounded.lg, ...border.default, ...divider.between],
	plain: divider.between,
	solid: ['gap-2'],
} satisfies Record<ListVariant, unknown>

const item = defineRecipe({
	base: ['group/k-item', flex.row, 'gap-2', 'gap-y-0', size.md, text.default, focus.inset],
	variant: {
		separated: ['p-3', ...bg.surface, border.default, rounded.lg],
		outline: ['p-3'],
		plain: ['px-2', 'py-1.5'],
		solid: ['p-3', ...bg.tint, border.default, rounded.lg],
	},
	active: {
		true: ['z-10 relative', ...bg.surface, rounded.md],
		false: '',
	},
	lifted: {
		true: focus.lifted,
		false: '',
	},
	defaults: { variant: 'separated', active: false, lifted: false },
})

export const k = {
	root: (variant: ListVariant = 'separated') => [...rootBase, ...rootVariant[variant]],
	horizontal: 'flex-row',
	item,
	handle: [
		flex.inline,
		'flex-none justify-center',
		'px-3 -mx-3',
		'cursor-grab data-readonly:cursor-default data-disabled:cursor-not-allowed',
		'touch-none select-none',
		...mode(
			'text-zinc-400 not-data-disabled:not-data-readonly:hover:text-zinc-700',
			'dark:text-zinc-500 dark:not-data-disabled:not-data-readonly:hover:text-zinc-200',
		),
		...disabled,
	],
	content: 'flex flex-col flex-1 min-w-0',
	label: 'min-w-0 truncate',
	description: ['min-w-0 truncate', size.sm, text.muted],
} as const
