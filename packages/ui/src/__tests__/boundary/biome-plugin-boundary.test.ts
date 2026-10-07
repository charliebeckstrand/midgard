import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { srcDir } from '../helpers/walk-source'

// Each GritQL plugin in `.biome/plugins` holds a rule at lint time. A plugin
// that stops matching fails nothing: the lint stays green while the rule rots.
// A Biome upgrade can cause that, because it can rename a syntax node or change
// how a pattern matches. This gate runs each plugin against fixtures that must
// trip it.
//
// The fixtures go to a temporary directory, so the lint and the type-check of
// the repository never read them. A generated config applies each plugin to its
// own fixture directory alone. The `includes` of a plugin in `biome.json` stay
// out of reach here, so this gate proves the pattern, not the scope.
//
// A fixture line that ends in `// flag` must carry a diagnostic of its plugin.
// Every other line must carry none. For a file-level rule, the flagged line is
// where the plugin puts its span.

const root = join(srcDir, '..', '..', '..')

const pluginDir = join(root, '.biome', 'plugins')

const biome = join(root, 'node_modules', '@biomejs', 'biome', 'bin', 'biome')

/** The marker that ends a fixture line the plugin must flag. */
const FLAG = /\/\/ flag$/

type Fixture = { file: string; source: string }

