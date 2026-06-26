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
 * Extract API reference data for every component under `<srcDir>/components`
 * and `<srcDir>/modules`, keyed by directory name (modules as `modules-<name>`).
 * One ts-morph Project covers the whole package; the type checker resolves
 * cross-file references in a single pass.
 */
export function buildApi(srcDir: string): Record<string, ComponentApi[]> {
	const componentsDir = path.join(srcDir, 'components')

	if (!fs.existsSync(componentsDir)) return {}

	const project = openProject(srcDir)

	const checker = project.getTypeChecker().compilerObject

	const resolveLink = createLinkResolver(project)

	const result: Record<string, ComponentApi[]> = {}

	// Components key by directory name; modules namespace their key as
	// `modules-<name>` to match the demo id (`pathToId('demos/modules/<name>')`).
	for (const [root, prefix] of [
		['components', ''],
		['modules', 'modules-'],
	] as const) {
		const rootDir = path.join(srcDir, root)

		if (!fs.existsSync(rootDir)) continue

		for (const dir of fs.readdirSync(rootDir, { withFileTypes: true })) {
			if (!dir.isDirectory()) continue

			const indexPath = path.join(rootDir, dir.name, 'index.ts')

			const indexFile = project.getSourceFile(indexPath)

			if (!indexFile) continue

			const names = readPublicExports(indexFile)

			if (names.length === 0) continue

			const apis: ComponentApi[] = []

			for (const name of names) {
				const decl = findComponent(name, indexFile)

				if (!decl) {
					apis.push({ name, props: [] })

					continue
				}

				apis.push(buildComponent(decl, checker, resolveLink))
			}

			if (apis.length > 0) result[`${prefix}${dir.name}`] = apis
		}
	}

	return result
}

/**
 * Open a ts-morph Project rooted at the package's `tsconfig.json` (one level
 * above `srcDir`). That config excludes `src/docs`.
 */
function openProject(srcDir: string): Project {
	return new Project({
		tsConfigFilePath: path.resolve(srcDir, '..', 'tsconfig.json'),
	})
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
