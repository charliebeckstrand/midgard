import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'

export default function Stretch() {
	return (
		<Tabs defaultValue="Sign in">
			<TabList aria-label="Authentication">
				<Tab value="Sign in" stretch>
					Sign in
				</Tab>
				<Tab value="Create account" stretch>
					Create account
				</Tab>
			</TabList>
			<TabContents>
				<TabContent value="Sign in">
					<Text tone="muted">Sign in with your email and password.</Text>
				</TabContent>
				<TabContent value="Create account">
					<Text tone="muted">Create an account with your work email.</Text>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
