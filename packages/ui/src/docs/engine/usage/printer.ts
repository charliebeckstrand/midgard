// Render a usage AST to a code string that reads as if a person wrote it under
// this repo's Biome config: tabs, single-quoted JS strings, double-quoted JSX
// attributes, no semicolons, a 100-column budget. The printer is width-aware
// only where it matters — objects, arrays, and JSX open tags collapse to one
// line when they fit and break predictably when they don't; everything else is
// short by construction.
//
// Convention: every `print*` returns a fragment whose first line carries no
// leading indent (the caller places it) while continuation lines are fully
// indented from column zero.

import type { Attr, Expr, ImportLine, Stmt, UsageDoc } from './ast'

const TAB = '\t'

const MAX_WIDTH = 100

/** A tab's display width for the column budget, matching Biome's default `indentWidth`. */
const TAB_WIDTH = 2

/** Render a usage document to source text. */
export function printUsage(doc: UsageDoc): string {
	const blocks: string[] = []

	if (doc.imports.length > 0) blocks.push(doc.imports.map(printImport).join('\n'))

	if (doc.body.length > 0) blocks.push(doc.body.map((stmt) => printStmt(stmt, 0)).join('\n\n'))

	return blocks.join('\n\n')
}

function printImport(line: ImportLine): string {
	return `import { ${line.names.join(', ')} } from '${line.from}'`
}

function printStmt(stmt: Stmt, indent: number): string {
	const pad = TAB.repeat(indent)

	if (stmt.s === 'const') return `${pad}const ${stmt.name} = ${printExpr(stmt.value, indent)}`

	if (stmt.s === 'destructure') {
		return `${pad}const [${stmt.names.join(', ')}] = ${printExpr(stmt.value, indent)}`
	}

	return `${pad}${printExpr(stmt.value, indent)}`
}

function printExpr(expr: Expr, indent: number): string {
	switch (expr.e) {
		case 'str':
			return quote(expr.value, "'")

		case 'num':
			return String(expr.value)

		case 'bool':
			return String(expr.value)

		case 'ident':
			return expr.name

		case 'arrow':
			return '() => {}'

		case 'text':
			return expr.value

		case 'call':
			return `${expr.callee}(${expr.args.map((arg) => printExpr(arg, indent)).join(', ')})`

		case 'array':
			return printArray(expr.items, indent)

		case 'object':
			return printObject(expr.fields, indent)

		case 'jsx':
			return printJsx(expr, indent)
	}
}

function printArray(items: Expr[], indent: number): string {
	if (items.length === 0) return '[]'

	const inline = `[${items.map((item) => printExpr(item, indent)).join(', ')}]`

	if (isFlat(inline) && fits(indent, inline)) return inline

	const pad = TAB.repeat(indent + 1)

	const lines = items.map((item) => `${pad}${printExpr(item, indent + 1)},`)

	return `[\n${lines.join('\n')}\n${TAB.repeat(indent)}]`
}

function printObject(fields: { key: string; value: Expr }[], indent: number): string {
	if (fields.length === 0) return '{}'

	const entries = fields.map((field) => `${key(field.key)}: ${printExpr(field.value, indent)}`)

	const inline = `{ ${entries.join(', ')} }`

	if (isFlat(inline) && fits(indent, inline)) return inline

	const pad = TAB.repeat(indent + 1)

	const lines = fields.map(
		(field) => `${pad}${key(field.key)}: ${printExpr(field.value, indent + 1)},`,
	)

	return `{\n${lines.join('\n')}\n${TAB.repeat(indent)}}`
}

function printJsx(jsx: Extract<Expr, { e: 'jsx' }>, indent: number): string {
	const attrs = jsx.attrs.map((attr) => printAttr(attr, indent))

	const attrsInline = attrs.length > 0 ? ` ${attrs.join(' ')}` : ''

	if (jsx.children.length === 0) {
		const oneLine = `<${jsx.tag}${attrsInline} />`

		return fits(indent, oneLine) && isFlat(oneLine)
			? oneLine
			: brokenOpen(jsx.tag, attrs, indent, true)
	}

	// A run of text/scalar children can share the open and close tag's line.
	if (jsx.children.every(isInlineChild)) {
		const inner = jsx.children.map((child) => printChild(child, indent)).join('')

		const oneLine = `<${jsx.tag}${attrsInline}>${inner}</${jsx.tag}>`

		if (fits(indent, oneLine) && isFlat(oneLine)) return oneLine
	}

	const openInline = `<${jsx.tag}${attrsInline}>`

	const open =
		fits(indent, openInline) && isFlat(openInline)
			? openInline
			: brokenOpen(jsx.tag, attrs, indent, false)

	const pad = TAB.repeat(indent + 1)

	const childLines = jsx.children.map((child) => `${pad}${printChild(child, indent + 1)}`)

	return `${open}\n${childLines.join('\n')}\n${TAB.repeat(indent)}</${jsx.tag}>`
}

/** A JSX attribute: boolean shorthand for `null`, `name="…"` for strings, `name={…}` otherwise. */
function printAttr(attr: Attr, indent: number): string {
	if (attr.value === null) return attr.name

	if (attr.value.e === 'str') return `${attr.name}=${quote(attr.value.value, '"')}`

	return `${attr.name}={${printExpr(attr.value, indent)}}`
}

/** A single-line child: bare text, or a scalar expression wrapped in braces. */
function isInlineChild(child: Expr): boolean {
	return (
		child.e === 'text' ||
		child.e === 'str' ||
		child.e === 'num' ||
		child.e === 'bool' ||
		child.e === 'ident'
	)
}

function printChild(child: Expr, indent: number): string {
	if (child.e === 'text') return child.value

	if (child.e === 'jsx') return printJsx(child, indent)

	return `{${printExpr(child, indent)}}`
}

/** The broken form of a JSX open tag: one attribute per line, the terminator on its own. */
function brokenOpen(tag: string, attrs: string[], indent: number, selfClose: boolean): string {
	const pad = TAB.repeat(indent + 1)

	const lines = attrs.map((attr) => `${pad}${attr}`)

	return `<${tag}\n${lines.join('\n')}\n${TAB.repeat(indent)}${selfClose ? '/>' : '>'}`
}

/** An object key printed bare when it is a valid identifier, quoted otherwise. */
function key(name: string): string {
	return /^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name, "'")
}

/** Quote and escape a string with the given delimiter. */
function quote(value: string, delimiter: '"' | "'"): string {
	const escaped = value.replace(/\\/g, '\\\\').split(delimiter).join(`\\${delimiter}`)

	return `${delimiter}${escaped}${delimiter}`
}

/** Whether a rendered fragment stayed on one line. */
function isFlat(text: string): boolean {
	return !text.includes('\n')
}

/** Whether a single-line fragment fits the column budget at this indent. */
function fits(indent: number, text: string): boolean {
	return indent * TAB_WIDTH + text.length <= MAX_WIDTH
}
