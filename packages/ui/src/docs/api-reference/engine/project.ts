import path from 'node:path'
import { Project } from 'ts-morph'

/**
 * Open a ts-morph Project rooted at the package's tsconfig. The package's
 * `tsconfig.json` already excludes `src/docs`, which is exactly what we want:
 * docs files aren't components, so they don't appear in the project's source
 * surface.
 *
 * @param srcDir - the package's `src/` directory; the tsconfig sits one level up.
 */
export function openProject(srcDir: string): Project {
	return new Project({
		tsConfigFilePath: path.resolve(srcDir, '..', 'tsconfig.json'),
	})
}
