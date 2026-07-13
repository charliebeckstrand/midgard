import fs from 'node:fs'
import path from 'node:path'
import { Node, Project, SyntaxKind, type ts } from 'ts-morph'
import type { ComponentApi } from '../types'
import { extractDefaults } from './extract-defaults'
import { extractDocFromText, type LinkResolver } from './extract-doc'
import { extractPassThrough } from './extract-passthrough'
import { extractProjectPropNames } from './extract-project-props'
import { extractProps } from './extract-props'
import {
	type ComponentDecl,
	findComponent,
	getPropsAnnotation,
	readPublicExports,
	unwrapFunctionLike,
} from './find-components'
import { createLinkResolver } from './link-resolver'

/**
 * The two documented roots and the key prefix each barrel takes. Components key
 * by bare directory name; modules namespace their key as `modules-<name>` to
 * match the demo id (`pathToId('demos/modules/<name>')`).
 */
export const DOCUMENTED_ROOTS = [
	['components', ''],
	['modules', 'modules-'],
] as const

/** One documentable barrel: its result key and the `index.ts` that exports it. */
export type Barrel = { key: string; indexPath: string }

/**
 * List every documentable barrel under `<srcDir>/components` and
 * `<srcDir>/modules` in a stable order, keyed to match the demo ids. Missing
 * roots and directories without an `index.ts` are skipped.
 */
export function listBarrels(srcDir: string): Barrel[] {
	const barrels: Barrel[] = []

	for (const [root, prefix] of DOCUMENTED_ROOTS) {
		const rootDir = path.join(srcDir, root)

		if (!fs.existsSync(rootDir)) continue

		for (const dir of fs.readdirSync(rootDir, { withFileTypes: true })) {
			if (!dir.isDirectory()) continue

			const indexPath = path.join(rootDir, dir.name, 'index.ts')

			if (fs.existsSync(indexPath)) barrels.push({ key: `${prefix}${dir.name}`, indexPath })
		}
	}

	return barrels
}

/**
 * Extract the API reference for a single barrel from an already-open project.
 * Returns `null` when the index is absent from the project or exports nothing
 * documentable, so the caller can drop the key. The type checker and link
 * resolver are passed in so a batch shares one checker pass.
 */
export function extractBarrel(
	project: Project,
	checker: ts.TypeChecker,
	resolveLink: LinkResolver,
	indexPath: string,
): ComponentApi[] | null {
	const indexFile = project.getSourceFile(indexPath)

	if (!indexFile) return null

	const names = readPublicExports(indexFile)

	if (names.length === 0) return null

	const apis: ComponentApi[] = []

	for (const name of names) {
		const decl = findComponent(name, indexFile)

		if (!decl) {
			apis.push({ name, props: [] })

			continue
		}

		apis.push(buildComponent(decl, checker, resolveLink))
	}

	return apis.length > 0 ? apis : null
}

/**
 * Extract API reference data for every component under `<srcDir>/components`
 * and `<srcDir>/modules`, keyed by directory name (modules as `modules-<name>`).
 * One ts-morph Project covers the whole package; the type checker resolves
 * cross-file references in a single pass. This is the one-shot form; the docs
 * plugin drives incremental, disk-cached extraction through
 * {@link createApiExtractor}.
 */
export function buildApi(srcDir: string): Record<string, ComponentApi[]> {
	if (!fs.existsSync(path.join(srcDir, 'components'))) return {}

	const project = openProject(srcDir)

	const checker = project.getTypeChecker().compilerObject

	const resolveLink = createLinkResolver(project)

	const result: Record<string, ComponentApi[]> = {}

	for (const { key, indexPath } of listBarrels(srcDir)) {
		const apis = extractBarrel(project, checker, resolveLink, indexPath)

		if (apis) result[key] = apis
	}

	return result
}

/**
 * Open a ts-morph Project rooted at the package's `tsconfig.json` (one level
 * above `srcDir`), scoped to the documented barrels and the source files they
 * reach. `skipAddingFilesFromTsConfig` drops the tsconfig's whole `include`
 * glob (~1.8k files, most of them irrelevant `node_modules` typings the checker
 * pulls in lazily anyway); adding only the barrel indices and resolving their
 * dependencies pulls in exactly the project source the extractor and the
 * package-wide link index read, cutting the checker's eager work roughly in
 * half with byte-identical output.
 */
export function openProject(srcDir: string): Project {
	const project = new Project({
		tsConfigFilePath: path.resolve(srcDir, '..', 'tsconfig.json'),
		skipAddingFilesFromTsConfig: true,
	})

	project.addSourceFilesAtPaths(listBarrels(srcDir).map((b) => b.indexPath))

	project.resolveSourceFileDependencies()

	return project
}

/** Assemble the `ComponentApi` for one component from the focused extractors. */
function buildComponent(
	decl: ComponentDecl,
	checker: ts.TypeChecker,
	resolveLink: LinkResolver,
): ComponentApi {
	const inner = unwrapFunctionLike(decl.callable) ?? decl.callable

	const callable = inner.compilerNode as ts.SignatureDeclaration

	const annotation = getPropsAnnotation(decl.callable)?.compilerNode

	const propsType = resolvePropsType(callable, checker)

	const passThrough = annotation ? extractPassThrough(annotation, checker) : []

	const projectNames = annotation ? extractProjectPropNames(annotation, checker) : null

	const defaults = extractDefaults(callable)

	const props = propsType
		? extractProps(callable, propsType, projectNames, defaults, checker, resolveLink)
		: []

	const api: ComponentApi = { name: decl.name, props }

	const summary = componentDescription(decl)

	if (summary) {
		const { description, links } = extractDocFromText(summary, resolveLink)

		if (description) api.description = description

		if (links) api.links = links
	}

	if (passThrough.length > 0) api.passThrough = passThrough

	return api
}

/**
 * Component-level TSDoc. `export function` components carry the comment on the
 * declaration itself; `forwardRef` / `memo` wrappers document at the exported
 * variable statement (`decl.callable` is the unwrapped inner function), so walk
 * up to it when the callable isn't a function declaration.
 */
function componentDescription(decl: ComponentDecl): string | undefined {
	const node = decl.callable

	const host = Node.isFunctionDeclaration(node)
		? node
		: (node.getFirstAncestorByKind(SyntaxKind.VariableStatement) ?? node)

	const text = host.getJsDocs().at(-1)?.getDescription().trim()

	return text ? text : undefined
}

function resolvePropsType(callable: ts.Node, checker: ts.TypeChecker): ts.Type | null {
	const type = checker.getTypeAtLocation(callable)

	const sig = type.getCallSignatures()[0]

	const param = sig?.parameters[0]

	if (!param) return null

	return checker.getTypeOfSymbolAtLocation(param, callable)
}
