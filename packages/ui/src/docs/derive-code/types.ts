/**
 * A recognized UI component: the symbol/function the demo actually renders and
 * where to import it from.
 */
export type ComponentInfo = { name: string; module: string }

/**
 * Component reference → info lookup. The key is the React element `type` value
 * (function, forwardRef object, etc.), matched by identity.
 */
export type ComponentMap = Map<unknown, ComponentInfo>

/**
 * Per-call state threaded through the traversal. Collects imports and list
 * declarations as we discover them, and carries the active component map.
 */
export type Ctx = {
	map: ComponentMap
	imports: Map<string, Set<string>>
	consts: Array<{ name: string; values: string[] }>
	constNames: Set<string>
}
