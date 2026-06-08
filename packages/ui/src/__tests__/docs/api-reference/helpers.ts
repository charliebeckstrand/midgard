import path from 'node:path'
import { ts } from 'ts-morph'

const PROJECT_ROOT = '/project'

/**
 * Caches lib and other on-disk `.d.ts` SourceFiles once per worker, reused
 * across every `createInMemoryProgram` call. Parsing `lib.es2022.d.ts` is the
 * dominant cost of building an in-memory Program; caching the immutable
 * SourceFile keeps the suite fast.
 */
const diskSourceFileCache = new Map<string, ts.SourceFile>()

function readDiskSourceFile(
	filename: string,
	languageVersion: ts.ScriptTarget | ts.CreateSourceFileOptions,
): ts.SourceFile | undefined {
	const cached = diskSourceFileCache.get(filename)

	if (cached) return cached

	const text = ts.sys.readFile(filename)

	if (text === undefined) return undefined

	const sf = ts.createSourceFile(filename, text, languageVersion, true)

	diskSourceFileCache.set(filename, sf)

	return sf
}

/**
 * Builds a TS Program covering a tiny in-memory project plus the standard
 * library. Sources are placed under `/project/<name>.ts`; the TypeChecker
 * resolves both the in-memory files and `lib.*.d.ts` via the real filesystem
 * (`React.ReactNode`, `HTMLAttributes`, etc. resolve without bundling type
 * definitions into the test).
 *
 * Returns each in-memory file's SourceFile under `sourceFiles` so tests can
 * pluck specific nodes (e.g. "the first type alias in `props.ts`") without
 * re-parsing.
 */
export function createInMemoryProgram(files: Record<string, string>): {
	program: ts.Program
	checker: ts.TypeChecker
	sourceFiles: Record<string, ts.SourceFile>
} {
	const projectFiles = new Map<string, string>()

	for (const [name, text] of Object.entries(files)) {
		const filename = path.posix.join(PROJECT_ROOT, name)

		projectFiles.set(filename, text)
	}

	const host: ts.CompilerHost = {
		fileExists: (filename) => projectFiles.has(filename) || ts.sys.fileExists(filename),
		readFile: (filename) =>
			projectFiles.has(filename) ? projectFiles.get(filename) : ts.sys.readFile(filename),
		writeFile: () => {},
		getSourceFile: (filename, languageVersion) => {
			const projectText = projectFiles.get(filename)

			if (projectText !== undefined) {
				return ts.createSourceFile(filename, projectText, languageVersion, true, ts.ScriptKind.TSX)
			}

			return readDiskSourceFile(filename, languageVersion)
		},
		getDefaultLibFileName: (opts) => ts.getDefaultLibFilePath(opts),
		getCurrentDirectory: () => PROJECT_ROOT,
		getCanonicalFileName: (filename) => filename,
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => '\n',
		getDirectories: (dir) => ts.sys.getDirectories(dir),
		readDirectory: (dir, extensions, exclude, include, depth) =>
			ts.sys.readDirectory(dir, extensions, exclude, include, depth),
	}

	const program = ts.createProgram({
		rootNames: [...projectFiles.keys()],
		options: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			jsx: ts.JsxEmit.ReactJSX,
			strict: true,
			esModuleInterop: true,
			skipLibCheck: true,
			lib: ['lib.es2022.d.ts'],
		},
		host,
	})

	const sourceFiles: Record<string, ts.SourceFile> = {}

	for (const [filename] of projectFiles) {
		const rel = path.posix.relative(PROJECT_ROOT, filename)

		const sf = program.getSourceFile(filename)

		if (sf) sourceFiles[rel] = sf
	}

	return { program, checker: program.getTypeChecker(), sourceFiles }
}

/**
 * Locate the first `type X = …` declaration in a source file and return its
 * RHS type node. Useful for tests that want to hand a focused annotation to
 * a walker without parsing the surrounding context.
 */
export function firstTypeAlias(sf: ts.SourceFile, name: string): ts.TypeNode {
	for (const stmt of sf.statements) {
		if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === name) return stmt.type
	}

	throw new Error(`No type alias named ${name} in ${sf.fileName}`)
}
