import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, narabi } from '../kiso'

const { text } = iro
const { size } = ji
const { flex } = narabi

const bubble = defineRecipe({
	base: [
		'w-fit max-w-[85%]',
		'px-4 py-3',
		size.md,
		'rounded-2xl',
		'whitespace-pre-wrap break-words',
	],
	type: {
		user: ['bg-blue-600 text-white', 'rounded-br-md'],
		assistant: [
			...mode('bg-zinc-200 text-zinc-950', 'dark:bg-white/10 dark:text-white'),
			'rounded-bl-md',
		],
		system: [size.md, ...text.muted, 'bg-transparent px-0'],
	},
	defaults: { type: 'assistant' },
})

export const k = defineRecipe(
	{
		base: flex.col,
		type: {
			user: 'items-end',
			assistant: 'items-start',
			system: 'items-center',
		},
		slots: {
			timestamp: [size.xs, 'mt-1', ...text.muted],
			cursor: [
				'ml-1 inline-block h-[1em] w-[2px] align-[-0.15em]',
				'bg-current',
				'motion-safe:animate-pulse',
			],
			actions: ['mt-1', flex.row, 'gap-0.5'],
		},
		defaults: { type: 'assistant' },
	},
	{ bubble },
)

export type ChatMessageVariants = VariantProps<typeof k>
export type ChatMessageBubbleVariants = VariantProps<typeof bubble>
