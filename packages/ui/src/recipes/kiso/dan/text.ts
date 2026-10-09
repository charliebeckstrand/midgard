/**
 * Dan text: the text ramps: a `density-text` class for each role of the text.
 *
 * Layer: kiso · Concern: density ramps
 */

/** The body text: `text-xs` to `text-xl`. */
const body = 'density-text-[xs,sm,base,lg,xl]'

export const text = {
	/** Body text. Heading level 5 also takes it. */
	body,
	/** Small text: captions, labels, and heading level 6. It is one step below the body text. */
	small: 'density-text-[2xs,xs,sm,base,lg]',
	/** A title in a block, such as an alert or a timeline item, and heading level 4. */
	title: 'density-text-[sm,base,lg,xl,2xl]',
	/** Heading level 3. */
	h3: 'density-text-[base,lg,xl,2xl,3xl]',
	/** Heading level 2. */
	h2: 'density-text-[lg,xl,2xl,3xl,4xl]',
	/** Heading level 1 and the value of a stat. */
	h1: 'density-text-[xl,2xl,3xl,4xl,5xl]',
	/** The label of a button, a badge, or a query chip, and a Text with a `size`. */
	chip: body,
	/** The caption of the combinator button between query chips. */
	combinator: 'density-text-[xs,xs,sm,base,lg]',
} as const
