// @vitest-environment node
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { defaultRegistry } from '../../docs/engine/derive-code'
import { snippetHasImports } from '../../docs/engine/derive-code/internals'
import { collectHelpers } from '../../docs/engine/plugins/collect-helpers'
import { namedImportsOf, parseSource } from '../../docs/engine/plugins/ts-source'
import { srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// A corpus gate on the docs site's "Show code" block.
//
// `Example` shows the block when `deriveCode` would return one, which happens
// when the walk registers at least one import. Two mechanisms feed it, and both
// broke at once in 2026-09. The runtime probe read only the children tree.
// `collectHelpers` decided by a text scan which declaration is a helper worth a
// `__code` snippet. Around 90 Examples across 34 demo pages silently showed no
// block.
//
// Nothing failed, because the suite runs `docsPlugin({ vitest: true })`, which
// drops the `pre` transform. No test had ever seen a demo module carrying
// `__code`, so the whole build-time half went unread.
//
// This test reads it, against the real demo tree, from source. It calls the
// same `collectHelpers` the plugin calls, and asks the same
// `snippetHasImports` the probe asks. A helper the JSX test stops recognizing
// therefore fails here, named by its Example.
//
// The runtime half is not this test's to hold. `classifyElement` states the
// walk's cases once for the renderer and the probe together, and
// `has-derivable-code.test.tsx` asserts the two agree at the seam.
//
// Source, not a rendered tree, so two approximations stand. A tag resolves by
// name, which a demo-local component sharing a library export's name would pass
// on. An identifier child (`{dropdown}`) resolves against every declaration of
// that name in its file, rather than through the scope chain. Both err toward
// passing, and neither reaches the shape this test exists to catch.

const DEMOS = join(srcDir, 'docs', 'demos')

const EXAMPLE_TAG = 'Example'

// Examples deliberately shown without a code block, keyed `<path>#<title>`.
// Keep this empty; add an entry with a reason only when a demo has nothing to
// show.
const ALLOW_NO_CODE = new Set<string>([])

/**
 * One parsed demo: the helpers the docs plugin attaches `__code` to, the sibling
 * demo behind each imported name, and every named declaration — the targets an
 * identifier child resolves to.
 */
type Demo = {
	file: ts.SourceFile
	helpers: Map<string, string>
	imports: Map<string, { file: string; name: string }>
	declarations: Map<string, ts.Node[]>
}

/** The demo file a relative specifier points at, or undefined for anything else. */
function resolveDemo(from: string, specifier: string): string | undefined {
	const base = join(dirname(from), specifier)

	return [`${base}.tsx`, join(base, 'index.tsx')].find((candidate) => existsSync(candidate))
}

function parseDemo(path: string, source: string): Demo {
	const file = parseSource(path, source)

	const helpers = new Map(collectHelpers(source, file).map(({ name, code }) => [name, code]))

	const imports = new Map<string, { file: string; name: string }>()

	for (const stmt of file.statements) {
		const imported = namedImportsOf(stmt)

		if (!imported?.specifier.startsWith('.')) continue

		const target = resolveDemo(path, imported.specifier)

		if (target === undefined) continue

		for (const spec of imported.elements) {
			if (spec.isTypeOnly) continue

			imports.set(spec.name.text, { file: target, name: (spec.propertyName ?? spec.name).text })
		}
	}

	const declarations = new Map<string, ts.Node[]>()

	const record = (name: string, node: ts.Node) => {
		declarations.set(name, [...(declarations.get(name) ?? []), node])
	}

	const visit = (node: ts.Node) => {
		if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
			record(node.name.text, node.initializer)
		}

		if (ts.isFunctionDeclaration(node) && node.name) record(node.name.text, node)

		node.forEachChild(visit)
	}

	visit(file)

	return { file, helpers, imports, declarations }
}

type Names = { tags: Set<string>; idents: Set<string> }

/**
 * The JSX tags a subtree renders, and the identifiers its expression children
 * name. Attributes stay out, and so does an element's own tag identifier: the
 * walk reads a prop only from an element it already recognized, which ends the
 * search on its own.
 */
