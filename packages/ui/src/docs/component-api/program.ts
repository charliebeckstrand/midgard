import path from 'node:path'
import ts from 'typescript'

/**
 * Build a TypeScript Program covering the package's source files (everything
 * the vite plugin currently parses, plus the recipes that supply CVA defs).
 *
 * The package's own tsconfig excludes `src/docs`, which is exactly what we want:
 * the docs themselves aren't components.
 */
export function createProgram(srcDir: string): {
	program: ts.Program
	checker: ts.TypeChecker
} {
	const configPath = ts.findConfigFile(srcDir, ts.sys.fileExists, 'tsconfig.json')

	if (!configPath) {
		throw new Error(`No tsconfig.json found above ${srcDir}`)
	}

	const { config } = ts.readConfigFile(configPath, ts.sys.readFile)

	const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath))

	const program = ts.createProgram({
		rootNames: parsed.fileNames,
		options: parsed.options,
	})

	return { program, checker: program.getTypeChecker() }
}