/** One entry for each plugin: files whose `// flag` lines it must flag, and no other line. */
const FIXTURES: Record<string, Fixture[]> = {
	'no-api-above-browser-floor': [
		{
			file: 'floor.ts',
			source: `declare const signal: AbortSignal
declare const el: Element
export const a = AbortSignal.any([signal]) // flag
export const b = el.checkVisibility() // flag
export const c = el.checkVisibility?.() ?? true
export const d = AbortSignal.timeout(1)
`,
		},
	],
	'no-camel-case-data-slot': [
		{
			file: 'slot.tsx',
			source: `declare const props: Record<string, string>
export const a = { dataSlot: 'x' } // flag
export const b = props.dataSlot // flag
export const c = { 'data-slot': 'x' }
// dataSlot in a comment
`,
		},
	],
	'no-client-directive-in-route-file': [
		{ file: 'page.tsx', source: `'use client' // flag\n\nexport const a = 1\n` },
		{ file: 'layout.tsx', source: `export const a = 'use client'\n` },
	],
	'no-client-gateway-access': [
		{
			file: 'client.tsx',
			source: `'use client'
import type { User } from 'auth/user'
import { bifrost } from 'auth' // flag
declare const id: string
export const a = (user: User) => [user, bifrost]
export const b = () => fetch('https://gateway.example/api/users') // flag
export const c = () => fetch(\`/api/users/\${id}\`)
export const d = () => fetch('/auth/logout', { method: 'POST' })
`,
		},
		{ file: 'server.tsx', source: `import { bifrost } from 'auth'\n\nexport const a = bifrost\n` },
	],
	'no-full-motion-component': [
		{
			file: 'motion.tsx',
			source: `import { motion } from 'motion/react' // flag
import { AnimatePresence, motion as full } from 'motion/react' // flag
import { motion as framer } from 'framer-motion' // flag
import { type MotionStyle, MotionConfig, Reorder, useMotionValue } from 'motion/react'
import * as m from 'motion/react-m' // flag
import { div } from 'motion/react-m' // flag
import * as elements from './reduced-motion-elements'
export { motion, AnimatePresence, full, framer, MotionConfig, Reorder, useMotionValue, m, div, elements }
export type { MotionStyle }
`,
		},
	],
	'no-hand-composed-handler': [
		{
			file: 'compose.tsx',
			source: `declare const toggle: () => void
declare const id: string
declare function onClick(event: unknown): void
declare function onBlur(event: unknown): void
declare function onFocus(value: string): void
declare function onValueChange(value: string): void
declare function composeEventHandlers(...args: unknown[]): () => void
export const a = <button onClick={(event) => { toggle(); onClick?.(event) }} /> // flag
export const b = <input onBlur={(e) => onBlur(e)} /> // flag
export const c = <button onClick={composeEventHandlers(onClick, toggle)} />
export const d = <li onFocus={() => onFocus(id)} />
export const e = <Picker onValueChange={(next) => onValueChange(next ?? '')} />
// onClick={(event) => onClick(event)} in a comment
`,
		},
	],
	'no-hand-written-clamp': [
		{
			file: 'clamp.ts',
			source: `declare const v: number
export const a = Math.min(10, Math.max(0, v)) // flag
export const b = Math.min(Math.max(v, 0), 10) // flag
export const c = Math.max(0, Math.min(v, 10))
export const d = Math.min(v, 10)
// Math.min(10, Math.max(0, v)) in a comment
`,
		},
	],
	'no-hand-written-bool-attr': [
		{
			file: 'attr.tsx',
			source: `declare const open: boolean
declare const alt: string
export const a = <div aria-busy={open || undefined} /> // flag
export const b = <div data-open={open ? '' : undefined} /> // flag
export const c = <div aria-pressed={open ? true : undefined} /> // flag
export const d = <img aria-label={alt || undefined} alt="" />
export const e = <div aria-busy={open} data-open={open ? 'yes' : undefined} />
// aria-busy={open || undefined} in a comment
`,
		},
	],
	'no-inline-spacing-calc': [
		{
			file: 'calc.ts',
			source: `export const a = 'px-[calc(--spacing(3)-1px)]' // flag
export const b = 'px-3'
`,
		},
	],
	'no-motion-reduced-motion-hook': [
		{
			file: 'motion.tsx',
			source: `import { useReducedMotion } from 'motion/react' // flag
import { AnimatePresence, motion, useReducedMotion as useReduced } from 'motion/react' // flag
import { useReducedMotion as useFramerReduced } from 'framer-motion' // flag
import { AnimatePresence as Presence, MotionConfig } from 'motion/react'
import { usePrefersReducedMotion } from './hooks'
export { useReducedMotion, AnimatePresence, motion, useReduced, useFramerReduced, Presence, MotionConfig, usePrefersReducedMotion }
`,
		},
	],
	'no-react-create-context': [
		{
			file: 'context.ts',
			source: `import { createContext } from 'react' // flag
import { createContext as mine } from 'react' // flag
import { useState } from 'react'
export { createContext, mine, useState }
`,
		},
	],
	'no-renamed-spacing-utility': [
		{
			file: 'spacing.ts',
			source: `export const a = 'p-md gap-sm' // flag
export const b = 'p-3 text-sm step-md'
`,
		},
	],
	'no-respelled-orientation': [
		{
			file: 'orientation.ts',
			source: `export type A = 'horizontal' | 'vertical' // flag
export type B = 'horizontal' | 'both' | 'vertical' // flag
export type C = { dir: 'horizontal'; w: number } | { dir: 'vertical'; h: number }
export type D = 'horizontal' | 'diagonal'
`,
		},
	],
	'no-text-left': [
		{
			file: 'align.tsx',
			source: `export const a = 'flex text-left' // flag
export const b = <div className="md:text-left" /> // flag
export const c = 'text-start text-leftward'
`,
		},
	],
	'no-unsanctioned-define-recipe': [
		{
			file: 'recipe.ts',
			source: `import { defineRecipe } from '../../core/recipe' // flag
import { type RecipeConfig } from '../../core/recipe'
export { defineRecipe, type RecipeConfig }
`,
		},
	],
	'no-use-prefixed-type-name': [
		{
			file: 'types.ts',
			source: `export type UseA = { a: string } // flag
export interface UseB<T> extends Array<T> {} // flag
export type User = { name: string }
`,
		},
	],
	'no-value-import-from-recipes-barrel': [
		{
			file: 'barrel.ts',
			source: `import { Ma } from '../../recipes' // flag
import type { Step } from '../../recipes'
import { type Color, type Ji } from '../../recipes'
import { k } from '../../recipes/kata/button'
export { Ma, k, type Step, type Color, type Ji }
`,
		},
	],
	'no-value-import-from-sibling-kata': [
		{
			file: 'kata.ts',
			source: `import { k } from './button' // flag
import type { K } from './menu'
import { sen } from '../kiso/sen'
export { k, sen, type K }
`,
		},
	],
	'no-value-import-from-tanstack-table': [
		{
			file: 'grid.tsx',
			source: `import { flexRender } from '@tanstack/react-table' // flag
import { type Table, useTable } from '@tanstack/react-table' // flag
import { table_getRowModel } from '@tanstack/react-table/static-functions' // flag
import { constructTable } from '@tanstack/table-core' // flag
import type { Row } from '@tanstack/react-table'
import { type Cell, type Column } from '@tanstack/react-table'
import type { TableState } from '@tanstack/table-core'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useState } from 'react'
export { flexRender, useTable, table_getRowModel, constructTable, useVirtualizer, useState, type Table, type Row, type Cell, type Column, type TableState }
`,
		},
	],
	'no-whole-floating-context-dep': [
		{
			file: 'floating.ts',
			source: `import { useCallback } from 'react'
import { useFloating } from '@floating-ui/react'
declare function pass(value: unknown): void
export function useA() {
	const { context } = useFloating()
	const a = useCallback(() => context.onOpenChange(false), [context]) // flag
	const b = useCallback(() => context.onOpenChange(false), [context.onOpenChange])
	const c = useCallback(() => pass(context), [context])
	return [a, b, c]
}
`,
		},
	],
	'require-client-directive-in-hooks': [
		{
			file: 'use-a.ts',
			source: `import { useState } from 'react' // flag\n\nexport const useA = () => useState(0)\n`,
		},
		{
			file: 'use-b.ts',
			source: `'use client'\n\nimport { useState } from 'react'\n\nexport const useB = () => useState(0)\n`,
		},
	],
}

