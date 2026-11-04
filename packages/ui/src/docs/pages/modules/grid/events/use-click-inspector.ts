import { useState } from 'react'
import type { JsonValue } from 'ui/json-tree'

/**
 * The state of a tree that shows the last click. The tree shows an empty
 * object before the first click. The root starts closed, and a click does not
 * open or close it.
 */
export function useClickInspector<T extends JsonValue>() {
	const [picked, setPicked] = useState<T | null>(null)

	return { pick: setPicked, tree: { data: picked ?? {}, defaultExpandDepth: 0 } }
}
