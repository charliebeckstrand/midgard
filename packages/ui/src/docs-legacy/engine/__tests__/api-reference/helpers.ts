import path from 'node:path'
import { getLibFiles } from '@ts-morph/common'
import { ts } from 'ts-morph'

const PROJECT_ROOT = '/project'

// A virtual directory for the standard library files. The `typescript` package
// is the native TypeScript 7 compiler, which ships no JavaScript API and no
// `lib.*.d.ts` files that this compiler host can read. ts-morph's own
// `ts.getDefaultLibFilePath` points at libs that are not on the disk, so every
// global (`Array`, `string[]`, …) resolves to `{}`. `getLibFiles` gives the lib
// text that matches ts-morph's bundled compiler, and the host serves it here.
const LIB_DIR = '/lib'

const libFiles = new Map(
	getLibFiles().map(({ fileName, text }) => [path.posix.join(LIB_DIR, fileName), text]),
)

function readFile(filename: string): string | undefined {
	return libFiles.get(filename) ?? ts.sys.readFile(filename)
}

/**
 * Caches the lib SourceFiles and the other `.d.ts` SourceFiles once per worker.
 * Each `createInMemoryProgram` call uses the cache again.
 */
const diskSourceFileCache = new Map<string, ts.SourceFile>()

function readDiskSourceFile(
	filename: string,
	languageVersion: ts.ScriptTarget | ts.CreateSourceFileOptions,
): ts.SourceFile | undefined {
	const cached = diskSourceFileCache.get(filename)

	if (cached) return cached

	const text = readFile(filename)

	if (text === undefined) return undefined

	const sf = ts.createSourceFile(filename, text, languageVersion, true)

	diskSourceFileCache.set(filename, sf)

	return sf
}

/**
 * Builds a TS Program covering a tiny in-memory project plus the standard
 * library. Sources are placed under `/project/<name>.ts`; the TypeChecker
 * reads the project files and the `lib.*.d.ts` files from memory, and the
 * other type definitions from the real filesystem (`React.ReactNode`,
 * `HTMLAttributes`, etc. resolve without bundling type definitions into the
 * test).
 *
 * Returns each in-memory file's SourceFile under `sourceFiles`.
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
		fileExists: (filename) =>
			projectFiles.has(filename) || libFiles.has(filename) || ts.sys.fileExists(filename),
		readFile: (filename) =>
			projectFiles.has(filename) ? projectFiles.get(filename) : readFile(filename),
		writeFile: () => {},
		getSourceFile: (filename, languageVersion) => {
			const projectText = projectFiles.get(filename)

			if (projectText !== undefined) {
				return ts.createSourceFile(filename, projectText, languageVersion, true, ts.ScriptKind.TSX)
			}

			return readDiskSourceFile(filename, languageVersion)
		},
		getDefaultLibFileName: (opts) => path.posix.join(LIB_DIR, ts.getDefaultLibFileName(opts)),
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

/** Locates the type alias named `name` in a source file and returns its RHS type node. */
export function firstTypeAlias(sf: ts.SourceFile, name: string): ts.TypeNode {
	for (const stmt of sf.statements) {
		if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === name) return stmt.type
	}

	throw new Error(`No type alias named ${name} in ${sf.fileName}`)
}
