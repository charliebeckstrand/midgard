import { Lexer } from 'marked'
import { parse as parseYaml } from 'yaml'
import type { BodySegment, DocMeta, UsageAuthorConfig } from './contracts'

/**
 * Node-free parse of one doc source: everything the Vite transform and the
 * fence checker need, before path-derived identity is attached.
 */
export type ParsedDoc = {
	name: string
	description: string
	frontMatter: FrontMatter
	body: BodySegment[]
	previews: ParsedFence[]
}

/** A `tsx preview` fence lifted out of the body. */
export type ParsedFence = {
	title?: string
	section?: string

	/** 1-indexed line of the opening fence in the source file. */
	line: number

	code: string
}

/** The whitelisted front-matter surface; any other key is a build error. */
export type FrontMatter = {
	module?: string
	symbols?: string[]
	usage?: UsageAuthorConfig
}

const FRONT_MATTER_KEYS = ['module', 'symbols', 'usage']

const USAGE_KEYS = ['complexity', 'domain', 'include', 'exclude', 'wrap']

function fail(file: string, line: number, message: string): never {
	throw new Error(`${file}:${line} ${message}`)
}

function readFrontMatter(
	source: string,
	file: string,
): { fm: FrontMatter; rest: string; lineOffset: number } {
	if (!source.startsWith('---\n')) return { fm: {}, rest: source, lineOffset: 0 }

	const end = source.indexOf('\n---\n', 4)

	if (end === -1) fail(file, 1, 'unterminated front-matter block')

	const raw = source.slice(4, end)

	const rest = source.slice(end + 5)

	const lineOffset = raw.split('\n').length + 2

	let data: unknown

	try {
		data = parseYaml(raw)
	} catch (error) {
		fail(
			file,
			1,
			`invalid front-matter YAML: ${error instanceof Error ? error.message : String(error)}`,
		)
	}

	if (data === null || data === undefined) return { fm: {}, rest, lineOffset }

	if (typeof data !== 'object' || Array.isArray(data))
		fail(file, 1, 'front-matter must be a mapping')

	const record = data as Record<string, unknown>

	for (const key of Object.keys(record)) {
		if (!FRONT_MATTER_KEYS.includes(key)) {
			fail(file, 1, `unknown front-matter key "${key}" (allowed: ${FRONT_MATTER_KEYS.join(', ')})`)
		}
	}

	if (record.usage !== undefined) {
		if (typeof record.usage !== 'object' || record.usage === null || Array.isArray(record.usage)) {
			fail(file, 1, 'front-matter usage must be a mapping')
		}

		for (const key of Object.keys(record.usage)) {
			if (!USAGE_KEYS.includes(key)) {
				fail(file, 1, `unknown usage key "${key}" (allowed: ${USAGE_KEYS.join(', ')})`)
			}
		}
	}

	return { fm: record as FrontMatter, rest, lineOffset }
}

/**
 * Split a fence info string per the docs grammar: `<lang> [role] [key="value"]…`.
 * The only known role is `preview`; anything else unrecognized is an error at
 * the call site.
 */
function parseFenceInfo(info: string): {
	lang: string
	role?: string
	attrs: Record<string, string>
} {
	const attrs: Record<string, string> = {}

	const words: string[] = []

	const pattern = /([\w-]+)="([^"]*)"|(\S+)/g

	for (const match of info.matchAll(pattern)) {
		const [, key, value, word] = match

		if (key !== undefined && value !== undefined) attrs[key] = value
		else if (word !== undefined) words.push(word)
	}

	const [lang = '', role] = words

	return { lang, role, attrs }
}

/**
 * Parse one doc's Markdown source into its structured form. The convention is
 * strict — exactly one h1 (the name), a first paragraph (the description),
 * classified fences — and violations throw with `file:line` positions.
 */
