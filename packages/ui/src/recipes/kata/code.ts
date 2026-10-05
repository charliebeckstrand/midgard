/**
 * Code kata: serves both inline `<Code>` (the stepped `mark` surface) and the
 * block `<CodeBlock>` (the `block` group, attached as an extra). One kata, two
 * units. The callable `k` is the inline mark recipe. The `block` group holds the
 * chrome of the block: its `base` frame, the `content` and the `fallback` inside
 * it, and the `copy` button. The chrome takes the step of the nearest density
 * scope. At `md` the frame is `p-4` with `gap-4`, and the code is `text-sm`.
 */
import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe } from '../../core/recipe'
import { kasane, narabi, omote, shaku } from '../kiso'
import { dan } from '../kiso/dan'

const { rounded } = kasane
const { mark } = shaku
const { rail } = omote
const { flex } = narabi

const bg = omote.bg.code

/**
 * The text of the block code: the text ramp of the inline mark, `text-sm` at
 * `md`. The line box of the copy button takes it too, so that box is one code
 * line tall at each step.
 */
const text = dan.text.small

export const k = defineRecipe(
	{
		// The mark takes the step of its nearest density scope, as the text around
		// it does. An explicit `size` makes the mark its own scope.
		base: [...mark.base, ...mark.density],
	},
	{
		/** The classes of {@link CodeBlock}. */
		block: {
			// The padding and the gap have the same value at each step, as `p-4` and
			// `gap-4` do at `md`. The ramps are the padding of an alert and the inline
			// gap of a timeline item, because a ramp has one name for one list.
			base: [
				'overflow-hidden flex items-start',
				dan.space.alert,
				dan.gap.timeline.x,
				rounded.lg,
				bg,
			],
			// While a line overflows, the edge with more code behind it fades, and the
			// content is a tab stop with an inset ring.
			content: ['flex-1', ...rail, text],
			fallback: 'text-zinc-400',
			copy: {
				// The copy button sits in the flex row, not in an absolute position. Its
				// line box is one code line tall, and `items-start` puts the box on the
				// first code line. The button centers on the box and overhangs it into
				// the padding of the block. At `md` the sm button (24px) overhangs the
				// 20px `text-sm` line by 2px on each side. Thus the row stays one line
				// tall, the glyph centers on the first code line, and a block of one line
				// is vertically centered. The close button of an alert uses the same
				// line box.
				line: [flex.row, 'h-lh', text],
				// The canvas is the fixed-dark shiki theme, so the bare button's light-mode
				// foreground (zinc-500 rest, zinc-950 hover) is too dark to read here; force
				// its dark-mode values in light mode too. Gate on `not-data-copied` so the
				// override paints only the rest (clipboard) state and yields to the copied
				// state's `color="green"` palette: CopyButton writes `data-copied` only while
				// the copied state holds. Unscoped, the unprefixed `text-zinc-400` clobbers
				// green's light rest shade (dark is spared only because its green is
				// `dark:`-prefixed, a separate tailwind-merge group).
				//
				// The hover rule repeats the `not-disabled:not-data-disabled` gates of the
				// bare hover. It is then more specific than the bare hover, so it wins over
				// it. With the copied gate only, the two rules have the same specificity,
				// and Tailwind writes the bare hover after it.
				button: [
					'not-data-copied:text-zinc-400',
					'not-data-copied:not-disabled:not-data-disabled:hover:text-white',
				],
			},
		},
	},
)

/** The size scale of inline {@link Code}: the steps of the mark text and padding. */
export const scale = defineScale(...mark.density)

/** Recipe variant props for inline {@link Code}: the `size` step that the component writes as a density scope. */
export type CodeVariants = { size?: ScaleStep<typeof scale> }
/**
 * Recipe variant props for {@link CodeBlock}: the `size` step that the block
 * writes as a density scope. The block chrome has no other variants. Its code
 * takes the text ramp of the inline mark, so it has the steps of the inline
 * `Code` `size` axis. This is therefore an alias of {@link CodeVariants}, kept
 * as a distinct name for the public `CodeBlock` surface.
 */
export type CodeBlockVariants = CodeVariants
