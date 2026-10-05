import { useState } from 'react'
import type { JsonValue } from 'ui/json-tree'

// The path of the root branch of the tree.
const ROOT = '$'

/**
 * The state of a tree that shows the last click. The tree shows an empty
 * object before the first click, and each click opens its root again.
 */
export function useClickInspector<T extends JsonValue>() {
	const [picked, setPicked] = useState<T | null>(null)

	const [expanded, setExpanded] = useState(() => new Set([ROOT]))

	const pick = (value: T) => {
		setPicked(value)

		setExpanded((current) => (current.has(ROOT) ? current : new Set(current).add(ROOT)))
	}

	return { pick, tree: { data: picked ?? {}, expanded, onExpandedChange: setExpanded } }
}
