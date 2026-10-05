/**
 * Code kata: serves both inline `<Code>` (the stepped `mark` surface) and the
 * block `<CodeBlock>` (the `block` group, attached as an extra). One kata, two
 * units. The callable `k` is the inline mark recipe. The `block` group holds the
 * chrome of the block: its `base` frame, the `content` and the `fallback` inside
 * it, and the `copy` button.
 */
import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe } from '../../core/recipe'
import { ji, kasane, omote, shaku } from '../kiso'

const { size } = ji
const { rounded } = kasane
const { mark } = shaku
const { rail } = omote

const bg = omote.bg.code

export const k = defineRecipe(
	{
		// The mark takes the step of its nearest density scope, as the text around
		// it does. An explicit `size` makes the mark its own scope.
		base: [...mark.base, ...mark.density],
	},
	{
		/** The classes of {@link CodeBlock}. */
		block: {
			base: ['overflow-hidden flex items-start gap-4 p-4', rounded.lg, bg],
			// While a line overflows, the edge with more code behind it fades, and the
			// content is a tab stop with an inset ring.
			content: ['flex-1', ...rail, size.sm],
			fallback: 'text-zinc-400',
			// Sits in the flex row, not absolutely positioned: `items-start` lands it on
			// the first code line. The sm icon-only button (24px) overhangs the 20px
			// text-sm line by 2px each side; `-my-0.5` cancels the overhang so the row
			// stays one line tall, the glyph centers on the first code line, and a
			// single-line block reads as vertically centered.
			//
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
			copy: [
				'-my-0.5',
				'not-data-copied:text-zinc-400',
				'not-data-copied:not-disabled:not-data-disabled:hover:text-white',
			],
		},
	},
)

/** The size scale of inline {@link Code}: the steps of the mark text and padding. */
export const scale = defineScale(...mark.density)

/** Recipe variant props for inline {@link Code}: the `size` step that the component writes as a density scope. */
export type CodeVariants = { size?: ScaleStep<typeof scale> }
/**
 * Recipe variant props for {@link CodeBlock}. The block chrome carries no
 * variants of its own: it shares the inline `Code` `size` axis. This is
 * therefore an alias of {@link CodeVariants}, kept as a distinct name for the
 * public `CodeBlock` surface.
 */
export type CodeBlockVariants = CodeVariants
