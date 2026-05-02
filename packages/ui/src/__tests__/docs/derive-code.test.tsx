import { createElement, type FunctionComponent } from 'react'
import { describe, expect, it } from 'vitest'
import { deriveCode } from '../../docs/derive-code'

function tag<P>(name: string, mod: string): FunctionComponent<P> {
	const Component: FunctionComponent<P> = () => null

	Object.assign(Component, { __name: name, __module: mod, displayName: name })

	return Component
}

describe('deriveCode iteration vs authored siblings', () => {
	const Group = tag<{ size?: string; children?: unknown }>('Group', 'group')
	const Button = tag<{ variant?: string; children?: unknown }>('Button', 'button')
	const Listbox = tag<{ children?: unknown }>('Listbox', 'listbox')
	const ListboxOption = tag<{ value: string; children?: unknown }>('ListboxOption', 'listbox')

	it('keeps authored sibling repetition intact (no dedup without keys)', () => {
		const tree = createElement(
			Group,
			{ size: 'sm' },
			createElement(Button, { variant: 'outline' }, 'sm'),
			createElement(Button, { variant: 'outline' }, 'sm'),
			createElement(Button, { variant: 'outline' }, 'sm'),
		)

		const result = deriveCode(tree)

		const buttonLines = (result ?? '').split('\n').filter((line) => line.includes('<Button'))

		expect(buttonLines).toHaveLength(3)
	})

	it('collapses 3+ identical iterated siblings (mapped with explicit keys)', () => {
		const items = ['a', 'b', 'c', 'd']

		const tree = createElement(
			Listbox,
			null,
			items.map((value) =>
				createElement(ListboxOption, { key: value, value: 'same' }, 'Same label'),
			),
		)

		const result = deriveCode(tree)

		const optionLines = (result ?? '').split('\n').filter((line) => line.includes('<ListboxOption'))

		expect(optionLines).toHaveLength(1)
	})

	it('keeps distinct iterated siblings even when keyed', () => {
		const tree = createElement(Listbox, null, [
			createElement(ListboxOption, { key: 'a', value: 'a' }, 'Alpha'),
			createElement(ListboxOption, { key: 'b', value: 'b' }, 'Bravo'),
			createElement(ListboxOption, { key: 'c', value: 'c' }, 'Charlie'),
		])

		const result = deriveCode(tree)

		const optionLines = (result ?? '').split('\n').filter((line) => line.includes('<ListboxOption'))

		expect(optionLines).toHaveLength(3)
	})
})

describe('deriveCode + __code', () => {
	it('renders the helper function snippet verbatim and infers imports', () => {
		function AreaDemo() {
			return null
		}

		;(AreaDemo as unknown as { __code: string }).__code = [
			'function AreaDemo() {',
			'\tconst [files, setFiles] = useState<File[]>([])',
			'',
			'\treturn (',
			'\t\t<Stack>',
			'\t\t\t<FileUpload accept="image/*" onFiles={setFiles} />',
			'\t\t</Stack>',
			'\t)',
			'}',
		].join('\n')

		const result = deriveCode(createElement(AreaDemo))

		expect(result).not.toBeNull()

		// Whole function body preserved verbatim (at column 0 for the outer <Example>).
		expect(result).toContain(
			'function AreaDemo() {\n\tconst [files, setFiles] = useState<File[]>([])',
		)
		expect(result).toContain('<FileUpload accept="image/*" onFiles={setFiles} />')

		// UI component imports scanned from the JSX.
		expect(result).toMatch(/import \{.*Stack.*\} from 'ui\/stack'/)
		expect(result).toMatch(/import \{.*FileUpload.*\} from 'ui\/file-upload'/)

		// React hook imports scanned from the body.
		expect(result).toMatch(/import \{.*useState.*\} from 'react'/)
	})
})
