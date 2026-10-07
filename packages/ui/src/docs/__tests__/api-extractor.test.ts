// @vitest-environment node
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { type BarrelApi, createApiExtractor } from '../plugin/api.ts'

// The API data that the docs plugin makes for some components whose props
// have a union, an inherited tag, a default that is a sentence, or an
// `@internal` tag.

const UI_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

const BARRELS = [
	'components/card',
	'components/color',
	'components/confirm',
	'components/date-picker',
	'components/hold-button',
	'components/menu',
	'components/segment',
	'components/table',
	'components/tabs',
	'components/toggle-icon-button',
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

function propOf(api: BarrelApi, component: string, name: string) {
	return api[component]?.props.find((prop) => prop.name === name)
}

describe('API extractor', { timeout: 60_000 }, () => {
	it('lists the props of each arm of a union', async () => {
		const api = await load()

		for (const component of ['ToggleIconButton', 'TabList']) {
			expect(propOf(api, component, 'aria-label')).toMatchObject({ type: 'string', required: true })

			expect(propOf(api, component, 'aria-labelledby')).toMatchObject({
				type: 'string',
				required: true,
			})
		}

		expect(propOf(api, 'DatePicker', 'input')?.required).toBeUndefined()
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

		expect(propOf(api, 'ToggleIconButton', 'color')?.default).toBe("'zinc'")

		// The default-value gate holds a name as the code of the default.
		expect(propOf(api, 'ToggleIconButton', 'pressedIcon')?.default).toBe('icon')

		expect(propOf(api, 'ColorPanel', 'swatches')?.default).toBe('DEFAULT_SWATCHES')

		const initialFocus = propOf(api, 'Confirm', 'initialFocus')

		expect(initialFocus?.default).toBeUndefined()

		expect(initialFocus?.description).toMatch(/Default: the first tabbable child\.$/)
	})

	it('leaves out an internal prop', async () => {
		const api = await load()

		// `ContextMenu` sets the `disabled` of `Menu`. A dropdown ignores it.
		expect(propOf(api, 'Menu', 'disabled')).toBeUndefined()

		expect(propOf(api, 'Menu', 'sheet')).toBeDefined()
	})
})