/** The plugins on disk, by name. */
function pluginNames(): string[] {
	return readdirSync(pluginDir)
		.filter((file) => file.endsWith('.grit'))
		.map((file) => file.slice(0, -'.grit'.length))
		.sort()
}

/** One `::error title=…,file=…,line=…` row of the `github` reporter. */
const ROW = /^::\w+ title=([^,]+),file=([^,]+),line=(\d+),/

describe('biome plugin boundary', () => {
	let workspace = ''

	/** Each plugin diagnostic, as `<plugin>/<file>:<line>`. */
	let flagged: string[] = []

	/** Each diagnostic that no plugin reported, such as a plugin that fails to compile. */
	const other: string[] = []

	beforeAll(() => {
		// The real path, because Biome reports real paths. On macOS the temp
		// directory is under `/var`, which links to `/private/var`. A path relative
		// to the linked name then leaves the workspace and matches no fixture.
		workspace = realpathSync(mkdtempSync(join(tmpdir(), 'biome-plugins-')))

		const overrides = Object.entries(FIXTURES).map(([plugin, fixtures]) => {
			mkdirSync(join(workspace, plugin))

			for (const { file, source } of fixtures) writeFileSync(join(workspace, plugin, file), source)

			return { includes: [`${plugin}/**`], plugins: [join(pluginDir, `${plugin}.grit`)] }
		})

		writeFileSync(
			join(workspace, 'biome.json'),
			JSON.stringify({
				assist: { enabled: false },
				formatter: { enabled: false },
				linter: { rules: { preset: 'none' } },
				vcs: { enabled: false },
				overrides,
			}),
		)

		const run = spawnSync(
			process.execPath,
			[biome, 'lint', '--reporter=github', '--max-diagnostics=none', '.'],
			{ cwd: workspace, encoding: 'utf8' },
		)

		for (const line of `${run.stdout}\n${run.stderr}`.split('\n')) {
			const row = ROW.exec(line)

			if (!row) continue

			const place = `${relative(workspace, row[2] ?? '')}:${row[3]}`

			if (row[1] === 'plugin') flagged.push(place)
			else other.push(`${row[1]} at ${place}`)
		}

		flagged = flagged.sort()
	})

	afterAll(() => {
		if (workspace) rmSync(workspace, { recursive: true, force: true })
	})

	it('holds fixtures for every plugin on disk, and for no other', () => {
		expect(
			Object.keys(FIXTURES).sort(),
			'give each plugin in `.biome/plugins` an entry in FIXTURES, with a line it must flag',
		).toEqual(pluginNames())
	})

	it('flags each marked fixture line, and no other line', () => {
		const expected = Object.entries(FIXTURES)
			.flatMap(([plugin, fixtures]) =>
				fixtures.flatMap(({ file, source }) =>
					source
						.split('\n')
						.flatMap((line, index) => (FLAG.test(line) ? [`${plugin}/${file}:${index + 1}`] : [])),
				),
			)
			.sort()

		expect(other, 'a diagnostic that no plugin reported').toEqual([])
		expect(flagged).toEqual(expected)
	})
})