export function parseDoc(source: string, file: string): ParsedDoc {
	const { fm, rest, lineOffset } = readFrontMatter(source, file)

	const tokens = Lexer.lex(rest, { gfm: true })

	let line = lineOffset + 1

	let name: string | undefined

	let description: string | undefined

	let section: string | undefined

	const body: BodySegment[] = []

	const previews: ParsedFence[] = []

	let prose = ''

	const flushProse = () => {
		if (prose.trim() !== '') body.push({ t: 'prose', md: prose.trim() })

		prose = ''
	}

	for (const token of tokens) {
		const tokenLine = line

		line += token.raw.split('\n').length - 1

		if (token.type === 'space') {
			prose += token.raw

			continue
		}

		if (token.type === 'heading' && token.depth === 1) {
			if (name !== undefined) fail(file, tokenLine, 'multiple h1 headings; a doc has exactly one')

			name = token.text.trim()

			continue
		}

		if (name === undefined) fail(file, tokenLine, 'the doc must open with an h1 display name')

		if (description === undefined) {
			if (token.type !== 'paragraph') {
				fail(file, tokenLine, 'the first content after the h1 must be a description paragraph')
			}

			description = token.raw.trim()

			continue
		}

		if (token.type === 'heading' && token.depth === 2) {
			section = token.text.trim()

			prose += token.raw

			continue
		}

		if (token.type === 'code') {
			const { lang, role, attrs } = parseFenceInfo(token.lang ?? '')

			if (role === 'preview') {
				flushProse()

				body.push({ t: 'preview', index: previews.length })

				previews.push({ title: attrs.title, section, line: tokenLine, code: token.text })

				continue
			}

			if (role !== undefined) {
				fail(file, tokenLine, `unknown fence role "${role}" (known roles: preview)`)
			}

			flushProse()

			body.push({ t: 'snippet', code: token.text, lang: lang || 'tsx' })

			continue
		}

		prose += token.raw
	}

	flushProse()

	if (name === undefined) fail(file, 1, 'the doc must open with an h1 display name')

	if (description === undefined) {
		fail(file, 1, 'the doc must have a description paragraph after the h1')
	}

	return { name, description, frontMatter: fm, body, previews }
}

/** Maps a doc's `(category, slug)` to a real module specifier, or undefined when none matches. */
export type ModuleResolver = (category: string, slug: string) => string | undefined

/**
 * Build a resolver that reconciles a doc's `(category, slug)` against a
 * package's real export `specifiers` — the authoritative surface — instead of
 * guessing a specifier shape. A specifier whose last segment is the slug wins
 * (a component, module, or provider doc), preferring one whose path also
 * carries the category to disambiguate a slug that appears twice; otherwise the
 * `<packageName>/<category>` barrel (a hooks, core, or layouts doc). Returns
 * undefined when nothing matches, so a bad guess never masquerades as a real
 * module.
 */
export function createModuleResolver(
	specifiers: readonly string[],
	packageName: string,
): ModuleResolver {
	return (category, slug) => {
		const slugMatches = specifiers.filter((specifier) => specifier.split('/').at(-1) === slug)

		const byCategory = slugMatches.find((specifier) => specifier.split('/').includes(category))

		return (
			byCategory ??
			slugMatches[0] ??
			specifiers.find((specifier) => specifier === `${packageName}/${category}`)
		)
	}
}

/** Options for {@link deriveDocMeta}: the package prefix plus the taxonomy seams. */
export type DeriveOptions = {
	/** Import prefix and the fallback module root. */
	packageName: string

	/** Reconciles `(category, slug)` to a real specifier; falls back to `<pkg>/<slug>`. */
	resolveModule?: ModuleResolver
}

/**
 * Attach path-derived identity to a parsed doc: category and slug from the
 * `content/`-relative path and the module specifier reconciled against the
 * package surface (see {@link createModuleResolver}), front-matter `module`
 * overriding.
 */
export function deriveDocMeta(relPath: string, parsed: ParsedDoc, options: DeriveOptions): DocMeta {
	const { packageName, resolveModule } = options

	const posix = relPath.replaceAll('\\', '/').replace(/^\/+/, '')

	const segments = posix.split('/')

	const category = segments[0] ?? ''

	const last = segments[segments.length - 1] ?? ''

	const slug =
		last === 'index.md' ? (segments[segments.length - 2] ?? '') : last.replace(/\.md$/, '')

	const fm = parsed.frontMatter

	return {
		id: `${category}/${slug}`,
		category,
		slug,
		name: parsed.name,
		description: parsed.description,
		module: fm.module ?? resolveModule?.(category, slug) ?? `${packageName}/${slug}`,
		...(fm.symbols ? { symbols: fm.symbols } : {}),
		...(fm.usage ? { usage: fm.usage } : {}),
	}
}
