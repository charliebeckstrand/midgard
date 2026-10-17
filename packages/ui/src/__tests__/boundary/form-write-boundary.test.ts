import { describe, expect, it } from 'vitest'
import {
	docsSites,
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// A submit locks the fields of its form. The setter of `useFormField` refuses a
// write while the submit runs, and each bindable control writes through that
// setter, directly or through `useFormValue`, `useFormToggle`, or
// `useInputValue`. The form actions write past the lock, because a write from
// the app, such as a fetch that fills a field, must land. So a part that
// reaches the actions, or the whole form state with them, can write past the
// lock. This test holds each such reach to a list, with the reason that the
// part writes no field.

/** The form module and the binding primitive own the lock, so they can reach the actions. */
const OWNERS = ['modules/form/', 'primitives/form/']

/** A call that reaches the form actions: the actions alone, or the state with them. */
const REACH = /\buse(?:FormActions|FormContext)\(/

/** Each part that reaches the form actions, with the reason that it writes no field. */
const READERS: Record<string, string> = {
	'components/password-confirm/password-confirm.tsx':
		'reads the errors of its two fields to place its mismatch message',
}

/** The files outside the owners that reach the form actions. */
function reaches(): string[] {
	const found: string[] = []

	walkSource(
		srcDir,
		(file, content) => {
			if (!isSourceFile(file)) return

			const path = srcRelative(file)

			if (OWNERS.some((owner) => path.startsWith(owner))) return

			if (REACH.test(stripSourceComments(content))) found.push(path)
		},
		docsSites,
	)

	return found.sort()
}

describe('form write boundary', () => {
	it('lets only a listed reader reach the form actions', () => {
		const strays = reaches().filter((path) => !(path in READERS))

		expect(
			strays,
			`a part reaches the form actions, which write past the lock of a submit. Write through useFormField, or list the part in READERS with the reason that it writes no field:\n  ${strays.join('\n  ')}`,
		).toEqual([])
	})

	it('lists no reader that no longer reaches the form actions', () => {
		const found = new Set(reaches())

		const stale = Object.keys(READERS).filter((path) => !found.has(path))

		expect(stale, `stale READERS entries:\n  ${stale.join('\n  ')}`).toEqual([])
	})

	it('finds a part that reaches the form actions', () => {
		expect(reaches()).toContain('components/password-confirm/password-confirm.tsx')
	})
})
