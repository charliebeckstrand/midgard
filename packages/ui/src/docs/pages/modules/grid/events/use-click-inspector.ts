import { useState } from 'react'
import type { JsonValue } from 'ui/json-tree'

// The path of the root branch of the tree.
const ROOT = '$'

/**
 * The last click, and the state of a tree that shows it. `picked` is `null`
 * before the first click. The root of the tree starts closed, and each click
 * opens it.
 */
export function useClickInspector<T extends JsonValue>() {
	const [picked, setPicked] = useState<T | null>(null)

	const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

	const pick = (value: T) => {
		setPicked(value)

		setExpanded((prev) => (prev.has(ROOT) ? prev : new Set(prev).add(ROOT)))
	}

	return { picked, pick, expanded, onExpandedChange: setExpanded }
}
