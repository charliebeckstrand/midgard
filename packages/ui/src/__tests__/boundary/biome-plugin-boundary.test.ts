import { spawnSync } from 'node:child_process'
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { workspaceRoot } from '../helpers/walk-source'

// Each GritQL plugin in `.biome/plugins` holds a rule at lint time. A plugin
// that stops matching fails nothing: the lint stays green while the rule rots.
// A Biome upgrade can cause that, because it can rename a syntax node or change
// how a pattern matches. This gate runs each plugin against fixtures that must
// trip it.
//
// The fixtures go to a temporary directory, so the lint and the type-check of
// the repository never read them. A generated config applies each plugin to its
// own fixture directory alone, so the first suite proves the pattern.
//
// The second suite proves the scope: the `includes` of each plugin in
// `biome.json`. A plugin with a wrong glob never runs, and nothing else fails.
// A temporary root holds a copy of `biome.json` and `.biome`. For each plugin,
// it puts the first fixture at a path in the scope and at a path out of it, and
// lints the root with the real config. The message of a diagnostic names its
// plugin. The path in the scope must exist in the repository, so a probe cannot
// follow a mistyped glob.
//
// A fixture line that ends in `// flag` must carry a diagnostic of its plugin.
// A stylesheet has no line comment, so a line of a CSS fixture ends in
// `/* flag */`.
// Every other line must carry none. For a file-level rule, the flagged line is
// where the plugin puts its span.

const pluginDir = join(workspaceRoot, '.biome', 'plugins')

const biome = join(workspaceRoot, 'node_modules', '@biomejs', 'biome', 'bin', 'biome')

/** The marker that ends a fixture line the plugin must flag. */
const FLAG = /(?:\/\/ flag|\/\* flag \*\/)$/

type Fixture = { file: string; source: string }

