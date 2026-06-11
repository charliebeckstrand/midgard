/**
 * A recognized UI component: the symbol/function the demo renders and
 * where to import it from. `external` marks components from outside the ui
 * package (demo imports like lucide icons); their `module` is the bare
 * package specifier rather than a ui module name.
 */
export type ComponentInfo = { name: string; module: string; external?: boolean }

/**
 * Resolve a React element `type` to its `ComponentInfo`. `Map<unknown, _>`
 * satisfies this structurally, but the default registry uses a tag-based
 * reader rather than a Map.
 */
type ComponentLookup = {
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
 * accumulates discovered imports. `externalModules` records which import
 * modules are bare package specifiers (`lucide-react`) rather than ui module
 * names; `assemble` skips the `ui/` prefix for them.
 */
export type Context = {
	registry: ComponentRegistry
	imports: Map<string, Set<string>>
	externalModules: Set<string>
}
