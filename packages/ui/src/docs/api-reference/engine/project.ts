import path from 'node:path'
import { Project } from 'ts-morph'

/**
 * Open a ts-morph Project rooted at the package's `tsconfig.json` (one level
 * above `srcDir`). That config excludes `src/docs`, so docs files stay out of
 * the project's source surface.
 */
export function openProject(srcDir: string): Project {
	return new Project({
		tsConfigFilePath: path.resolve(srcDir, '..', 'tsconfig.json'),
	})
}
