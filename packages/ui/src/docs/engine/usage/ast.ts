// The synthesized-usage AST: one seeded intermediate the printer renders to a
// code string now and the live renderer will walk to React elements later
// (Phase 6). Keeping both consumers behind one data shape is the whole reason
// synthesis never emits source text directly — no `eval`, no re-parsing, and
// the printed snippet is provably the same tree that renders.

/** A complete usage example: import lines followed by the statement body. */
export type UsageDoc = {
	imports: ImportLine[]

	/** Statements in emission order; the last is the showcase (`show`). */
	body: Stmt[]
}

/** One `import { a, b } from '<from>'` line. */
export type ImportLine = { names: string[]; from: string }

/** A body statement: a hoisted binding, a destructured call, or the showcase expression. */
export type Stmt =
	| { s: 'const'; name: string; value: Expr }
	| { s: 'destructure'; names: string[]; value: Expr }
	| { s: 'show'; value: Expr }

/** A value expression. The union is closed and render-ready: every variant maps to a JS value or element. */
export type Expr =
	| { e: 'jsx'; tag: string; attrs: Attr[]; children: Expr[] }
	| { e: 'text'; value: string }
	| { e: 'str'; value: string }
	| { e: 'num'; value: number }
	| { e: 'bool'; value: boolean }
	| { e: 'ident'; name: string }
	| { e: 'array'; items: Expr[] }
	| { e: 'object'; fields: Field[] }
	| { e: 'arrow' }
	| { e: 'call'; callee: string; args: Expr[] }

/** A JSX attribute; a `null` value prints as boolean shorthand (`loading`, not `loading={true}`). */
export type Attr = { name: string; value: Expr | null }

/** One `key: value` entry of an object literal. */
export type Field = { key: string; value: Expr }
