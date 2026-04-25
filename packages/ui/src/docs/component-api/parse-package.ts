import fs from 'node:fs'
import path from 'node:path'
import type ts from 'typescript'
import { buildComponentApi } from './extract-props'
import { findComponent, readPublicExports } from './find-components'
import { createProgram } from './program'
import type { ComponentApi } from './types'

/**
 * Parse every component directory under `<srcDir>/components` and return a
 * map of `{ [dirName]: ComponentApi[] }` matching v1's output shape.
 *
 * One TS Program covers the whole package — much cheaper than re-parsing per
 * component, and the type checker can resolve cross-file references.
 */
export function parsePackage(srcDir: string): Record<string, ComponentApi[]> {
	const { program, checker } = createProgram(srcDir)

	const componentsDir = path.join(srcDir, 'components')

	if (!fs.existsSync(componentsDir)) return {}

	const result: Record<string, ComponentApi[]> = {}

	for (const dir of fs.readdirSync(componentsDir, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue

		const apis = parseComponentDir(path.join(componentsDir, dir.name), program, checker)

		if (apis.length > 0) result[dir.name] = apis
	}

	return result
}

function parseComponentDir(
	dir: string,
	program: ts.Program,
	checker: ts.TypeChecker,
): ComponentApi[] {
	const indexPath = path.join(dir, 'index.ts')

	const indexFile = program.getSourceFile(indexPath)

	if (!indexFile) return []

	const publicNames = readPublicExports(indexFile)

	if (publicNames.length === 0) return []

	// Source files in this component directory — searched by findComponent.
	const dirFiles = program
		.getSourceFiles()
		.filter((f) => f.fileName.startsWith(dir + path.sep) && /\.tsx?$/.test(f.fileName))

	const apis: ComponentApi[] = []

	for (const name of publicNames) {
		const decl = findComponent(name, dirFiles, checker)

		if (!decl) {
			apis.push({ name, props: [] })

			continue
		}

		apis.push(buildComponentApi(decl, checker))
	}

	return apis
}
