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
 * Resolve a React element `type` to its `ComponentInfo`. `Map<unknown, _>`
 * satisfies this structurally, so callers can pass a plain Map; the default
 * registry uses a tag-based reader instead of a Map.
 */
export type ComponentLookup = {
	get(type: unknown): ComponentInfo | undefined
}

/**
 * Two views over the same set of components: identity-keyed for matching
 * rendered elements, and name-keyed for resolving JSX tag names found inside
 * raw `__code` snippets.
 */
export type ComponentRegistry = {
	byType: ComponentLookup
	byName: Map<string, ComponentInfo>
}

/**
 * Per-call state threaded through the traversal. Carries the registry and
 * accumulates imports as we discover them.
 */
export type Ctx = {
	registry: ComponentRegistry
	imports: Map<string, Set<string>>
}
