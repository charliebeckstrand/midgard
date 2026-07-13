import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type ComponentApi, createExtractor, type ModuleApi, type PropDef } from '../extractor'

const FIXTURE_DIR = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'fixtures',
	'components',
)

// One extraction over the fixture package feeds every suite below; the
// program build dominates the cost, so it runs once per file, through the
// same public seam a build consumer uses.
let moduleApi: ModuleApi

beforeAll(() => {
	const snapshot = createExtractor({ packageDir: FIXTURE_DIR }).extract()

	const fix = snapshot.modules.fix

	if (!fix) throw new Error('fixture module missing from snapshot')

	moduleApi = fix
})

/** The named export as a `ComponentApi`, failing on any other kind. */
function component(name: string): ComponentApi {
	const found = moduleApi.exports.find((entry) => entry.name === name)

	if (found?.kind !== 'component') {
		throw new Error(`expected component export '${name}', got ${found?.kind ?? 'nothing'}`)
	}

	return found
}

/** The named prop of a component, failing when absent. */
function propOf(api: ComponentApi, name: string): PropDef {
	const found = api.props.find((prop) => prop.name === name)

	if (!found) throw new Error(`expected prop '${name}' on ${api.name}`)

	return found
}

describe('props', () => {
	it('merges intersection arms into one prop table', () => {
		const merge = component('Merge')

		expect(merge.props.map((prop) => prop.name).sort()).toEqual(['gap', 'strong'])

		expect(propOf(merge, 'strong')).toMatchObject({
			type: 'boolean',
			required: true,
			shape: { k: 'primitive', name: 'boolean' },
		})
	})

	it('keeps arm-specific props of a discriminated union optional', () => {
		const linkish = component('Linkish')

		expect(propOf(linkish, 'href').required).toBeUndefined()

		expect(propOf(linkish, 'target').required).toBeUndefined()

		expect(propOf(linkish, 'onPress').required).toBeUndefined()

		expect(propOf(linkish, 'href').type).toBe('string')

		expect(propOf(linkish, 'target').type).toBe("'_blank' | '_self'")

		expect(propOf(linkish, 'onPress').type).toBe('(value: string) => void')
	})

	it('joins distinct union-arm type texts with a pipe', () => {
		expect(propOf(component('Linkish'), 'probe').type).toBe('string | number')
	})

	it('renders literal unions inline, resolving aliases to their members', () => {
		expect(propOf(component('Chip'), 'tone').type).toBe("'gray' | 'red'")

		// `GallerySize` is an alias; the resolved literal set renders instead.
		expect(propOf(component('Gallery'), 'size').type).toBe("'sm' | 'md' | 'lg'")
	})

	it('drops `| undefined` from optional prop display text', () => {
		const gallery = component('Gallery')

		expect(propOf(gallery, 'count').type).toBe('number')

		expect(propOf(gallery, 'tone').type).toBe("'neutral' | 'brand'")
	})

	it('marks only non-optional props required', () => {
		const gallery = component('Gallery')

		expect(propOf(gallery, 'items').required).toBe(true)

		expect(propOf(gallery, 'size').required).toBeUndefined()

		expect(propOf(component('Chip'), 'label').required).toBe(true)
	})
})

describe('defaults', () => {
	it('reads destructured binding initializers', () => {
		const gallery = component('Gallery')

		expect(propOf(gallery, 'size').default).toBe("'md'")

		expect(propOf(gallery, 'count').default).toBe('3')
	})

	it('resolves a same-file const reference to its literal', () => {
		expect(propOf(component('Gallery'), 'tone').default).toBe("'neutral'")
	})

	it('falls back to `@defaultValue` for props without a binding', () => {
		const gallery = component('Gallery')

		expect(propOf(gallery, 'flush').default).toBe('false')

		expect(propOf(gallery, 'caption').default).toBeUndefined()
	})
})

describe('tsdoc', () => {
	it('lifts the component summary', () => {
		expect(component('Gallery').description).toBe(
			'Fixed grid of media tiles with density-aware gutters.',
		)
	})

	it('lifts per-prop descriptions', () => {
		expect(propOf(component('Gallery'), 'count').description).toBe('Columns per row.')
	})

	it('keeps the first `@example` block verbatim', () => {
		expect(propOf(component('Gallery'), 'onActive').example).toBe(
			'<Gallery items={[]} onActive={(index) => console.log(index)} />',
		)
	})

	it('carries `@deprecated` text, or `true` when the tag is bare', () => {
		const gallery = component('Gallery')

		expect(propOf(gallery, 'labels').deprecated).toBe('Use `caption` instead.')

		expect(propOf(gallery, 'pad').deprecated).toBe(true)
	})

	it('normalizes `{@link}` tokens and resolves them into `links`', () => {
		const tone = propOf(component('Gallery'), 'tone')

		expect(tone.description).toBe('Wash behind the grid; scales with {@link GallerySize}.')

		expect(tone.links).toEqual({
			GallerySize: {
				signature: 'type GallerySize',
				summary: 'Sizing steps shared by gallery fixtures.',
			},
		})
	})

	it('normalizes the piped label form', () => {
		const widths = propOf(component('Gallery'), 'widths')

		expect(widths.description).toBe(
			'Pixel widths of each column track; see {@link GallerySize|size steps}.',
		)

		expect(widths.links?.GallerySize).toBeDefined()
	})

	it('resolves cross-file links on component summaries without an import', () => {
		const linkish = component('Linkish')

		expect(linkish.description).toContain('{@link Chip}')

		expect(linkish.links?.Chip?.signature).toMatch(/^function Chip/)

		expect(linkish.links?.Chip?.summary).toBe(
			'Compact tag control passing its remaining props to the underlying button.',
		)
	})
})

describe('pass-through', () => {
	it('detects a rest spread onto an intrinsic tag, deduped with the annotation', () => {
		expect(component('Chip').passThrough).toEqual([{ element: 'button' }])
	})

	it('carries `Omit` keys as the omitted list', () => {
		expect(component('Field').passThrough).toEqual([
			{ element: 'input', omitted: ['size', 'color'] },
		])
	})

	it('keeps only project-authored props in the table', () => {
		expect(component('Chip').props.map((prop) => prop.name)).toEqual(['label', 'tone', 'variant'])

		expect(component('Field').props.map((prop) => prop.name)).toEqual(['label'])
	})

	it('emits no pass-through for a self-contained component', () => {
		expect(component('Merge').passThrough).toBeUndefined()
	})
})

describe('factory components', () => {
	it('classifies a factory-made export as a component with props', () => {
		const stamp = component('Stamp')

		expect(stamp.description).toBe(
			'Inked status stamp produced by a factory call rather than a declaration.',
		)

		expect(propOf(stamp, 'label')).toMatchObject({ type: 'string', required: true })

		expect(propOf(stamp, 'tone')).toMatchObject({
			type: "'zinc' | 'iris'",
			shape: { k: 'literal-union', members: ['zinc', 'iris'] },
		})
	})

	it('classifies an identifier-wrapped component whose call holds no function literal', () => {
		expect(propOf(component('Boxed'), 'width').type).toBe("'narrow' | 'wide'")
	})

	it('classifies a nullary JSX-returning factory product with an empty prop table', () => {
		expect(component('Rule').props).toEqual([])
	})

	it('leaves a non-component factory product as `other`', () => {
		const formatter = moduleApi.exports.find((entry) => entry.name === 'Formatter')

		expect(formatter?.kind).toBe('other')
	})
})
