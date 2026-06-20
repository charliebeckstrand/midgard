import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function DashboardPage() {
	return (
		<Stack gap="md">
			<Heading>Dashboard</Heading>
			<Text className="text-zinc-500">Select Users from the sidebar to manage accounts.</Text>
		</Stack>
	)
}
