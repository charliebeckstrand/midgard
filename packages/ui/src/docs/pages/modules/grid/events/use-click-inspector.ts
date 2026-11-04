import { useState } from 'react'
import type { JsonValue } from 'ui/json-tree'

// The path of the root branch of the tree.
const ROOT = '$'

/**
 * The state of a tree that shows the last click. The tree shows an empty
 * object before the first click, and its root starts closed. Each click opens
 * the root.
 */
export function useClickInspector<T extends JsonValue>() {
	const [picked, setPicked] = useState<T | null>(null)

	const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

	const pick = (value: T) => {
		setPicked(value)

		setExpanded((prev) => (prev.has(ROOT) ? prev : new Set(prev).add(ROOT)))
	}

	return { pick, tree: { data: picked ?? {}, expanded, onExpandedChange: setExpanded } }
}
