import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	type ArrowFunction,
	type CallExpression,
	type Expression,
	type FunctionExpression,
	isArrayLiteralExpression,
	isArrowFunction,
	isBinaryExpression,
	isCallExpression,
	isFunctionDeclaration,
	isFunctionExpression,
	isIdentifier,
	isNewExpression,
	isNumericLiteral,
	isObjectLiteralExpression,
	isParenthesizedExpression,
	isPropertyAccessExpression,
	isPropertyAssignment,
	isVariableDeclaration,
	isVariableStatement,
	type Node,
	type SourceFile,
	SyntaxKind,
} from 'typescript/unstable/ast'
import { srcDir } from './walk-source'

// The scan of `browser-wait-boundary.test.ts`. It reads the parse of one
// browser test file and gives each break of the three rules that the head of
// that suite states. The suite parses the files and holds the rules.

const browserConfig = readFileSync(join(srcDir, '..', 'vitest.browser.config.ts'), 'utf8')

/** Reads one number from `vitest.browser.config.ts`, so that the scan cannot drift from it. */
function configNumber(pattern: RegExp): number[] {
	const match = pattern.exec(browserConfig)

	if (!match) throw new Error(`vitest.browser.config.ts no longer matches ${pattern}`)

	return match.slice(1).map((text) => Number(text.replaceAll('_', '')))
}

/** The suite time limit of a case, which does not scale. */
export const [TEST_TIMEOUT = Number.NaN] = configNumber(/^\t\ttestTimeout: ([\d_]+),$/m)

/** The factors of `budget()`: the one on CI, and the one on a dev machine. */
export const FACTORS = configNumber(/budgetFactor: CI \? (\d+) : (\d+)/)

/** The file that holds `pause()`, the one sanctioned hold. */
export const WALL_CLOCK = '__tests__/browser/helpers/wall-clock.ts'

/** The option keys that hold a deadline. */
const DEADLINE_KEYS = new Set(['timeout', 'deadline'])

/** The names that open a case or a block of cases. */
const CASE_NAMES = new Set(['it', 'test'])

const BLOCK_NAMES = new Set(['describe'])

/** One break of a rule, as the report prints it. */
export type Finding = { rule: 'literal' | 'hold' | 'overrun'; text: string }

/** The constant number of each top-level `const` in a file, by name. */
function constants(parsed: SourceFile): Map<string, Expression> {
	const found = new Map<string, Expression>()

	for (const statement of parsed.statements) {
		if (!isVariableStatement(statement)) continue

		for (const declaration of statement.declarationList.declarations) {
			if (isIdentifier(declaration.name) && declaration.initializer) {
				found.set(declaration.name.text, declaration.initializer)
			}
		}
	}

	return found
}

/**
 * The value of `node` in milliseconds at `factor`, or `undefined` when the
 * value is not a constant. A `budget(n)` call gives `n * factor`.
 *
 * @param scaled - Collects whether the value passes through `budget()`.
 */
function evaluate(
	node: Expression,
	factor: number,
	consts: Map<string, Expression>,
	scaled: { value: boolean } = { value: false },
): number | undefined {
	if (isNumericLiteral(node)) return Number(node.text.replaceAll('_', ''))

	if (isParenthesizedExpression(node)) return evaluate(node.expression, factor, consts, scaled)

	if (isIdentifier(node)) {
		const value = consts.get(node.text)

		return value ? evaluate(value, factor, consts, scaled) : undefined
	}

	if (isCallExpression(node) && calleeName(node) === 'budget' && node.arguments[0]) {
		const ms = evaluate(node.arguments[0], factor, consts, scaled)

		scaled.value = true

		return ms === undefined ? undefined : ms * factor
	}

	if (isBinaryExpression(node)) {
		const left = evaluate(node.left, factor, consts, scaled)

		const right = evaluate(node.right, factor, consts, scaled)

		if (left === undefined || right === undefined) return undefined

		if (node.operatorToken.kind === SyntaxKind.AsteriskToken) return left * right

		if (node.operatorToken.kind === SyntaxKind.PlusToken) return left + right
	}

	return undefined
}

