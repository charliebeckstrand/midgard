import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, ma, narabi, omote, sen } from '../kiso'

const { disabled } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { p } = ma
const { flex } = narabi
const { bg } = omote
const { border, divider, focus } = sen

export type ListVariant = 'separated' | 'outline' | 'plain' | 'solid'

const root = defineRecipe({
	base: [flex.col, 'm-0 p-0'],
	variant: {
		separated: ['gap-2'],
		outline: ['overflow-hidden', rounded.lg, ...border.default, ...divider.between],
		plain: divider.between,
		solid: ['gap-2'],
	},
	orientation: {
		horizontal: 'flex-row',
		vertical: '',
	},
	defaults: { variant: 'separated', orientation: 'vertical' },
})

const item = defineRecipe({
	base: ['group', flex.row, 'gap-2', 'gap-y-0', size.md, text.default, focus.inset],
	variant: {
		separated: [...bg.surface, border.default, rounded.lg],
		outline: '',
		plain: '',
		solid: [...bg.tint, border.default, rounded.lg],
	},
	// Row padding tracks the density axis, but the shape differs per variant
	// (card-like variants use the uniform ma.p scale; `plain` uses a tighter
	// px/py ratio), so it's applied through the variant × density compound
	// rules below rather than this axis — numeric p / px utilities don't merge.
	density: { sm: '', md: '', lg: '' },
	active: {
		true: ['z-10 relative', ...bg.surface, rounded.md],
		false: '',
	},
	lifted: {
		true: focus.lifted,
		false: '',
	},
	compound: [
		// Card-like variants share the uniform ma.p scale.
		{ variant: 'separated', density: 'sm', class: p.sm },
		{ variant: 'separated', density: 'md', class: p.md },
		{ variant: 'separated', density: 'lg', class: p.lg },
		{ variant: 'outline', density: 'sm', class: p.sm },
		{ variant: 'outline', density: 'md', class: p.md },
		{ variant: 'outline', density: 'lg', class: p.lg },
		{ variant: 'solid', density: 'sm', class: p.sm },
		{ variant: 'solid', density: 'md', class: p.md },
		{ variant: 'solid', density: 'lg', class: p.lg },
		// `plain` keeps a tighter px/py ratio per step.
		{ variant: 'plain', density: 'sm', class: 'px-1.5 py-1' },
		{ variant: 'plain', density: 'md', class: 'px-2 py-1.5' },
		{ variant: 'plain', density: 'lg', class: 'px-2.5 py-2' },
	],
	defaults: { variant: 'separated', density: 'md', active: false, lifted: false },
})

export const k = {
	root,
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
