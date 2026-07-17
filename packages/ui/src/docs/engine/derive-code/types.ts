/**
 * A recognized component: the symbol/function the demo renders and where to
 * import it from. `external` marks components from outside the documented
 * library (demo imports like lucide icons); their `module` is the bare package
 * specifier rather than a library module name.
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
 * raw `__code` snippets. `packageName` is the documented library's import
 * prefix (`ui`, `grid`, …); `assemble` prepends it to non-external modules.
 */
export type ComponentRegistry = {
	byType: ComponentLookup
	byName: Map<string, ComponentInfo>
	packageName: string
}

/**
 * Build-time source knowledge for one JSX element inside an `Example`: the
 * authored tag `name`, each expression-valued prop's source text (literals the
 * runtime recovers on its own are omitted), and — when the element's sole
 * child is a function — the render-prop source in `children`.
 */
export type ElementFact = { name: string; props: Record<string, string>; children?: string }

/**
 * A declaration statement an emitted snippet may reference: the identifiers it
 * binds (a `useState` tuple lists both names) and its full source text.
 */
export type DeclarationFact = { names: string[]; code: string }

/**
 * Where an identifier referenced by emitted source imports from. `module` is a
 * library module name (`fieldset`) unless `external` marks it a bare package
 * specifier (`lucide-react`, `react`).
 */
export type ImportFact = { module: string; external?: boolean }

/**
 * Per-`Example` source knowledge extracted by the docs plugin's pre-transform
 * and injected as the `__facts` prop. `elements` lists the authored JSX
 * elements in source order; `bindings` resolves an identifier to its index in
 * `declarations`, respecting the Example's scope chain; `declarations` and
 * `imports` are shared per demo file, pruned to what the facts can reference.
 */
export type SourceFacts = {
	elements: ElementFact[]
	bindings: Record<string, number>
	declarations: DeclarationFact[]
	imports: Record<string, ImportFact>
}

/**
 * Per-call state threaded through the traversal. Carries the registry and
 * accumulates discovered imports. `packageName` is the documented library's
 * import prefix; `externalModules` records which import modules are bare
 * package specifiers (`lucide-react`) rather than library module names, so
 * `assemble` skips the prefix for them.
 *
 * When the docs plugin supplied {@link SourceFacts}, `facts` carries them;
 * `factTexts` accumulates every authored source snippet the walk emits (prop
 * expressions, render-prop children) for the preamble closure and import scan,
 * and `pulledDecls` the declaration indices those snippets reference.
 */
export type Context = {
	registry: ComponentRegistry
	imports: Map<string, Set<string>>
	externalModules: Set<string>
	packageName: string
	facts?: SourceFacts
	factTexts: string[]
	pulledDecls: Set<number>
}
