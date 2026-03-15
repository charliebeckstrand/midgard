'use client'

import { ArrowLeftIcon } from '@heroicons/react/20/solid'
import { Button, Heading } from 'catalyst'

export function SettingsClient() {
	return (
		<div className="flex flex-col gap-4 p-6">
			<Button variant="outline" href="/">
				<ArrowLeftIcon />
				Back to chats
			</Button>
			<Heading>Settings</Heading>
		</div>
	)
}
