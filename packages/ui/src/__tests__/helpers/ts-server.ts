import { join } from 'node:path'
import type { SourceFile } from 'typescript/unstable/ast'
import { API, type Project } from 'typescript/unstable/sync'
import { srcDir } from './walk-source'

// The parse and the checker of TypeScript 7 run in the TypeScript server, not
// in the test process. A test therefore gets its source files from a project
// that the server opens. A test file starts one server, and closes it after
// its last case.
//
// The server reads a project from a tsconfig file. This helper writes no file
// to disk. The text of each config, and each source that a test gives as
// text, go to the server through the `fs` callback of the API.

const packageDir = join(srcDir, '..')

/**
 * The compiler options of a project that only parses: no library, no import
 * resolution, and no type packages. The program then holds the listed files
 * and no other file.
 */
const PARSE_ONLY = { noLib: true, noResolve: true, types: [] }

/** One TypeScript 7 server, for the scans of one test file. */
export type TypeScriptServer = {
	/**
	 * Opens a project over `files`, which are absolute paths.
	 *
	 * @param compilerOptions - The `compilerOptions` of the config, as a
	 * tsconfig file writes them. The default only parses.
	 */
	open(files: readonly string[], compilerOptions?: Readonly<Record<string, unknown>>): Project
	/**
	 * The parse of each file in `files`, by its path, in the order of `files`.
	 * The files go into one project that only parses.
	 */
	parse(files: readonly string[]): Map<string, SourceFile>
	/**
	 * Keeps `text` in memory under a new path, and returns that path. The
	 * server reads the text at the path, and no file goes to disk.
	 *
	 * @param name - The name of the file. Its extension selects the grammar,
	 * so `.tsx` parses JSX.
	 */
	write(name: string, text: string): string
	/** The parse of `text` under the file name `name`. */
	parseText(name: string, text: string): SourceFile
	/** Stops the server. */
	close(): void
}

/**
 * Starts a TypeScript 7 server.
 *
 * @param withhold - The files that the server reads as empty text. The
 * server reads each other file from disk.
 */
export function startTypeScript(withhold?: (file: string) => boolean): TypeScriptServer {
	// The text of each config and of each file in memory, by path. The server
	// keeps the parse of a path for its life, so a path never changes its text.
	const texts = new Map<string, string>()

	const api = new API({
		cwd: packageDir,
		fs: {
			readFile: (file) => texts.get(file) ?? (withhold?.(file) ? '' : undefined),
		},
	})

	let projects = 0

	let written = 0

	const open: TypeScriptServer['open'] = (files, compilerOptions = PARSE_ONLY) => {
		const config = join(packageDir, `tsconfig.scan-${++projects}.json`)

		texts.set(config, JSON.stringify({ compilerOptions, files, include: [] }))

		const project = api.updateSnapshot({ openProjects: [config] }).getProject(config)

		if (!project) throw new Error(`the TypeScript server did not open ${config}`)

		return project
	}

	const parse: TypeScriptServer['parse'] = (files) => {
		const { program } = open(files)

		const sources = new Map<string, SourceFile>()

		for (const file of files) {
			const source = program.getSourceFile(file)

			if (!source) throw new Error(`the TypeScript server did not parse ${file}`)

			sources.set(file, source)
		}

		return sources
	}

	const write: TypeScriptServer['write'] = (name, text) => {
		// A directory of its own for each text, so that two texts under one name
		// never share a path.
		const file = join(packageDir, '.virtual', String(++written), name)

		texts.set(file, text)

		return file
	}

	return {
		open,
		parse,
		write,
		parseText(name, text) {
			const file = write(name, text)

			const source = parse([file]).get(file)

			if (!source) throw new Error(`the TypeScript server did not parse ${name}`)

			return source
		},
		close: () => api.close(),
	}
}