/** Whether `node` is a constant number that does not pass through `budget()`. */
function isLiteralMs(node: Expression, consts: Map<string, Expression>): boolean {
	const scaled = { value: false }

	return evaluate(node, 1, consts, scaled) !== undefined && !scaled.value
}

/** The name of the function that a call calls: `it` for `it(…)`, `it.each(…)(…)`, and `it.only(…)`. */
function calleeName(call: CallExpression): string | undefined {
	let callee: Node = call.expression

	for (;;) {
		if (isCallExpression(callee)) callee = callee.expression
		else if (isPropertyAccessExpression(callee)) callee = callee.expression
		else break
	}

	return isIdentifier(callee) ? callee.text : undefined
}

/** Whether `node` is a function expression or an arrow function. */
function isFunctionValue(node: Node): node is ArrowFunction | FunctionExpression {
	return isArrowFunction(node) || isFunctionExpression(node)
}

/** The `timeout` option of a case or a block, in milliseconds at `factor`, or `undefined`. */
function timeoutOption(
	call: CallExpression,
	factor: number,
	consts: Map<string, Expression>,
): number | undefined {
	for (const argument of call.arguments.slice(1)) {
		if (isObjectLiteralExpression(argument)) {
			for (const property of argument.properties) {
				if (
					isPropertyAssignment(property) &&
					isIdentifier(property.name) &&
					property.name.text === 'timeout'
				) {
					return evaluate(property.initializer, factor, consts)
				}
			}
		} else if (!isFunctionValue(argument)) {
			// The old form of the option, after the function: `it(name, fn, 5000)`.
			const ms = evaluate(argument, factor, consts)

			if (ms !== undefined) return ms
		}
	}

	return undefined
}

/** Whether a `new Promise` resolves through a `setTimeout`, which makes it a hold. */
function isHold(node: Node): boolean {
	if (!isNewExpression(node) || !isIdentifier(node.expression)) return false

	if (node.expression.text !== 'Promise') return false

	const executor = node.arguments?.[0]

	if (!executor || !isFunctionValue(executor)) return false

	const parameter = executor.parameters[0]?.name

	if (!parameter || !isIdentifier(parameter)) return false

	const resolve = parameter.text

	let found = false

	const visit = (child: Node): void => {
		if (isCallExpression(child) && calleeName(child) === 'setTimeout') {
			const callback = child.arguments[0]

			if (callback && isIdentifier(callback) && callback.text === resolve) found = true

			if (callback && isFunctionValue(callback)) {
				callback.forEachChild(function inner(grandchild: Node): void {
					if (
						isCallExpression(grandchild) &&
						isIdentifier(grandchild.expression) &&
						grandchild.expression.text === resolve
					) {
						found = true
					}

					grandchild.forEachChild(inner)
				})
			}
		}

		child.forEachChild(visit)
	}

	executor.forEachChild(visit)

	return found
}

/**
 * Whether a hold is the deadline of a race: the `new Promise` sits in the array
 * of a `Promise.race`, or a `const` holds it and the array names that `const`.
 * Such a timer ends a wait for a signal early, and it is no hold.
 */
function isRaceDeadline(hold: Node, parsed: SourceFile): boolean {
	const parent = hold.parent

	const name =
		isVariableDeclaration(parent) && isIdentifier(parent.name) ? parent.name.text : undefined

	let found = false

	const visit = (node: Node): void => {
		if (
			isCallExpression(node) &&
			isPropertyAccessExpression(node.expression) &&
			isIdentifier(node.expression.expression) &&
			node.expression.expression.text === 'Promise' &&
			node.expression.name.text === 'race'
		) {
			const [entries] = node.arguments

			if (entries && isArrayLiteralExpression(entries)) {
				for (const entry of entries.elements) {
					if (entry === hold || (name && isIdentifier(entry) && entry.text === name)) found = true
				}
			}
		}

		node.forEachChild(visit)
	}

	visit(parsed)

	return found
}

