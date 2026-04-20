import { tv, type VariantProps } from 'tailwind-variants'
import { take } from '../take'

export const chatMessage = tv({
	base: 'flex flex-col',
	variants: {
		type: {
			user: 'items-end',
			assistant: 'items-start',
			system: 'items-center',
		},
	},
	defaultVariants: { type: 'assistant' },
})

export const chatMessageBubble = tv({
	base: [
		'w-fit max-w-[85%]',
		'px-4 py-3',
		take.text.md,
		'rounded-2xl',
		'whitespace-pre-wrap break-words',
	],
	variants: {
		type: {
			user: ['bg-blue-600 text-white', 'rounded-br-md'],
			assistant: ['bg-zinc-200 text-zinc-950 dark:bg-white/10 dark:text-white', 'rounded-bl-md'],
			system: [take.text.md, 'text-zinc-500 dark:text-zinc-400', 'bg-transparent px-0'],
		},
	},
	defaultVariants: { type: 'assistant' },
})

export const slots = {
	timestamp: [take.text.xs, 'mt-1 text-zinc-500 dark:text-zinc-400'],
	cursor: [
		'ml-1 inline-block h-[1em] w-[2px] align-[-0.15em]',
		'bg-current',
		'motion-safe:animate-pulse',
	],
	actions: ['mt-1 flex items-center', take.gap.xs],
}

export type ChatMessageVariants = VariantProps<typeof chatMessage>
export type ChatMessageBubbleVariants = VariantProps<typeof chatMessageBubble>
