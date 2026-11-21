import { describe, expect, it } from 'vitest'
import { parseImports, resolveSource } from '../helpers/source-imports'
import { isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// A cycle of value imports makes the order of the module bodies depend on the
// file that a bundler reaches first. A name that one file of the cycle reads at
// the top level can then be `undefined`. The layers of `ui` keep one direction
// (REFERENCE.md §1), and this gate holds the files to it too: no cycle of
// runtime imports in the shipped source. A type import erases at compile time,
// so it does not count.

/** Whether `file` is part of the shipped source, not a test or a bench. */
function shipped(file: string): boolean {
	return !/\/(?:__tests__|__benchmarks__)\//.test(file)
}

/** The runtime imports of each shipped source file, as resolved paths. */
function sourceGraph(): Map<string, string[]> {
	const graph = new Map<string, string[]>()

	walkSource(srcDir, (file, content) => {
		if (!isSourceFile(file) || !shipped(file)) return

		const targets: string[] = []

		for (const { specifier, runtime } of parseImports(content)) {
			if (!runtime || !specifier.startsWith('.')) continue

			const target = resolveSource(file, specifier)

			if (target && shipped(target)) targets.push(target)
		}

		graph.set(file, targets)
	})

	return graph
}

/**
 * The strongly connected components of `graph` with more than one file, or with
 * one file that imports itself. Each one holds a cycle. Tarjan's algorithm
 * finds each in one pass.
 */
function cycles(graph: ReadonlyMap<string, readonly string[]>): string[][] {
	let next = 0

	const order = new Map<string, number>()

	const low = new Map<string, number>()

	const stack: string[] = []

	const onStack = new Set<string>()

	const found: string[][] = []

	const visit = (file: string) => {
		order.set(file, next)

		low.set(file, next)

		next += 1

		stack.push(file)

		onStack.add(file)

		for (const target of graph.get(file) ?? []) {
			if (!order.has(target)) {
				visit(target)

				low.set(file, Math.min(low.get(file) ?? 0, low.get(target) ?? 0))
			} else if (onStack.has(target)) {
				low.set(file, Math.min(low.get(file) ?? 0, order.get(target) ?? 0))
			}
		}

		if (low.get(file) !== order.get(file)) return

		const component: string[] = []

		for (let top = stack.pop(); top !== undefined; top = stack.pop()) {
			onStack.delete(top)

			component.push(top)

			if (top === file) break
		}

		if (component.length > 1 || graph.get(file)?.includes(file)) found.push(component.sort())
	}

	for (const file of graph.keys()) if (!order.has(file)) visit(file)

	return found
}

describe('import cycle boundary', () => {
	it('the shipped source has no cycle of runtime imports', () => {
		const found = cycles(sourceGraph()).map((component) => component.map(srcRelative).join(' ↔ '))

		expect(
			found,
			`break each cycle, such as by a move of the shared part to a file of its own:\n  ${found.join('\n  ')}`,
		).toEqual([])
	})
})

describe('import cycle boundary · self-check', () => {
	it('finds a cycle of two files and one of three, and no other', () => {
		const graph = new Map([
			['a', ['b']],
			['b', ['a', 'c']],
			['c', ['d']],
			['d', ['e']],
			['e', ['c']],
			['f', ['a']],
		])

		expect(cycles(graph)).toEqual([
			['c', 'd', 'e'],
			['a', 'b'],
		])
	})

	it('finds a file that imports itself', () => {
		expect(cycles(new Map([['a', ['a']]]))).toEqual([['a']])
	})
})
