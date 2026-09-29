/**
 * A recognized component: the symbol/function the demo renders and where to
 * import it from. The `external` flag marks components from outside the
 * documented library, such as demo imports of lucide icons. Their `module` is
 * the bare package specifier, rather than a library module name.
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
 * helper snippets. `packageName` is the documented library's import
 * prefix (`ui`, `grid`, …); `assemble` prepends it to non-external modules.
 */
export type ComponentRegistry = {
	byType: ComponentLookup
	byName: Map<string, ComponentInfo>
	packageName: string
}

/**
 * Build-time source knowledge for one JSX element inside an `Example`:
 *
 * - the authored tag `name`;
 * - each expression-valued prop's source text, less the literals the runtime
 *   recovers on its own;
 * - the render-prop source in `children`, when the element's sole child is a
 *   function;
 * - in `local`, the keys of `props` whose source uses a name that the JSX of
 *   the Example binds, such as the item of a `.map`. That source does not
 *   stand on its own outside the callback. `children` marks such a render-prop
 *   source;
 * - in `map`, for an element that a `.map` callback returns, the source of the
 *   JSX expression that holds the call. `mapLocal` marks a map source that
 *   itself uses a name of an enclosing callback.
 */
export type ElementFact = {
	name: string
	props: Record<string, string>
	local?: string[]
	children?: string
	map?: string
	mapLocal?: true
}

/**
 * Whether an element fact carries anything: a prop source, a render-prop
 * child, or the map it renders from. An empty fact only holds the position of
 * its element among the elements of its tag.
 */
export function hasFacts(element: ElementFact): boolean {
	return (
		Object.keys(element.props).length > 0 ||
		element.children !== undefined ||
		element.map !== undefined
	)
}

/**
 * A declaration statement an emitted snippet can reference: the identifiers it
 * binds (a `useState` tuple lists both names) and its full source text.
 */
export type DeclarationFact = { names: string[]; code: string }

/**
 * The source that the docs plugin attaches to a demo-local helper component,
 * as its `__snippet` static.
 *
 * - `name` is the helper's authored name. A production build minifies the
 *   function's own `name`, so the walk cannot read it there.
 * - `declarations` is the table of the demo file: each top-level statement
 *   that a helper of the file prints, in source order. The helpers of one
 *   file share one table.
 * - `blocks` lists the indices in `declarations` of the helper and of each
 *   declaration it depends on, in ascending order.
 * - `imports` holds each imported name that those blocks use.
 */
export type HelperSnippet = {
	name: string
	declarations: readonly string[]
	blocks: readonly number[]
	imports: Record<string, ImportFact>
}

/**
 * Where an identifier referenced by emitted source imports from. `module` is a
 * library module name (`fieldset`) unless `external` marks it a bare package
 * specifier (`lucide-react`, `react`). `type` marks a type-only import, which
 * the import line writes as `type Name`.
 */
export type ImportFact = { module: string; external?: boolean; type?: boolean }

/**
 * Per-`Example` source knowledge extracted by the docs plugin's pre-transform
 * and injected as the `__facts` prop.
 *
 * - `elements` lists the authored JSX elements in source order, each element
 *   of a tag that has a fact on any of its elements;
 * - `bindings` resolves an identifier to its index in `declarations`,
 *   respecting the Example's scope chain;
 * - `declarations` and `imports` are shared per demo file, pruned to what the
 *   facts can reference.
 */
export type SourceFacts = {
	elements: ElementFact[]
	bindings: Record<string, number>
	declarations: DeclarationFact[]
	imports: Record<string, ImportFact>
}

/**
 * Per-call state threaded through the traversal. Carries the registry and
 * accumulates discovered imports. The `packageName` is the documented library's
 * import prefix. `externalModules` records which import modules are bare
 * package specifiers (`lucide-react`) rather than library module names, so
 * `assemble` skips the prefix for them.
 *
 * When the docs plugin supplied {@link SourceFacts}, `facts` carries them.
 * `factTexts` accumulates every authored source snippet the walk emits (prop
 * expressions, render-prop children), for the preamble closure and import scan.
 * `pulledDecls` carries the declaration indices those snippets reference.
 * `hoisted` collects the helper declarations that print above the JSX, as
 * indices into each file's table, keyed by the table.
 *
 * `rendered` counts the elements of each tag that the walk renders, and
 * `matched` counts those that it has matched to a fact so far in this walk.
 * `localPrints` counts each source that the walk prints with a name that only
 * a callback in the JSX binds.
 */
export type Context = {
	registry: ComponentRegistry
	imports: Map<string, Set<string>>
	externalModules: Set<string>
	packageName: string
	facts?: SourceFacts
	factTexts: string[]
	pulledDecls: Set<number>
	hoisted: Map<readonly string[], Set<number>>
	rendered: Map<string, number>
	matched: Map<string, number>
	localPrints: number
}
