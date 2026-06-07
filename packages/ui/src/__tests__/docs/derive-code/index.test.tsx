import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { deriveCode } from '../../../docs/derive-code'
import { GlassProvider } from '../../../providers/glass'
import { tag } from './helpers'

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

describe('deriveCode child ordering', () => {
	const Card = tag<{ children?: unknown }>('Card', 'card')

	const Icon = tag<{ name?: string }>('Icon', 'icon')

	const Button = tag<{ variant?: string; children?: unknown }>('Button', 'button')

	it('coalesces adjacent text leaves so inline interpolation stays on one line', () => {
		const Tooltip = tag<{ children?: unknown }>('Tooltip', 'tooltip')

		const placement = 'left'

		const tree = createElement(Tooltip, null, 'Tooltip on ', placement)

		const result = deriveCode(tree)

		expect(result).toContain('<Tooltip>Tooltip on left</Tooltip>')
	})

	it('keeps text at the top level (deriveCode called with mixed children)', () => {
		const Button = tag<{ children?: unknown }>('Button', 'button')

		const result = deriveCode(['Heading text', createElement(Button, null, 'Click')])

		expect(result).toContain('Heading text')

		expect(result).toContain('<Button>Click</Button>')
	})

	it('preserves source order of mixed text and element children', () => {
		const tree = createElement(
			Card,
			null,
			createElement(Icon, { name: 'star' }),
			'Hello',
			createElement(Button, null, 'Click'),
		)

		const result = deriveCode(tree)

		const body = (result ?? '').split('\n\n').slice(1).join('\n')

		const iconIndex = body.indexOf('<Icon')

		const helloIndex = body.indexOf('Hello')

		const buttonIndex = body.indexOf('<Button')

		expect(iconIndex).toBeGreaterThanOrEqual(0)

		expect(helloIndex).toBeGreaterThan(iconIndex)

		expect(buttonIndex).toBeGreaterThan(helloIndex)
	})
})

describe('deriveCode provider wrappers', () => {
	const DatePicker = tag<{ range?: boolean; placeholder?: string }>('DatePicker', 'date-picker')

	it('renders a tagged provider wrapper and emits its nested import', () => {
		// `GlassProvider` is the real export — importing it through the vitest
		// vite pipeline applies the component-tags transform, so the walker sees
		// it as a recognized component rather than transparently unwrapping it.
		const tree = createElement(
			GlassProvider,
			null,
			createElement(DatePicker, { range: true, placeholder: 'Select date range' }),
		)

		const result = deriveCode(tree)

		expect(result).toContain("import { GlassProvider } from 'ui/providers/glass'")

		expect(result).toContain("import { DatePicker } from 'ui/date-picker'")

		expect(result).toMatch(
			/<GlassProvider>\n\s+<DatePicker range placeholder="Select date range" \/>\n<\/GlassProvider>/,
		)
	})
})

describe('deriveCode prop formatting', () => {
	it('escapes embedded quotes in array-literal props', () => {
		const Foo = tag<{ tags?: string[] }>('Foo', 'foo')

		const tree = createElement(Foo, { tags: ["it's", 'fine'] })

		const result = deriveCode(tree)

		expect(result).toContain('tags={["it\'s", "fine"]}')
	})
})

describe('deriveCode + __code', () => {
	it('renders the helper function snippet verbatim and infers imports', () => {
		const AreaDemo = Object.assign(
			function AreaDemo() {
				return null
			},
			{
				__code: [
					'function AreaDemo() {',
					'\tconst [files, setFiles] = useState<File[]>([])',
					'',
					'\treturn (',
					'\t\t<Stack>',
					'\t\t\t<FileUpload accept="image/*" onFiles={setFiles} />',
					'\t\t</Stack>',
					'\t)',
					'}',
				].join('\n'),
			},
		)

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

	it('infers React 19 hook imports (use, useActionState, useOptimistic, useFormStatus)', () => {
		const FormDemo = Object.assign(
			function FormDemo() {
				return null
			},
			{
				__code: [
					'function FormDemo() {',
					'\tconst data = use(promise)',
					'\tconst [state, action] = useActionState(submit, null)',
					'\tconst [optimistic, addOptimistic] = useOptimistic(items)',
					'\tconst status = useFormStatus()',
					'\treturn <form />',
					'}',
				].join('\n'),
			},
		)

		const result = deriveCode(createElement(FormDemo))

		expect(result).toMatch(/import \{[^}]*\buse\b[^}]*\} from 'react'/)

		expect(result).toMatch(/import \{[^}]*useActionState[^}]*\} from 'react'/)

		expect(result).toMatch(/import \{[^}]*useOptimistic[^}]*\} from 'react'/)

		expect(result).toMatch(/import \{[^}]*useFormStatus[^}]*\} from 'react'/)
	})

	it('does not mistake method calls for React hooks', () => {
		// `<Stack />` is a real recognized component, so `deriveCode` returns a
		// non-null code block — needed to assert "the block contains no React
		// `use` import" via toMatch.
		const MethodDemo = Object.assign(
			function MethodDemo() {
				return null
			},
			{
				__code: [
					'function MethodDemo() {',
					'\tconst result = router.use(plugin)',
					'\treturn <Stack />',
					'}',
				].join('\n'),
			},
		)

		const result = deriveCode(createElement(MethodDemo))

		expect(result).not.toBeNull()

		expect(result).not.toMatch(/import \{[^}]*\buse\b[^}]*\} from 'react'/)
	})
})