function collectNames(node: ts.Node, into: Names): void {
	if (ts.isJsxElement(node)) {
		into.tags.add(node.openingElement.tagName.getText())

		for (const child of node.children) collectNames(child, into)

		return
	}

	if (ts.isJsxSelfClosingElement(node)) {
		into.tags.add(node.tagName.getText())

		return
	}

	if (ts.isIdentifier(node)) into.idents.add(node.text)

	node.forEachChild((child) => collectNames(child, into))
}

/** The `__code` the plugin attaches to `tag`, following an import to a sibling demo. */
function helperCode(tag: string, demo: Demo, demos: Map<string, Demo>): string | undefined {
	const own = demo.helpers.get(tag)

	if (own !== undefined) return own

	const imported = demo.imports.get(tag)

	return imported && demos.get(imported.file)?.helpers.get(imported.name)
}

/**
 * Whether anything the Example renders registers an import. A tag passes as a
 * component the docs document, or as a helper whose snippet carries one.
 *
 * A tag that is neither names a demo-local component the walk cannot see
 * inside, so the search never follows its declaration. That is what makes a
 * dropped `__code` fail here, rather than pass through the component's body.
 */
function reachesAnImport(example: ts.JsxElement, demo: Demo, demos: Map<string, Demo>): boolean {
	const seen = new Set<string>()

	const pending: ts.Node[] = [...example.children]

	while (pending.length > 0) {
		const node = pending.pop()

		if (node === undefined) continue

		const names: Names = { tags: new Set(), idents: new Set() }

		collectNames(node, names)

		for (const tag of names.tags) {
			if (defaultRegistry.byName.has(tag)) return true

			const code = helperCode(tag, demo, demos)

			if (code !== undefined && snippetHasImports(code, defaultRegistry)) return true
		}

		// An identifier child renders whatever its binding holds, so the tree the
		// walk sees includes it. Follow it; a tag, never.
		for (const name of names.idents) {
			if (seen.has(name)) continue

			seen.add(name)

			for (const declaration of demo.declarations.get(name) ?? []) pending.push(declaration)
		}
	}

	return false
}

function findExamples(file: ts.SourceFile): ts.JsxElement[] {
	const found: ts.JsxElement[] = []

	const visit = (node: ts.Node) => {
		if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === EXAMPLE_TAG) {
			found.push(node)
		}

		node.forEachChild(visit)
	}

	visit(file)

	return found
}

function attribute(example: ts.JsxElement, name: string): ts.JsxAttribute | undefined {
	return example.openingElement.attributes.properties.find(
		(prop): prop is ts.JsxAttribute => ts.isJsxAttribute(prop) && prop.name.getText() === name,
	)
}

/** The Example's `title`, or its line, for a key an edit elsewhere leaves alone. */
function labelOf(example: ts.JsxElement, file: ts.SourceFile): string {
	const title = attribute(example, 'title')?.initializer

	// Only a string literal reads as a stable key; an expression title falls back
	// to the line.
	if (title && ts.isStringLiteral(title)) return title.text

	return `line ${file.getLineAndCharacterOfPosition(example.getStart()).line + 1}`
}

describe('demo code blocks', () => {
	const demos = new Map<string, Demo>()

	walkSource(DEMOS, (path, source) => {
		if (path.endsWith('.tsx')) demos.set(path, parseDemo(path, source))
	})

	it('every Example reaches a component the docs recognize', () => {
		expect(demos.size, 'no demo sources found').toBeGreaterThan(0)

		const violations: string[] = []

		let scanned = 0

		for (const [path, demo] of demos) {
			for (const example of findExamples(demo.file)) {
				// An explicit `code` override shows the block whatever the walk finds.
				if (attribute(example, 'code')) continue

				scanned++

				const key = `${srcRelative(path)}#${labelOf(example, demo.file)}`

				if (ALLOW_NO_CODE.has(key)) continue

				if (!reachesAnImport(example, demo, demos)) violations.push(key)
			}
		}

		expect(scanned, 'no Examples found; the scan matched nothing').toBeGreaterThan(0)

		expect(
			violations,
			`<Example> with no code block — its children reach no component the docs recognize, so the "Show code" trigger stays hidden. Render a documented component, pass an explicit \`code\`, or allowlist it with a reason:\n${violations.join('\n')}`,
		).toEqual([])
	})
})
