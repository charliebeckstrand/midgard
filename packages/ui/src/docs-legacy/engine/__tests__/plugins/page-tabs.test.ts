// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parsePageTabs } from '../../plugins/page-tabs'

describe('parsePageTabs', () => {
	it('lists the tabs of the element, and not the tabs of a nested Tabs', () => {
		const source = `
			export function Demo() {
				return (
					<PageTabs defaultValue="bar">
						<TabList>
							<Tab value="bar">Bar</Tab>
							<Tab value="gauge">Gauge</Tab>
						</TabList>
						<Tabs defaultValue="inner"><Tab value="inner" /></Tabs>
					</PageTabs>
				)
			}`

		expect(parsePageTabs('demo.tsx', source)).toEqual({ defaultValue: 'bar', others: ['gauge'] })
	})

	it('reads the items of a constant array that a map turns into tabs', () => {
		const source = `
			const tabs = ['one', 'two', 'three']
			export function Demo() {
				return <PageTabs defaultValue="one">{tabs.map((tab) => <Tab key={tab} value={tab} />)}</PageTabs>
			}`

		expect(parsePageTabs('demo.tsx', source)).toEqual({
			defaultValue: 'one',
			others: ['two', 'three'],
		})
	})

	it('rejects a value that the build cannot read', () => {
		const source = `export function Demo({ v }) { return <PageTabs defaultValue="a"><Tab value={v} /></PageTabs> }`

		expect(() => parsePageTabs('demo.tsx', source)).toThrow(/literal value/)
	})

	it('rejects a value that is not a lowercase path part', () => {
		const tab = `export function Demo() { return <PageTabs defaultValue="a"><Tab value="Sorting" /></PageTabs> }`

		const defaultValue = `export function Demo() { return <PageTabs defaultValue="Two words" /> }`

		expect(() => parsePageTabs('demo.tsx', tab)).toThrow(/"Sorting" is not a path part/)

		expect(() => parsePageTabs('demo.tsx', defaultValue)).toThrow(/"Two words" is not a path part/)
	})

	it('gives null for a demo without PageTabs', () => {
		expect(parsePageTabs('demo.tsx', 'export function Demo() { return <div /> }')).toBeNull()
	})
})
