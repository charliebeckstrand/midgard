import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, narabi, ugoki } from '../kiso'

const { text } = iro
const { size } = ji
const { flex } = narabi
const { css } = ugoki

/**
 * The streaming pulse, applied to the bubble's content while a reply arrives.
 * It rides the content rather than the bubble, so it cannot join the bubble's
 * `streaming` axis. `css.pulse` carries the `motion-safe:` gate every animated
 * fragment in the package carries, so a reader who asked for reduced motion
 * gets the still bubble and keeps the progress cursor as the signal.
 */
export const pulse = css.pulse

const bubble = defineRecipe({
	base: [
		'w-fit max-w-[85%]',
		'px-4 py-3',
		size.md,
		'rounded-2xl',
		'whitespace-pre-wrap break-words',
	],
	role: {
		user: ['bg-blue-600 text-white', 'rounded-br-md'],
		assistant: [
			...mode('bg-zinc-200 text-zinc-950', 'dark:bg-white/10 dark:text-white'),
			'rounded-bl-md',
		],
		system: [size.md, ...text.muted, 'bg-transparent px-0'],
	},
	// The pointer reports the same wait the pulse reports to the eye: the reply
	// is still arriving. `progress` rather than `wait`, because the rest of the
	// page stays live — the composer still takes a draft, and `stop` still
	// aborts. It rides the bubble, so an actions-rail control keeps its own.
	streaming: {
		true: 'cursor-progress',
		false: '',
	},
	defaults: { role: 'assistant', streaming: false },
})

export const k = defineRecipe(
	{
		base: flex.col,
		role: {
			user: 'items-end',
			assistant: 'items-start',
			system: 'items-center',
		},
		slots: {
			timestamp: [size.xs, 'mt-1', ...text.muted],
			actions: ['mt-1', flex.row, 'gap-0.5'],
		},
		defaults: { role: 'assistant' },
	},
	{ bubble },
)

/** Recipe variant props for {@link ChatMessage} — the styling axes its kata exposes (`role`), for consumers composing custom slots. */
export type ChatMessageVariants = VariantProps<typeof k>
/** Recipe variant props for the {@link ChatMessage} bubble — its styling axes (`role`, `streaming`), for consumers composing custom slots. */
export type ChatMessageBubbleVariants = VariantProps<typeof bubble>
