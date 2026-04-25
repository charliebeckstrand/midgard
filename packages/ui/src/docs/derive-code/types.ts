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
 * Per-call state threaded through the traversal. Carries the component map
 * and accumulates imports as we discover them.
 */
export type Ctx = {
	map: ComponentMap
	imports: Map<string, Set<string>>
}
