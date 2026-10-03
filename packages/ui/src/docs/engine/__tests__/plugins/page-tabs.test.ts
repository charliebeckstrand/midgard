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
			const tabs = ['One', 'Two', 'Three']
			export function Demo() {
				return <PageTabs defaultValue="One">{tabs.map((tab) => <Tab key={tab} value={tab} />)}</PageTabs>
			}`

		expect(parsePageTabs('demo.tsx', source)).toEqual({
			defaultValue: 'One',
			others: ['Two', 'Three'],
		})
	})

	it('rejects a value that the build cannot read', () => {
		const source = `export function Demo({ v }) { return <PageTabs defaultValue="a"><Tab value={v} /></PageTabs> }`

		expect(() => parsePageTabs('demo.tsx', source)).toThrow(/literal value/)
	})

	it('gives null for a demo without PageTabs', () => {
		expect(parsePageTabs('demo.tsx', 'export function Demo() { return <div /> }')).toBeNull()
	})
})
