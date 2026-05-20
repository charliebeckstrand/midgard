import { defineRecipe, ji, type VariantPropsOf } from '../../core/recipe'

export const k = defineRecipe({
	base: 'flex flex-col',
	type: {
		user: 'items-end',
		assistant: 'items-start',
		system: 'items-center',
	},
	slots: {
		timestamp: [ji.size.xs, 'mt-1 text-zinc-500 dark:text-zinc-400'],
		cursor: [
			'ml-1 inline-block h-[1em] w-[2px] align-[-0.15em]',
			'bg-current',
			'motion-safe:animate-pulse',
		],
		actions: ['mt-1 flex items-center', 'gap-0.5'],
	},
	defaults: { type: 'assistant' },
})

export const bubble = defineRecipe({
	base: [
		'w-fit max-w-[85%]',
		'px-4 py-3',
		ji.size.md,
		'rounded-2xl',
		'whitespace-pre-wrap break-words',
	],
	type: {
		user: ['bg-blue-600 text-white', 'rounded-br-md'],
		assistant: ['bg-zinc-200 text-zinc-950 dark:bg-white/10 dark:text-white', 'rounded-bl-md'],
		system: [ji.size.md, 'text-zinc-500 dark:text-zinc-400', 'bg-transparent px-0'],
	},
	defaults: { type: 'assistant' },
})

export type ChatMessageVariants = VariantPropsOf<typeof k>
export type ChatMessageBubbleVariants = VariantPropsOf<typeof bubble>
