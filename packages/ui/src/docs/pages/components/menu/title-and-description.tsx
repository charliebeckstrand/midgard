import { CreditCard, LogOut, Settings, User } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'ui/menu'

export default function TitleAndDescription() {
	return (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" prefix={<Icon icon={<User />} />}>
					Account
				</Button>
			</MenuTrigger>
			<MenuContent title="Jane Cooper" description="jane@example.com">
				<MenuItem>
					<Icon icon={<User />} />
					<MenuLabel>Profile</MenuLabel>
				</MenuItem>
				<MenuItem>
					<Icon icon={<CreditCard />} />
					<MenuLabel>Billing</MenuLabel>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Settings />} />
					<MenuLabel>Settings</MenuLabel>
				</MenuItem>
				<MenuSeparator />
				<MenuItem>
					<Icon icon={<LogOut />} />
					<MenuLabel>Sign out</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
