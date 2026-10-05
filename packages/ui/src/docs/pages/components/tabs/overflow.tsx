import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'

const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

export default function Overflow() {
	return (
		<div className="max-w-sm">
			<Tabs defaultValue="September">
				<TabList aria-label="Month">
					{months.map((month) => (
						<Tab key={month} value={month}>
							{month}
						</Tab>
					))}
				</TabList>
				<TabContents>
					{months.map((month) => (
						<TabContent key={month} value={month}>
							<Text tone="muted">The invoices of {month}.</Text>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
		</div>
	)
}
