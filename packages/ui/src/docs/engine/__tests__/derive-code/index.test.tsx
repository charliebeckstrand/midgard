import { Star } from 'lucide-react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { type ComponentRegistry, deriveCode } from '../../derive-code'
import { readTag } from '../../derive-code/registry'
import { tag } from './helpers'

// Agnostic: a synthetic registry stands in for a real library's, so snippet-tag
// and external-icon resolution are exercised without scanning ui. It pairs the
// real `byType` tag reader (so `tag()` stand-ins resolve) with a hand-built
// `byName` map, and is injected into `deriveCode` per call. Injection rather
// than `vi.mock`-ing `virtual:component-modules` on purpose: that module-level
// mock bleeds across files under the shared-worker vmThreads pool and corrupts
// the real-registry integration test (src/__tests__/docs/component-modules).
// Real-library integration (the map populated from ui, real barrel tagging)
// lives in ui.
const registry: ComponentRegistry = {
	byType: { get: readTag },
	byName: new Map([
		['Stack', { name: 'Stack', module: 'stack' }],
		['FileUpload', { name: 'FileUpload', module: 'file-upload' }],
		['Star', { name: 'Star', module: 'lucide-react', external: true }],
	]),
	packageName: 'ui',
}

describe('deriveCode external components', () => {
	it('renders an external icon prop and emits its bare-specifier import', () => {
		const Icon = tag<{ icon?: unknown; size?: number }>('Icon', 'icon')

		const tree = createElement(Icon, { icon: createElement(Star), size: 32 })

		expect(deriveCode(tree, registry)).toBe(
			[
				`import { Icon } from 'ui/icon'`,
				`import { Star } from 'lucide-react'`,
				'',
				'<Icon icon={<Star />} size={32} />',
			].join('\n'),
		)
	})

	it('renders an external icon as a direct child', () => {
		const Button = tag<{ children?: unknown }>('Button', 'button')

		const tree = createElement(Button, null, createElement(Star))

		expect(deriveCode(tree, registry)).toBe(
			[
				`import { Button } from 'ui/button'`,
				`import { Star } from 'lucide-react'`,
				'',
				'<Button>',
				'  <Star />',
				'</Button>',
			].join('\n'),
		)
	})
})

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

		const result = deriveCode(tree, registry)

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

		const result = deriveCode(tree, registry)

		const optionLines = (result ?? '').split('\n').filter((line) => line.includes('<ListboxOption'))

		expect(optionLines).toHaveLength(1)
	})

	it('collapses a keyed `.map()` run nested beside another child', () => {
		// A map result sharing its parent with a sibling is a nested array, so
		// `Children.toArray` keys it `.<n>:$k` rather than the top-level `.$k`.
		// The run must still collapse.
		const items = ['a', 'b', 'c', 'd']

		const tree = createElement(
			Listbox,
			null,
			'Choose',
			items.map((value) =>
				createElement(ListboxOption, { key: value, value: 'same' }, 'Same label'),
			),
		)

		const result = deriveCode(tree, registry)

		const optionLines = (result ?? '').split('\n').filter((line) => line.includes('<ListboxOption'))

		expect(optionLines).toHaveLength(1)
	})

	it('keeps distinct iterated siblings even when keyed', () => {
		const tree = createElement(Listbox, null, [
			createElement(ListboxOption, { key: 'a', value: 'a' }, 'Alpha'),
			createElement(ListboxOption, { key: 'b', value: 'b' }, 'Bravo'),
			createElement(ListboxOption, { key: 'c', value: 'c' }, 'Charlie'),
		])

		const result = deriveCode(tree, registry)

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

		const result = deriveCode(tree, registry)

		expect(result).toContain('<Tooltip>Tooltip on left</Tooltip>')
	})

	it('keeps text at the top level (deriveCode called with mixed children)', () => {
		const Button = tag<{ children?: unknown }>('Button', 'button')

		const result = deriveCode(['Heading text', createElement(Button, null, 'Click')], registry)

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

		const result = deriveCode(tree, registry)

		const body = (result ?? '').split('\n\n').slice(1).join('\n')

		const iconIndex = body.indexOf('<Icon')

		const helloIndex = body.indexOf('Hello')

		const buttonIndex = body.indexOf('<Button')

		expect(iconIndex).toBeGreaterThanOrEqual(0)

		expect(helloIndex).toBeGreaterThan(iconIndex)

		expect(buttonIndex).toBeGreaterThan(helloIndex)
	})
})

describe('deriveCode prop formatting', () => {
	it('escapes embedded quotes in array-literal props', () => {
		const Foo = tag<{ tags?: string[] }>('Foo', 'foo')

		const tree = createElement(Foo, { tags: ["it's", 'fine'] })

		const result = deriveCode(tree, registry)

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

		const result = deriveCode(createElement(AreaDemo), registry)

		expect(result).not.toBeNull()

		// Function body is preserved verbatim at column 0.
		expect(result).toContain(
			'function AreaDemo() {\n\tconst [files, setFiles] = useState<File[]>([])',
		)

		expect(result).toContain('<FileUpload accept="image/*" onFiles={setFiles} />')

		// Component imports inferred from JSX, under the library prefix.
		expect(result).toMatch(/import \{.*Stack.*\} from 'ui\/stack'/)

		expect(result).toMatch(/import \{.*FileUpload.*\} from 'ui\/file-upload'/)

		// React hook imports inferred from the body.
		expect(result).toMatch(/import \{.*useState.*\} from 'react'/)
	})

	it('infers React 19 hook imports, sourcing react-dom hooks from react-dom', () => {
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

		const result = deriveCode(createElement(FormDemo), registry)

		expect(result).toMatch(/import \{[^}]*\buse\b[^}]*\} from 'react'/)

		expect(result).toMatch(/import \{[^}]*useActionState[^}]*\} from 'react'/)

		expect(result).toMatch(/import \{[^}]*useOptimistic[^}]*\} from 'react'/)

		expect(result).toMatch(/import \{[^}]*useFormStatus[^}]*\} from 'react-dom'/)
	})

	it('does not mistake method calls for React hooks', () => {
		// `<Stack />` is a recognized component (synthetic map), so `deriveCode`
		// returns a non-null block, enabling the `toMatch` assertion below.
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

		const result = deriveCode(createElement(MethodDemo), registry)

		expect(result).not.toBeNull()

		expect(result).not.toMatch(/import \{[^}]*\buse\b[^}]*\} from 'react'/)
	})
})
