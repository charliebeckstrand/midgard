// @vitest-environment node
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { type BarrelApi, createApiExtractor } from '../plugin/api.ts'

// The API data that the docs plugin makes for some components whose props
// have a union, an inherited tag, a default that is a sentence, an
// `@internal` tag, a `Responsive<T>` type, or a range.

const UI_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

const BARRELS = [
	'components/card',
	'components/color',
	'components/confirm',
	'components/date-picker',
	'components/description-list',
	'components/hold-button',
	'components/menu',
	'components/segment',
	'components/sparkline',
	'components/table',
	'components/tabs',
	'components/toggle-icon-button',
	'structure/flex',
]

const extractor = createApiExtractor(UI_ROOT)

afterAll(() => extractor.close())

let loaded: Promise<BarrelApi> | undefined

/** The components of `BARRELS`. The first call extracts them, one barrel at a time. */
function load(): Promise<BarrelApi> {
	loaded ??= (async () => {
		const parts: BarrelApi[] = []

		for (const barrel of BARRELS) parts.push(await extractor.extract(barrel))

		return Object.assign({}, ...parts)
	})()

	return loaded
}

function findProp(api: BarrelApi, component: string, name: string) {
	return api[component]?.props.find((prop) => prop.name === name)
}

describe('API extractor', { timeout: 60_000 }, () => {
	it('lists the props of each arm of a union', async () => {
		const api = await load()

		for (const component of ['ToggleIconButton', 'TabList']) {
			expect(findProp(api, component, 'aria-label')).toMatchObject({
				type: 'string',
				required: true,
			})

			expect(findProp(api, component, 'aria-labelledby')).toMatchObject({
				type: 'string',
				required: true,
			})
		}

		expect(findProp(api, 'DatePicker', 'input')?.required).toBeUndefined()
	})

	it('reads each tag from the ComponentProps argument', async () => {
		const api = await load()

		expect(api.TableHead?.elements).toEqual(['thead'])

		expect(api.TableFoot?.elements).toEqual(['tfoot'])

		expect(api.CardTitle?.elements).toEqual(['h3'])

		expect(api.TableCell?.elements).toEqual(['td'])

		expect(api.TableHeader?.elements).toEqual(['th'])
	})

	it('keeps only the tags whose attributes the props take', async () => {
		const api = await load()

		// `Omit<ButtonProps & { href?: never }, 'href'>` has no link.
		expect(api.HoldButton?.elements).toEqual(['button'])

		// `Pick<TabProps, …>` has no button attributes.
		expect(api.SegmentItem?.elements).toBeUndefined()
	})

	it('gives a default as code, and a default that is a sentence as prose', async () => {
		const api = await load()

		expect(findProp(api, 'ToggleIconButton', 'color')).toMatchObject({
			default: "'zinc'",
			defaultValue: 'zinc',
		})

		// The default-value gate holds a name as the code of the default.
		expect(findProp(api, 'ToggleIconButton', 'pressedIcon')?.default).toBe('icon')

		expect(findProp(api, 'ColorPanel', 'swatches')?.default).toBe('DEFAULT_SWATCHES')

		// A constant gives a value only when it sets a value for each breakpoint.
		expect(findProp(api, 'ColorPanel', 'swatches')?.defaultValue).toBeUndefined()

		const initialFocus = findProp(api, 'Confirm', 'initialFocus')

		expect(initialFocus?.default).toBeUndefined()

		expect(initialFocus?.description).toMatch(/Default: the first tabbable child\.$/)
	})

	it('leaves out an internal prop', async () => {
		const api = await load()

		// `ContextMenu` sets the `disabled` of `Menu`. A dropdown ignores it.
		expect(findProp(api, 'Menu', 'disabled')).toBeUndefined()

		expect(findProp(api, 'Menu', 'sheet')).toBeDefined()
	})

	it('gives the values of a responsive type, and the value of a default constant', async () => {
		const api = await load()

		expect(findProp(api, 'DescriptionList', 'orientation')).toMatchObject({
			type: 'Responsive<Orientation>',
			values: ['horizontal', 'vertical'],
			responsive: true,
			default: 'DESCRIPTION_LIST_ORIENTATION',
			defaultValue: { initial: 'vertical', sm: 'horizontal' },
		})

		// An alias of `Responsive<T>` passes too, with a single default.
		expect(findProp(api, 'Flex', 'direction')).toMatchObject({
			type: 'ResponsiveDirection',
			values: ['col', 'col-reverse', 'row', 'row-reverse'],
			responsive: true,
			default: "'row'",
			defaultValue: 'row',
		})
	})

	it('gives the range of a number prop from its @minimum and @maximum tags', async () => {
		const api = await load()

		expect(findProp(api, 'Sparkline', 'strokeWidth')).toMatchObject({
			type: 'number',
			default: '1.5',
			minimum: 1,
			maximum: 4,
		})

		expect(findProp(api, 'Sparkline', 'width')).not.toHaveProperty('minimum')
	})
})