/** The named functions of a file, by name: declarations and `const` functions at any depth. */
function namedFunctions(parsed: SourceFile): Map<string, Node[]> {
	const found = new Map<string, Node[]>()

	const add = (name: string, body: Node) => found.set(name, [...(found.get(name) ?? []), body])

	const visit = (node: Node): void => {
		if (isFunctionDeclaration(node) && node.name) add(node.name.text, node)

		if (
			isVariableDeclaration(node) &&
			isIdentifier(node.name) &&
			node.initializer &&
			isFunctionValue(node.initializer)
		) {
			add(node.name.text, node.initializer)
		}

		node.forEachChild(visit)
	}

	visit(parsed)

	return found
}

/**
 * The `budget()` calls that a case reaches: those in its body, and those in
 * each function of the same file that the body calls, at any depth.
 */
function reachedBudgets(body: Node, functions: Map<string, Node[]>): CallExpression[] {
	const budgets: CallExpression[] = []

	const seen = new Set<Node>()

	const visit = (node: Node): void => {
		if (seen.has(node)) return

		seen.add(node)

		if (isCallExpression(node)) {
			const name = calleeName(node)

			if (name === 'budget') budgets.push(node)
			else if (name && isIdentifier(node.expression)) {
				for (const target of functions.get(name) ?? []) visit(target)
			}
		}

		node.forEachChild(visit)
	}

	visit(body)

	return budgets
}

/**
 * The breaks of the three rules in one file.
 *
 * @param file - The path that a finding reports.
 * @param parsed - The parse of the file.
 */
export function findingsIn(file: string, parsed: SourceFile): Finding[] {
	const findings: Finding[] = []

	const consts = constants(parsed)

	const functions = namedFunctions(parsed)

	const at = (node: Node) =>
		`${file}:${parsed.getLineAndCharacterOfPosition(node.getStart()).line + 1}`

	const source = (node: Node) => parsed.text.slice(node.getStart(), node.end)

	/** The time limits of the blocks around the node that the walk is in, at each factor. */
	const blockTimeouts: (number | undefined)[][] = []

	const visit = (node: Node): void => {
		if (
			isPropertyAssignment(node) &&
			isIdentifier(node.name) &&
			DEADLINE_KEYS.has(node.name.text) &&
			isLiteralMs(node.initializer, consts)
		) {
			findings.push({ rule: 'literal', text: `${at(node)} ${source(node)}` })
		}

		if (isCallExpression(node) && calleeName(node) === 'animationsDone') {
			const deadline = node.arguments[1]

			if (deadline && isLiteralMs(deadline, consts)) {
				findings.push({ rule: 'literal', text: `${at(node)} ${source(node)}` })
			}
		}

		if (isHold(node) && file !== WALL_CLOCK && !isRaceDeadline(node, parsed)) {
			findings.push({ rule: 'hold', text: `${at(node)} new Promise around setTimeout` })
		}

		if (!isCallExpression(node)) {
			node.forEachChild(visit)

			return
		}

		const name = calleeName(node)

		const body = node.arguments.find(isFunctionValue)

		if (name && BLOCK_NAMES.has(name) && body) {
			blockTimeouts.push(FACTORS.map((factor) => timeoutOption(node, factor, consts)))

			node.forEachChild(visit)

			blockTimeouts.pop()

			return
		}

		if (name && CASE_NAMES.has(name) && body) {
			// A literal third argument of a case is a deadline that does not scale.
			for (const argument of node.arguments.slice(1)) {
				if (!isFunctionValue(argument) && !isObjectLiteralExpression(argument)) {
					if (isLiteralMs(argument as Expression, consts)) {
						findings.push({ rule: 'literal', text: `${at(argument)} ${source(argument)}` })
					}
				}
			}

			const budgets = reachedBudgets(body, functions)

			FACTORS.forEach((factor, index) => {
				const limit =
					timeoutOption(node, factor, consts) ??
					blockTimeouts.findLast((timeouts) => timeouts[index] !== undefined)?.[index] ??
					TEST_TIMEOUT

				for (const call of budgets) {
					const wait = evaluate(call, factor, consts)

					if (wait !== undefined && wait >= limit) {
						findings.push({
							rule: 'overrun',
							text: `${at(node)} waits ${source(call)} (${wait}ms at factor ${factor}) in a case limited to ${limit}ms`,
						})
					}
				}
			})
		}

		node.forEachChild(visit)
	}

	visit(parsed)

	return findings
}
