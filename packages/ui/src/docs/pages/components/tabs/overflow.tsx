import { useIntl } from 'ui/primitives/intl'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'

export default function Overflow() {
	const { formatDate } = useIntl()

	const months = Array.from({ length: 12 }, (_, month) =>
		formatDate(new Date(2026, month, 1), { month: 'long' }),
	)

	return (
		<div className="max-w-sm">
			<Tabs defaultValue="8">
				<TabList aria-label="Month">
					{months.map((month, index) => (
						<Tab key={month} value={String(index)}>
							{month}
						</Tab>
					))}
				</TabList>
				<TabContents>
					{months.map((month, index) => (
						<TabContent key={month} value={String(index)}>
							<Text tone="muted">No invoices in {month}.</Text>
						</TabContent>
					))}
				</TabContents>
			</Tabs>
		</div>
	)
}
