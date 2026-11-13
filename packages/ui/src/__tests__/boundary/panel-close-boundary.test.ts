// @vitest-environment node
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { workspaceRoot, workspaceSources } from '../helpers/walk-source'

// Panel close boundary.
//
// The X close of a Dialog, a Drawer, or a Sheet comes from the `closable` prop
// of its header. The header puts the X at the end of the line of the title,
// labels it "Close" in the language of the reader, and keeps it live in a
// locked scope. A close control built by hand repeats that work, and the copies
// drift: the label of each copy was an English literal. This test fails on a
// `DialogClose`, a `DrawerClose`, or a `SheetClose` that holds an X icon. The
// standard Close button of a footer, and a close with a text child, pass.

/** A close control of a panel that holds the X icon of lucide. */
const HAND_X = /<(Dialog|Drawer|Sheet)Close>(?:(?!<\/\1Close>)[\s\S])*?<X\s*\/>/

/** The text of each hand-built X close in a source, as a fix. */
function handCloses(code: string): string[] {
	return [...code.matchAll(new RegExp(HAND_X, 'g'))].map(([, family]) => `${family}Close`)
}

describe('panel close boundary', () => {
	const files = workspaceSources([join(workspaceRoot, 'apps'), join(workspaceRoot, 'packages')])

	it('reads the sources of the apps and the packages', () => {
		// A walk that read no file would pass the case below with an empty list.
		expect(files.size).toBeGreaterThan(500)
	})

	it('builds no X close by hand', () => {
		const violations = [...files].flatMap(([file, code]) =>
			handCloses(code).map((close) => `${file}: ${close} with an X icon`),
		)

		expect(violations, 'give the header `closable` in place of the X close').toEqual([])
	})

	it('finds an X in a close control, and passes a close with text', () => {
		expect(
			handCloses(`
				<SheetClose>
					<Button type="button" variant="bare" aria-label="Close">
						<Icon icon={<X />} />
					</Button>
				</SheetClose>
				<DialogClose>
					<Button type="button">Done</Button>
				</DialogClose>
				<DrawerClose />
				<Icon icon={<X />} />
			`),
		).toEqual(['SheetClose'])
	})
})
