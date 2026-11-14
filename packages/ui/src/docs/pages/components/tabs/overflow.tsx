import { DateTime } from 'ui/date-time'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'

// The name of a month.
const MONTH = { month: 'long' } as const

// The first day of each month.
const months = Array.from({ length: 12 }, (_, month) => new Date(2026, month, 1))

export default function Overflow() {
	return (
		<div className="max-w-sm">
			<Tabs defaultValue="8">
				<TabList aria-label="Month">
					{months.map((month, index) => (
						<Tab key={month.toISOString()} value={String(index)}>
							<DateTime value={month} format={MONTH} />
						</Tab>
					))}
				</TabList>
				<TabContents>
					{months.map((month, index) => (
						<TabContent key={month.toISOString()} value={String(index)}>
							<Text tone="muted">
								No invoices in <DateTime value={month} format={MONTH} />.
							</Text>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
		</div>
	)
}
