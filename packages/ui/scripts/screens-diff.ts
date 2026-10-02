/**
 * Compares two folders of screenshots from `screens.ts`, and writes a report
 * of the screenshots that changed.
 *
 * Run it with `pnpm --filter ui screens:diff <base> <current> <out>`. Add
 * `--partial` when the current folder holds only some pages, so that the
 * report does not list the other pages as removed. For each
 * changed screenshot, the script writes `<out>/<name>`: the base, the current
 * screenshot, and the difference, side by side. It also writes
 * `<out>/report.md` and `<out>/report.json`, and gives the result in its
 * output. A change does not make the script fail, because a change can be
 * intended. A person decides.
 *
 * Pixelmatch ignores the anti-aliased pixels and the small color differences
 * below `THRESHOLD`. Each other pixel that differs counts.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

/** The color distance, from 0 to 1, below which pixelmatch counts two pixels as equal. */
const THRESHOLD = 0.1

/** The width of the gap between the panels of a side-by-side image, in pixels. */
const GAP = 8

type Change = {
	name: string
	/** The pixels that differ. `null` when the size of the screenshot changed. */
	pixels: number | null
	/** The share of the pixels that differ, from 0 to 1. */
	ratio: number | null
	base: { width: number; height: number }
	current: { width: number; height: number }
}

const args = process.argv.slice(2)

const partial = args.includes('--partial')

const [baseArg, currentArg, outArg] = args.filter((arg) => !arg.startsWith('--'))

if (!baseArg || !currentArg || !outArg) {
	throw new Error('screens:diff: give the base folder, the current folder, and the out folder.')
}

const [base, current, out] = [baseArg, currentArg, outArg].map((dir) => resolve(dir)) as [
	string,
	string,
	string,
]

const baseNames = await listPngs(base)

const currentNames = await listPngs(current)

const added = currentNames.filter((name) => !baseNames.includes(name))

const removed = partial ? [] : baseNames.filter((name) => !currentNames.includes(name))

const changes: Change[] = []

await rm(out, { recursive: true, force: true })

await mkdir(out, { recursive: true })

for (const name of currentNames.filter((name) => baseNames.includes(name))) {
	const before = PNG.sync.read(await readFile(join(base, name)))

	const after = PNG.sync.read(await readFile(join(current, name)))

	const sameSize = before.width === after.width && before.height === after.height

	let diff: PNG | undefined

	let pixels: number | null = null

	if (sameSize) {
		diff = new PNG({ width: after.width, height: after.height })

		pixels = pixelmatch(before.data, after.data, diff.data, after.width, after.height, {
			threshold: THRESHOLD,
		})

		if (pixels === 0) continue
	}

	changes.push({
		name,
		pixels,
		ratio: pixels === null ? null : pixels / (after.width * after.height),
		base: { width: before.width, height: before.height },
		current: { width: after.width, height: after.height },
	})

	await writeFile(join(out, name), PNG.sync.write(sideBySide([before, after, diff])))
}

// The size changes come first, then the largest pixel counts.
const rank = (change: Change) => change.pixels ?? Number.POSITIVE_INFINITY

changes.sort((a, b) => (rank(a) === rank(b) ? 0 : rank(a) < rank(b) ? 1 : -1))

const compared = currentNames.length - added.length

const summary = `${compared} compared, ${changes.length} changed, ${added.length} new, ${removed.length} removed`

await writeFile(
	join(out, 'report.json'),
	`${JSON.stringify({ threshold: THRESHOLD, compared, changes, added, removed }, null, '\t')}\n`,
)

await writeFile(join(out, 'report.md'), report())

console.log(`screens:diff: ${summary}.`)

for (const change of changes) console.log(`screens:diff: changed ${describe(change)}`)

for (const name of added) console.log(`screens:diff: new ${name}`)

for (const name of removed) console.log(`screens:diff: removed ${name}`)

async function listPngs(dir: string) {
	const names = await readdir(dir).catch(() => [])

	return names.filter((name) => name.endsWith('.png')).sort()
}

function describe({ name, pixels, ratio, base, current }: Change) {
	if (pixels === null || ratio === null) {
		return `${name}: the size changed from ${base.width}×${base.height} to ${current.width}×${current.height}`
	}

	return `${name}: ${pixels} px (${(ratio * 100).toFixed(2)}%)`
}

function report() {
	const lines = [`# Screens: ${summary}`, '']

	if (changes.length) {
		lines.push('## Changed', '', ...changes.map((change) => `- ${describe(change)}`), '')
	}

	if (added.length) lines.push('## New', '', ...added.map((name) => `- ${name}`), '')

	if (removed.length) lines.push('## Removed', '', ...removed.map((name) => `- ${name}`), '')

	return `${lines.join('\n').trimEnd()}\n`
}

/** Put the images in one row, with a gap between them. A missing image leaves its panel empty. */
function sideBySide(images: (PNG | undefined)[]) {
	const widths = images.map((image) => image?.width ?? images[0]?.width ?? 0)

	const width = widths.reduce((sum, value) => sum + value, 0) + GAP * (images.length - 1)

	const height = Math.max(...images.map((image) => image?.height ?? 0))

	const row = new PNG({ width, height })

	row.data.fill(255)

	let x = 0

	images.forEach((image, index) => {
		if (image) PNG.bitblt(image, row, 0, 0, image.width, image.height, x, 0)

		x += (widths[index] ?? 0) + GAP
	})

	return row
}
