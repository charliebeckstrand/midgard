import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as kiso from '../../recipes/kiso'
import { isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// The token families of kiso (`recipes/kiso/README.md`).
//
// Kiso is the Japanese layer. Each family has a Japanese name, and each key
// under it has an English name. A group, which is the structure of a family of
// components, is in kumi and has an English name. This gate holds the list of
// families:
//
//   - The barrel of kiso exports each family and no other value.
//   - Each entry of the kiso folder is a family: a folder, or one flat file.
//   - The README of kiso names each family with its kanji.
//   - A kata or a group reads kiso through the barrel only, so a fragment that
//     the barrel does not export is not part of the token layer.
//
// To add a family, add it here with its kanji and its meaning.

/** The families of kiso: the kanji and the meaning of each name. */
const FAMILIES: Record<string, readonly [kanji: string, meaning: string]> = {
	dan: ['段', 'step: the density ramps'],
	hannou: ['反応', 'response: the interaction feedback'],
	iro: ['色', 'color'],
	ji: ['字', 'character: the typography'],
	kara: ['空', 'emptiness: the virtualized empty state'],
	kasane: ['重ね', 'layering: the chrome stack and the radius'],
	kokkaku: ['骨格', 'skeleton: the placeholder forms'],
	ma: ['間', 'space: the spacing scale'],
	narabi: ['並び', 'arrangement: the layout of siblings'],
	omote: ['面', 'surface: the fills and the chromes'],
	sen: ['線', 'line: the borders, the rings, and the focus'],
	shaku: ['尺', 'measure: the dimension scales'],
	sou: ['層', 'stratum: the stacking order'],
	tsunagi: ['繋ぎ', 'joint: the joins of a group'],
	ugoki: ['動き', 'motion'],
	zu: ['図', 'figure: the data visualization'],
}

const names = Object.keys(FAMILIES).sort()

const kisoDir = join(srcDir, 'recipes', 'kiso')

describe('kiso families', () => {
	it('the barrel exports each family and no other value', () => {
		expect(Object.keys(kiso).sort()).toEqual(names)
	})

	it('each entry of the kiso folder is a family', () => {
		const entries = readdirSync(kisoDir, { withFileTypes: true })
			.filter((entry) => entry.name !== 'index.ts' && entry.name !== 'README.md')
			.map((entry) => (entry.isDirectory() ? entry.name : entry.name.replace(/\.ts$/, '')))
			.sort()

		expect(entries).toEqual(names)
	})

	it('the README names each family with its kanji', () => {
		const readme = readFileSync(join(kisoDir, 'README.md'), 'utf8')

		const missing = Object.entries(FAMILIES)
			.filter(([name, [kanji]]) => !readme.includes(`\`${name}`) || !readme.includes(kanji))
			.map(([name]) => name)

		expect(missing).toEqual([])
	})

	it('a kata or a group reads kiso through the barrel only', () => {
		const deep = /from\s+['"](?:\.\.\/)+kiso\/[^'"]+['"]/

		const found: string[] = []

		for (const layer of ['kata', 'kumi']) {
			walkSource(join(srcDir, 'recipes', layer), (file, content) => {
				if (isSourceFile(file) && deep.test(content)) found.push(srcRelative(file))
			})
		}

		expect(found).toEqual([])
	})
})
