/**
 * Narabi nest: the geometry of a tree that indents each level under a mark column,
 * such as a chevron.
 *
 * A kata gives two inputs on the root of the tree. `--nest-mark` is the width
 * of the mark column, and `--nest-gap` is the gap after the mark. A stepped
 * input comes from a `density-set` ramp of `dan`, and a fixed input from an
 * arbitrary property. Each class here reads the two inputs. Thus one level of
 * indent is always the mark plus the gap, and the key of a child starts under
 * the key of its parent. No kata types an indent.
 *
 * Layer: kiso · Concern: nested indent
 */
export const nest = {
	/** The mark column: a chevron, or the spacer in place of a chevron on a row that does not open. */
	mark: 'w-(--nest-mark) flex-none',
	/** The gap after the mark. */
	gap: 'gap-(--nest-gap)',
	/** The start padding of a nested group: one level. */
	indent: 'ps-[calc(var(--nest-mark)+var(--nest-gap))]',
	/**
	 * The start padding of a flat row at the level `--nest-depth`, which the
	 * row sets in its style. A windowed tree has no nested groups, so each row
	 * pads to its level.
	 */
	depth: 'ps-[calc(var(--nest-depth,0)*(var(--nest-mark)+var(--nest-gap)))]',
} as const
