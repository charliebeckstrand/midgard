import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { extractModule } from './components'
import { type ApiSnapshot, type ModuleApi, SCHEMA_VERSION } from './schema'
import { enumerateSurface } from './surface'

/** A lazily-built extraction session over one package. */
export type ApiExtractor = {
	extract(specifiers?: string[]): ApiSnapshot
	invalidate(): void
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

type Session = {
	program: ts.Program
	checker: ts.TypeChecker
}

/**
 * Create an extractor over one package's public surface. The `ts.Program` is
 * built lazily on first `extract()` from the package's own `tsconfig.json`
 * (which already excludes `src/docs`) and reused across extracts; `invalidate()`
 * marks it stale so the next extract rebuilds it via `ts.createProgram({
 * oldProgram })`, which reuses the unchanged files of the prior program.
 */
export function createExtractor(options: ExtractorOptions): ApiExtractor {
	const packageDir = path.resolve(options.packageDir)

	const packageName = options.packageName ?? readPackageName(packageDir)

	const extraDefaults = options.extraDefaults ?? (() => ({}))

	const surface = enumerateSurface(packageDir, packageName)

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

		session = { program, checker: program.getTypeChecker() }

		stale = false

		return session
	}

	return {
		extract(specifiers) {
			const wanted = specifiers ?? [...surface.keys()]

			const { program, checker } = ensureSession()

			const modules: Record<string, ModuleApi> = {}

			for (const specifier of wanted) {
				const entry = surface.get(specifier)

				if (!entry) {
					throw new Error(`Unknown specifier '${specifier}' for package '${packageName}'`)
				}

				modules[specifier] = extractModule(specifier, entry, {
					program,
					checker,
					packageDir,
					extraDefaults,
				})
			}

			return { schemaVersion: SCHEMA_VERSION, modules }
		},

		invalidate() {
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
