'use client'

const regions = new Set<HTMLElement>()

/**
 * Registers a chrome region. A modal surface seals the page behind
 * it. A registered region is exempt, keeping its tab stop, its place in the
 * accessibility tree, and its pointer events. An `Overlay` with `coverChrome`
 * does not read the registry, so it seals the region too.
 *
 * Registration is by node rather than by selector, so nothing has to name the
 * region and nothing has to agree on a marker attribute.
 *
 * @returns An unregister function that removes the region.
 * @see {@link chromeRegions}
 */
export function registerChrome(node: HTMLElement): () => void {
	regions.add(node)

	return () => {
		regions.delete(node)
	}
}

/**
 * The regions registered right now, as the live element list a focus manager
 * counts as part of the open surface. Each mounted `Chrome` registers its
 * region.
 *
 * The list is read when a surface marks the page, so a region that mounts later
 * is not exempt from a surface already up. Chrome that outlives surfaces, which
 * is what this is for, always registers first.
 */
export function chromeRegions(): HTMLElement[] {
	return [...regions]
}
