import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { extractModule } from './components'
import { type ApiSnapshot, type ModuleApi, SCHEMA_VERSION } from './schema'
import { enumerateSurface } from './surface'

/** A lazily-built, cache-backed extraction session over one package. */
export type ApiExtractor = {
	extract(specifiers?: string[]): ApiSnapshot
	invalidate(file: string): void
}

/** Extra prop defaults for a component beyond its destructured bindings, keyed by prop name. */
export type ExtraDefaults = (packageDir: string, componentName: string) => Record<string, string>

/** Configuration for {@link createExtractor}. */
export type ExtractorOptions = {
	/** Absolute path to the documented package, e.g. `<repo>/packages/ui`. */
	packageDir: string

	/** Import prefix; defaults to the package.json name. */
	packageName?: string

	/**
	 * Supplies extra prop defaults a consumer's conventions encode outside the
	 * function signature — a design system's variant-axis defaults, say. Called
	 * per component with the kebab-case name; folded into each matching prop's
	 * `default` when no destructured binding sets one. Keeps any such convention
	 * out of this package.
	 */
	extraDefaults?: ExtraDefaults
}

type CacheEntry = { module: ModuleApi; files: ReadonlySet<string> }

type Session = {
	program: ts.Program
	checker: ts.TypeChecker
	moduleCache: ts.ModuleResolutionCache
}

/**
 * Create an extractor over one package's public surface. The `ts.Program` is
 * built lazily on first `extract()` from the package's own `tsconfig.json`
 * (which already excludes `src/docs`); per-specifier results are cached, and
 * `invalidate(file)` evicts the modules whose source graph includes the file
 * while marking the program stale so the next extract rebuilds it via
 * `ts.createProgram({ oldProgram })`.
 */
export function createExtractor(options: ExtractorOptions): ApiExtractor {
	const packageDir = path.resolve(options.packageDir)

	const packageName = options.packageName ?? readPackageName(packageDir)

	const extraDefaults = options.extraDefaults ?? (() => ({}))

	const surface = enumerateSurface(packageDir, packageName)

	const cache = new Map<string, CacheEntry>()

	let session: Session | null = null

	let stale = true

	const ensureSession = (): Session => {
		if (session && !stale) return session

		const parsed = parseConfig(packageDir)

		const program = ts.createProgram({
			rootNames: parsed.fileNames,
			options: parsed.options,
			oldProgram: session?.program,
		})

		session = {
			program,
			checker: program.getTypeChecker(),
			// One resolution cache for the session: a full-surface extract walks
			// shared subtrees (ui/core, utilities) once per importing module, so
			// caching resolution avoids re-doing filesystem work per module.
			moduleCache: ts.createModuleResolutionCache(packageDir, (x) => x, parsed.options),
		}

		stale = false

		return session
	}

	return {
		extract(specifiers) {
			const wanted = specifiers ?? [...surface.keys()]

			const { program, checker, moduleCache } = ensureSession()

			const modules: Record<string, ModuleApi> = {}

			for (const specifier of wanted) {
				const entry = surface.get(specifier)

				if (!entry) {
					throw new Error(`Unknown specifier '${specifier}' for package '${packageName}'`)
				}

				const cached = cache.get(specifier)

				if (cached) {
					modules[specifier] = cached.module

					continue
				}

				const module = extractModule(specifier, entry, {
					program,
					checker,
					packageDir,
					extraDefaults,
				})

				cache.set(specifier, { module, files: moduleFiles(program, entry, moduleCache) })

				modules[specifier] = module
			}

			return { schemaVersion: SCHEMA_VERSION, modules }
		},

		invalidate(file) {
			const normalized = path.resolve(file)

			for (const [specifier, entry] of cache) {
				if (entry.files.has(normalized)) cache.delete(specifier)
			}

			stale = true
		},
	}
}

/** The `name` field of the package's own manifest. */
function readPackageName(packageDir: string): string {
	const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
		name?: string
	}

	if (!manifest.name) throw new Error(`No package name in ${packageDir}/package.json`)

	return manifest.name
}

/** Parse the package's `tsconfig.json` into program inputs. */
function parseConfig(packageDir: string): ts.ParsedCommandLine {
	const configPath = path.join(packageDir, 'tsconfig.json')

	const host: ts.ParseConfigFileHost = {
		...ts.sys,
		onUnRecoverableConfigFileDiagnostic(diagnostic) {
			throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
		},
	}

	const parsed = ts.getParsedCommandLineOfConfigFile(configPath, undefined, host)

	if (!parsed) throw new Error(`Failed to parse ${configPath}`)

	return parsed
}

/**
 * Project source files reachable from an entry barrel: a breadth-first walk
 * over import / re-export specifiers, resolved with the program's own options
 * and stopping at `node_modules`. Backs the per-module invalidation set.
 */
function moduleFiles(
	program: ts.Program,
	entry: string,
	moduleCache: ts.ModuleResolutionCache,
): Set<string> {
	const files = new Set<string>()

	const options = program.getCompilerOptions()

	const queue = [path.resolve(entry)]

	while (queue.length > 0) {
		const file = queue.pop() as string

		if (files.has(file)) continue

		const sourceFile = program.getSourceFile(file)

		if (!sourceFile) continue

		files.add(file)

		for (const statement of sourceFile.statements) {
			const specifier = moduleSpecifierOf(statement)

			if (!specifier) continue

			const resolved = ts.resolveModuleName(
				specifier,
				file,
				options,
				ts.sys,
				moduleCache,
			).resolvedModule

			if (!resolved || resolved.isExternalLibraryImport) continue

			if (resolved.resolvedFileName.includes('/node_modules/')) continue

			queue.push(path.resolve(resolved.resolvedFileName))
		}
	}

	return files
}

/** The string module specifier of an import or re-export statement, if any. */
function moduleSpecifierOf(statement: ts.Statement): string | null {
	if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
		const specifier = statement.moduleSpecifier

		if (specifier && ts.isStringLiteral(specifier)) return specifier.text
	}

	return null
}
