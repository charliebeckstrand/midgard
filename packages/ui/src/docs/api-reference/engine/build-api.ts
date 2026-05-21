import fs from 'node:fs'
import path from 'node:path'
import type { ComponentApi } from '../types'
import { buildComponent } from './build-component'
import { findComponent, readPublicExports } from './find-components'
import { openProject } from './project'

/**
 * Build API reference data for every component under `<srcDir>/components` —
 * returns a map of `{ [componentDirName]: ComponentApi[] }`. One ts-morph
 * Project covers the whole package so the type checker can resolve
 * cross-file references in a single pass.
 */
export function buildApi(srcDir: string): Record<string, ComponentApi[]> {
	const componentsDir = path.join(srcDir, 'components')

	if (!fs.existsSync(componentsDir)) return {}

	const project = openProject(srcDir)
	const checker = project.getTypeChecker().compilerObject

	const result: Record<string, ComponentApi[]> = {}

	for (const dir of fs.readdirSync(componentsDir, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue

		const indexPath = path.join(componentsDir, dir.name, 'index.ts')
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

			apis.push(buildComponent(decl, checker))
		}

		if (apis.length > 0) result[dir.name] = apis
	}

	return result
}
