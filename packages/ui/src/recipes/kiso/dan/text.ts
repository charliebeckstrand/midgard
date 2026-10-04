/**
 * Dan text: the text ramps: a `density-text` class for each role of the text.
 *
 * Layer: kiso · Concern: density ramps
 */

export const text = {
	/** Body text: `text-sm` to `text-lg`. Heading level 5 also takes it. */
	body: 'density-text-[sm,base,lg]',
	/** Small text: captions, labels, and heading level 6. */
	small: 'density-text-[xs,sm,base]',
	/** A title in a block, such as an alert or a timeline item, and heading level 4. */
	title: 'density-text-[base,lg,xl]',
	/** Heading level 3. */
	h3: 'density-text-[lg,xl,2xl]',
	/** Heading level 2. */
	h2: 'density-text-[xl,2xl,3xl]',
	/** Heading level 1 and the value of a stat. */
	h1: 'density-text-[2xl,3xl,4xl]',
	/** The label of a button, a badge, or a query chip, and a Text with a `size`. */
	chip: 'density-text-[xs,sm,base,lg,lg]',
	/** The caption of the combinator button between query chips. */
	combinator: 'density-text-[xs,xs,sm,base,base]',
} as const