/** One entry for each plugin: files whose `// flag` lines it must flag, and no other line. */
const FIXTURES: Record<string, Fixture[]> = {
	'no-abbreviated-binding': [
		{
			file: 'binding.tsx',
			source: `declare const items: string[]
declare function use(value: unknown): void
export const a = (e: Event) => use(e) // flag
export const b = items.map((item, idx) => item + idx) // flag
export function c(cb: () => void) { use(cb) } // flag
export const d = () => { try { use(1) } catch (err) { use(err) } } // flag
export const { res } = { res: 1 } // flag
export type F = { onChange: (evt: Event) => void } // flag
export const g = { e: 1, idx: 2, cb: 3 }
export const h = (event: Event, index: number, el: Element) => use([event, index, el])
export const { err: error } = { err: 1 }
export const evts = [error]
`,
		},
	],
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
	'no-faint-text-color': [
		{
			file: 'ink.tsx',
			source: `export const a = <p className="text-sm text-zinc-400">Note</p> // flag
export const b = 'text-zinc-400 dark:text-zinc-500' // flag
export const c = <div className="font-light text-gray-400" /> // flag
export const d = \`py-1 \${size} text-zinc-300\` // flag
export const e = 'text-zinc-500 dark:text-zinc-400'
export const f = 'text-zinc-600 group-hover:text-zinc-950 dark:text-zinc-400'
export const g = 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
export const h = <span className="text-zinc-950 dark:text-zinc-300" />
`,
		},
	],
	'no-formatjs-import-outside-intl': [
		{
			file: 'intl.tsx',
			source: `import { useIntl } from 'react-intl' // flag
import type { IntlShape } from 'react-intl' // flag
import { createIntl } from 'react-intl/server' // flag
import { defineMessages } from '@formatjs/intl' // flag
import { type MessageDescriptor } from '@formatjs/intl' // flag
import { defineMessages as define } from '../primitives/intl/intl-messages'
import type { IntlShape as Intl } from '../primitives/intl/types'
import { useState } from 'react'
export { useIntl, createIntl, defineMessages, define, useState, type IntlShape, type MessageDescriptor, type Intl }
`,
		},
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
	'no-hand-written-fold': [
		{
			file: 'fold.ts',
			source: `declare const text: string
export const a = text.normalize('NFD').replace(/\\p{M}/gu, '') // flag
export const b = text.normalize("NFD") // flag
export const c = text.normalize('NFKD')
export const d = text.normalize()
// text.normalize('NFD') in a comment
`,
		},
	],
	'no-hand-written-aria-check': [
		{
			file: 'aria.test.ts',
			source: `declare const expect: (value: unknown) => any
declare const tab: Element
declare const panel: Element | undefined
declare const rows: Element[]
expect(tab).toHaveAttribute('aria-controls', panel?.id) // flag
expect(tab).toHaveAttribute('aria-labelledby', tab.id) // flag
expect(tab).toHaveAttribute('aria-expanded', 'true') // flag
expect(tab).not.toHaveAttribute('aria-pressed', 'false') // flag
expect(tab).toHaveAttribute('role', 'tab') // flag
expect(document.getElementById(tab.getAttribute('aria-controls') ?? '')).toBe(panel) // flag
expect(tab.hasAttribute('data-open')).toBe(true) // flag
expect(panel?.hasAttribute('hidden')).toBe(false) // flag
expect(tab).not.toBePressed() // flag
expect(tab).not.toBeChecked() // flag
expect(tab).toBeUnpressed()
expect(tab).toBeUnchecked()
expect(tab).toHaveAttribute('aria-controls', 'settings-panel')
expect(tab).toHaveAttribute('aria-checked', 'mixed')
expect(tab).not.toHaveAttribute('role', 'button')
expect(tab).toHaveAttribute('role', 'none')
expect(tab).toControl(panel)
expect(document.getElementById('field')).toBe(panel)
expect(rows.every((row) => row.hasAttribute('data-open'))).toBe(true)
`,
		},
	],
	'no-hand-written-get-slot': [
		{
			file: 'slot.test.ts',
			source: `declare function present<T = HTMLElement>(el: unknown, what: string): T
declare const container: HTMLElement
declare const row: HTMLElement | undefined
export const a = present(container.querySelector('[data-slot="menu"]'), 'the menu') // flag
export const b = present<HTMLInputElement>(container.querySelector('[data-slot="input"]'), 'x') // flag
export const c = present(document.querySelector<HTMLElement>('[data-slot="chart-line"]'), 'x') // flag
export const d = present( // flag
	container.querySelector('[data-slot="grid-edit-slot"]'),
	'the editor slot',
)
export const e = present(row?.querySelector('[data-slot="swatch"]'), 'the swatch')
export const f = present(container.querySelector('[data-slot="list"] [role="option"]'), 'x')
export const g = present(container.querySelector('[data-slot]'), 'a slot')
export const h = present(container.querySelector('[aria-level="3"]'), 'a row')
export const i = container.querySelector('[data-slot="menu"]')
export const j = present(container.closest('[data-slot="menu"]'), 'the menu')
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
export const f = <div {...(open ? { 'data-open': true } : {})} /> // flag
export const g = <div {...(open ? { 'aria-busy': true } : {})} /> // flag
export const h = <div {...(open ? { 'data-open': '' } : {})} /> // flag
export const i = <div {...(open ? { title: alt } : {})} />
export const j = <div {...(open ? { 'data-state': 'open' } : {})} />
export const k = <div data-deferred={open ? undefined : ''} /> // flag
export const l = <div aria-hidden={open ? undefined : true} /> // flag
export const m = <div data-state={open ? undefined : 'closed'} />
export const n = <div {...(open ? {} : { 'data-closed': true })} /> // flag
export const o = <div {...(open ? {} : { title: alt })} />
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
	'no-key-after-spread': [
		{
			file: 'key.tsx',
			source: `declare const props: { title: string }
declare const items: { id: string }[]
export const a = items.map((item) => <td {...props} key={item.id} />) // flag
export const b = items.map((item) => (
	<td
		{...props}
		title="x"
		key={item.id} // flag
	>
		{item.id}
		{item.id}
	</td>
))
export const c = items.map((item) => <td key={item.id} {...props} />)
export const d = items.map((item) => <td title="x" key={item.id} />)
export const e = <td {...props} />
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
	'no-of-suffixed-binding': [
		{
			file: 'names.ts',
			source: `import { expectTypeOf } from 'vitest'
declare const rows: string[]
export function rowOf(index: number) { return rows[index] } // flag
export const labelOf = (index: number) => rows[index] // flag
export const sectionOf = new Map<string, string>() // flag
export const pick = (keyOf: (row: string) => string) => rows.map(keyOf) // flag
export const { sizeOf } = { sizeOf: 1 } // flag
export function getRow(index: number) { return rows[index] }
export const startOfDay = 0
export const messages = { pageOf: 'Page {page} of {total}' }
export const check = expectTypeOf
`,
		},
	],
	'no-alternate-predicate-binding': [
		{
			file: 'predicates.ts',
			source: `import { isSameMonth } from '@internationalized/date'
export function isSameDay(a: number, b: number) { return a === b } // flag
export const isInGrid = (node: unknown) => node !== null // flag
export const valuesEqual = (a: unknown, b: unknown) => a === b // flag
export function sameDay(a: number, b: number) { return a === b }
export const inGrid = (node: unknown) => node !== null
export const isInner = true
export const store = { isInRange: () => false }
export const check = isSameMonth
`,
		},
	],
	'no-camel-case-fixed-constant': [
		{
			file: 'constants.ts',
			source: `const layer = '@layer density' // flag
export const storageKey = 'docs:board' // flag
const ratio = 0.5 // flag
const minusSigns = /\\u2212/g // flag
const selector = \`:where(.\${layer})\` // flag
const LAYER = '@layer density'
let current = 'idle'
export const instant = false
export const revalidate = 60
const table = { ratio }
export function read() { const local = 'x'; return local + current + LAYER + table + minusSigns + selector + storageKey }
`,
		},
	],
	'no-physical-side': [
		{
			file: 'side.tsx',
			source: `export const a = 'flex text-left' // flag
export const b = <div className="md:text-right" /> // flag
export const c = 'ml-2 p-4' // flag
export const d = 'hover:-mr-px' // flag
export const e = \`absolute \${'x'} right-0\` // flag
export const f = 'border-l border-zinc-950/5' // flag
export const g = 'rounded-br-md' // flag
export const h = 'origin-top-left' // flag
export const i = 'left-[3px]' // flag
export const j = 'text-start ms-2 pe-4 start-0 border-s rounded-ee-md'
export const k = 'origin-left rtl:origin-right'
export const l = 'absolute left-1/2 -translate-x-1/2'
export const m = 'right-start'
export const n = 'inset-x-0 text-leftward'
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
	'no-twice-mixed-condition': [
		{
			file: 'conditions.ts',
			source: `export const a = (x: boolean, y: boolean, z: boolean, w: boolean) => x && (y || (z && w)) // flag
export const b = (x: boolean, y: boolean, z: boolean, w: boolean) => (x && (y || z)) || w // flag
export const c = (x: boolean, y: boolean, z: boolean, w: boolean) => x && ((y && z) || w) // flag
export const d = (x: boolean, y: boolean, z: boolean) => x && (y || z)
export const e = (x: boolean, y: boolean, z: boolean, w: boolean) => x || y || (z && w)
export const f = (x: boolean, y: boolean, z: boolean, w: boolean) => (x || y) && (z || w)
export const g = (x: boolean, y: boolean, z: boolean, w: boolean) => x && Boolean(y || (z && w))
`,
		},
	],
	'no-ui-anchor-selector': [
		{
			file: 'anchor.tsx',
			source: `export const a = <svg className="[&_[data-slot=map-points]]:opacity-50" /> // flag
export const b = () => document.querySelector('[data-slot="map-regions"]') // flag
export const c = \`has-data-[slot=map-regions]:ring-1 \${size}\` // flag
export const d = 'group-data-[slot=icon]:size-4' // flag
export const e = () => document.querySelectorAll("[data-slot^='map-']") // flag
export const f = <span data-slot="probe-label">Label</span>
export const g = <MapPlat recede={false} />
`,
		},
	],
	'no-ui-anchor-selector-css': [
		{
			file: 'anchor.css',
			source: `.a [data-slot=map-points] { fill: red; } /* flag */
.b [data-slot='map-regions'] { stroke: red; } /* flag */
.c:has([data-slot^="map-"]) { opacity: 0.5; } /* flag */
.d { @apply in-data-[slot=map-points]:fill-red-500; } /* flag */
.e { @apply [&_[data-slot=map-regions]]:opacity-50; } /* flag */
.f { @apply data-[state=open]:p-2; }
.g [data-state=open] { color: red; }
.h [data-slot] { color: red; }
/* .i [data-slot=probe] in a comment */
`,
		},
	],
	'no-unused-layout-read': [
		{
			file: 'reads.ts',
			source: `declare const el: HTMLElement
declare const key: string
declare function use(value: unknown): void
el.offsetHeight // flag
el.offsetWidth // flag
el.getBoundingClientRect() // flag
void key // flag
export const h = el.offsetHeight
use(el.getBoundingClientRect())
void use(1)
void 0
// el.offsetHeight in a comment
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
	'no-user-event-outside-setup-user': [
		{
			file: 'user.test.ts',
			source: `import userEvent from '@testing-library/user-event' // flag
import { userEvent as user } from '@testing-library/user-event' // flag
import type { UserEvent } from '@testing-library/user-event'
import { setupUser } from './setup-user'
declare const button: Element
export const a = () => userEvent.click(button) // flag
export const b = () => userEvent.setup({ delay: null }) // flag
export const c = () => user.click(button)
export const d = () => setupUser().click(button)
export const e = (person: UserEvent) => person.keyboard('{Escape}')
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
	'require-bare-icon-button': [
		{
			file: 'button.tsx',
			source: `export const a = <Button variant="plain" aria-label="A"><Icon icon={<X />} /></Button> // flag
export const b = <Button aria-label="B" prefix={<Icon icon={<X />} />} /> // flag
export const c = <Button variant="soft" aria-label="C" suffix={<Icon icon={<X />} />}></Button> // flag
export const d = <Button variant="plain" aria-label="D" // flag
>
	<Icon icon={<X />} />
</Button>
export const e = <Button variant="plain" aria-label="E" onClick={() => <Button variant="bare" />}><Icon icon={<X />} /></Button> // flag
export const f = <Button variant="bare" aria-label="F" prefix={<Icon icon={<X />} />} />
export const g = <Button variant="plain" prefix={<Icon icon={<X />} />}>Add</Button>
export const h = <Button variant="plain"><Icon icon={<X />} />Add</Button>
export const i = <Button variant="plain"><Icon icon={<X />} /><Badge /></Button>
export const j = <IconButton variant="solid" icon={<X />} aria-label="J" /> // flag
export const k = <IconButton // flag
	variant="plain"
	icon={<X />}
	aria-label="K"
/>
export const l = <IconButton icon={<X />} aria-label="L" />
export const m = <IconButton variant="bare" icon={<X />} aria-label="M" />
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

/**
 * For each plugin, a directory in its scope and a path out of it. A probe goes
 * in a directory of its own under a directory, and a path that ends in `.ts` or
 * `.tsx` is the probe itself, such as a file that the scope leaves out.
 */
const SCOPE: Record<string, { in: string; out: string }> = {
	'no-abbreviated-binding': { in: 'packages/ui/src/hooks', out: 'patches' },
	'no-alternate-predicate-binding': { in: 'apps/places/src', out: 'patches' },
	'no-api-above-browser-floor': { in: 'apps/places/src', out: 'apps/places/src/server' },
	'no-camel-case-data-slot': { in: 'packages/ui/src/components', out: 'packages/shared/src' },
	'no-camel-case-fixed-constant': { in: 'packages/ui/src/hooks', out: 'packages/ui/src/recipes' },
	'no-client-directive-in-route-file': { in: 'apps/places/app', out: 'apps/places/src' },
	'no-client-gateway-access': { in: 'apps/places/src', out: 'apps/places/src/server' },
	'no-faint-text-color': { in: 'apps/places/src', out: 'packages/ui/src/components' },
	'no-formatjs-import-outside-intl': {
		in: 'packages/ui/src/components',
		out: 'packages/ui/src/primitives/intl',
	},
	'no-full-motion-component': {
		in: 'packages/ui/src/components',
		out: 'packages/ui/src/primitives/reduced-motion/reduced-motion-elements.ts',
	},
	'no-hand-composed-handler': { in: 'packages/shared/src', out: 'apps/places/src' },
	'no-hand-written-aria-check': {
		in: 'packages/ui/src/__tests__/components',
		out: 'packages/ui/src/components',
	},
	'no-hand-written-get-slot': {
		in: 'packages/ui/src/__tests__/browser',
		out: 'packages/ui/src/components',
	},
	'no-hand-written-bool-attr': { in: 'packages/ui/src/components', out: 'apps/places/src' },
	'no-hand-written-clamp': {
		in: 'packages/ui/src/hooks',
		out: 'packages/ui/src/utilities/clamp.ts',
	},
	'no-hand-written-fold': { in: 'apps/places/src', out: 'packages/ui/src/utilities/fold-text.ts' },
	'no-inline-spacing-calc': { in: 'packages/ui/src/recipes', out: 'packages/ui/src/hooks' },
	'no-key-after-spread': { in: 'apps/places/src', out: 'patches' },
	'no-motion-reduced-motion-hook': {
		in: 'packages/ui/src/hooks',
		out: 'packages/ui/src/__tests__',
	},
	'no-of-suffixed-binding': { in: 'packages/shared/src', out: 'patches' },
	'no-physical-side': { in: 'packages/ui/src/docs', out: 'packages/ui/src/utilities' },
	'no-react-create-context': {
		in: 'packages/ui/src/primitives',
		out: 'packages/ui/src/core/create-context.ts',
	},
	'no-renamed-spacing-utility': { in: 'packages/ui/src/layouts', out: 'packages/ui/src/hooks' },
	'no-respelled-orientation': { in: 'packages/ui/src/utilities', out: 'packages/ui/src/recipes' },
	'no-twice-mixed-condition': { in: 'packages/ui/src/hooks', out: 'patches' },
	'no-ui-anchor-selector': { in: 'apps/places/src', out: 'apps/places/src/__tests__' },
	'no-ui-anchor-selector-css': { in: 'packages/shared/src', out: 'packages/ui/src' },
	'no-unused-layout-read': {
		in: 'packages/ui/src/hooks',
		out: 'packages/ui/src/utilities/force-style-flush.ts',
	},
	'no-use-prefixed-type-name': {
		in: 'packages/ui/src/providers',
		out: 'packages/ui/src/utilities',
	},
	'no-user-event-outside-setup-user': {
		in: 'packages/ui/src/__tests__/components',
		out: 'packages/ui/src/__tests__/browser',
	},
	'no-value-import-from-sibling-kata': {
		in: 'packages/ui/src/recipes/kata',
		out: 'packages/ui/src/recipes/kiso',
	},
	'no-value-import-from-tanstack-table': {
		in: 'packages/ui/src/modules/grid',
		out: 'packages/ui/src/modules/grid/engine',
	},
	'no-whole-floating-context-dep': {
		in: 'packages/ui/src/components',
		out: 'packages/ui/src/__benchmarks__',
	},
	'require-bare-icon-button': { in: 'apps/places/src', out: 'apps/numbers/src' },
	'require-client-directive-in-hooks': {
		in: 'packages/ui/src/hooks',
		out: 'packages/ui/src/hooks/index.ts',
	},
}

/** The path of a probe of `plugin` at `place`, for its fixture `file`. */
function probePath(plugin: string, place: string, file: string): string {
	return /\.tsx?$/.test(place) ? place : join(place, `zz-scope-${plugin}`, file)
}

/** The plugin of each diagnostic message, from the `register_diagnostic` calls of each plugin. */
function messageOwners(): Map<string, string> {
	const owners = new Map<string, string>()

	for (const plugin of pluginNames()) {
		const source = readFileSync(join(pluginDir, `${plugin}.grit`), 'utf8')

		for (const match of source.matchAll(/message = "((?:[^"\\]|\\.)*)"/g)) {
			owners.set((match[1] ?? '').replace(/\\(.)/g, '$1'), plugin)
		}
	}

	return owners
}

/** The plugins on disk, by name. */
function pluginNames(): string[] {
	return readdirSync(pluginDir)
		.filter((file) => file.endsWith('.grit'))
		.map((file) => file.slice(0, -'.grit'.length))
		.sort()
}

/** One `::error title=…,file=…,line=…` row of the `github` reporter. */
const ROW = /^::\w+ title=([^,]+),file=([^,]+),line=(\d+),.*?::(.*)$/

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
				// The real config parses the Tailwind directives, such as `@apply`, so a
				// CSS fixture can hold one.
				css: { parser: { tailwindDirectives: true } },
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

describe('biome plugin scope', () => {
	let root = ''

	/** The diagnostics of each plugin, as `<plugin> <file>:<line>`. */
	const found: string[] = []

	beforeAll(() => {
		root = realpathSync(mkdtempSync(join(tmpdir(), 'biome-scope-')))

		cpSync(join(workspaceRoot, '.biome'), join(root, '.biome'), { recursive: true })

		const config = JSON.parse(readFileSync(join(workspaceRoot, 'biome.json'), 'utf8'))

		// The root is not a repository, so Biome reads no ignore file.
		writeFileSync(join(root, 'biome.json'), JSON.stringify({ ...config, vcs: { enabled: false } }))

		for (const [plugin, scope] of Object.entries(SCOPE)) {
			const fixture = FIXTURES[plugin]?.[0]

			if (!fixture) continue

			for (const place of [scope.in, scope.out]) {
				const path = join(root, probePath(plugin, place, fixture.file))

				mkdirSync(dirname(path), { recursive: true })

				writeFileSync(path, fixture.source)
			}
		}

		const run = spawnSync(
			process.execPath,
			[biome, 'lint', '--reporter=github', '--max-diagnostics=none', '.'],
			{ cwd: root, encoding: 'utf8' },
		)

		const owners = messageOwners()

		for (const line of `${run.stdout}\n${run.stderr}`.split('\n')) {
			const row = ROW.exec(line)

			const plugin = row?.[1] === 'plugin' ? owners.get(row[4] ?? '') : undefined

			if (row && plugin) found.push(`${plugin} ${relative(root, row[2] ?? '')}:${row[3]}`)
		}
	})

	afterAll(() => {
		if (root) rmSync(root, { recursive: true, force: true })
	})

	it('names a scope for every plugin on disk, at paths that exist', () => {
		expect(Object.keys(SCOPE).sort(), 'give each plugin an entry in SCOPE').toEqual(pluginNames())

		const missing = Object.values(SCOPE)
			.flatMap((scope) => [scope.in, scope.out])
			.filter((place) => !existsSync(join(workspaceRoot, place)))

		expect(missing, 'a scope path that the repository does not hold').toEqual([])
	})

	it('runs each plugin in its scope, and not out of it', () => {
		const expected = Object.entries(SCOPE)
			.flatMap(([plugin, scope]) => {
				const fixture = FIXTURES[plugin]?.[0]

				if (!fixture) return []

				return fixture.source
					.split('\n')
					.flatMap((line, index) =>
						FLAG.test(line)
							? [`${plugin} ${probePath(plugin, scope.in, fixture.file)}:${index + 1}`]
							: [],
					)
			})
			.sort()

		// A probe can trip a second plugin whose scope also holds it. Only the
		// diagnostics of a plugin on its own probes count.
		const own = found.filter((entry) => {
			const [plugin = '', place = ''] = entry.split(' ')

			const scope = SCOPE[plugin]

			const file = FIXTURES[plugin]?.[0]?.file ?? ''

			return (
				scope !== undefined &&
				[scope.in, scope.out].some((at) => place.startsWith(`${probePath(plugin, at, file)}:`))
			)
		})

		expect(own.sort()).toEqual(expected)
	})
})
