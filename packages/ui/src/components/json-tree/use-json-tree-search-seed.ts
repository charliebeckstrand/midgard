'use client'

import { useEffect, useRef } from 'react'

/**
 * Seeds the search matches of a controlled {@link JsonTree} into its `expanded`
 * set. The root calls it for both variants.
 *
 * @internal
 * @param matchPaths - The paths of the branches that hold a match. Give
 * `undefined` when the tree is uncontrolled or has no search term.
 * @param expand - Adds paths to the controlled set. It reports nothing when
 * each path is already in the set.
 * @remarks
 * A new set of match paths comes with a new `data` value, a new term, or a new
 * `rootKey`. The hook seeds each new set one time. A seeded branch stays
 * collapsible, because a toggle does not make a new set. The hook compares the
 * set with the set of its last seed, so a term that the reader types again
 * after a clear seeds again.
 */
export function useJsonTreeSearchSeed(
	matchPaths: ReadonlySet<string> | undefined,
	expand: (paths: ReadonlySet<string>) => void,
): void {
	const seededRef = useRef<ReadonlySet<string> | undefined>(undefined)

	useEffect(() => {
		if (!matchPaths || seededRef.current === matchPaths) return

		seededRef.current = matchPaths

		expand(matchPaths)
	}, [matchPaths, expand])
}
