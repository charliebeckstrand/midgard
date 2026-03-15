'use client'

import { ArrowLeftIcon } from '@heroicons/react/20/solid'
import { Button, Heading } from 'catalyst'
import type { User } from 'heimdall/user'

interface UserDetailsClientProps {
	user: User | null
}

export function UserDetailsClient({ user }: UserDetailsClientProps) {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Button variant="outline" href="/users">
					<ArrowLeftIcon />
					Back to Users
				</Button>
			</div>

			<Heading>{user?.email}</Heading>

			<pre className="dark:text-white">{JSON.stringify(user, null, 2)}</pre>
		</div>
	)
}
