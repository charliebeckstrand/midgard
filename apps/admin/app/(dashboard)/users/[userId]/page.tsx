import { readGateway, type User } from 'auth'
import { notFound } from 'next/navigation'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/dl'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import { type Activity, ActivityTable } from '@/components/activity-table'

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

export default async function UserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params

	const path = `/api/users/${encodeURIComponent(userId)}`

	// A missing user is expected, so its 404 does not go to the log.
	const [user, activity] = await Promise.all([
		readGateway<User>(path, { quiet: [404] }),
		readGateway<{ data: Activity[] }>(`${path}/activity`, { quiet: [404] }),
	])

	if (!user) notFound()

	return (
		<Stack gap="xl">
			<Heading>{user.email}</Heading>

			<DescriptionList>
				<DescriptionTerm>ID</DescriptionTerm>
				<DescriptionDetails>{user.id}</DescriptionDetails>
				<DescriptionTerm>Role</DescriptionTerm>
				<DescriptionDetails>{user.roles.includes('admin') ? 'Admin' : 'User'}</DescriptionDetails>
				<DescriptionTerm>Status</DescriptionTerm>
				<DescriptionDetails>{user.is_active ? 'Active' : 'Inactive'}</DescriptionDetails>
				<DescriptionTerm>Created At</DescriptionTerm>
				<DescriptionDetails>
					{new Date(user.created_at).toLocaleString(undefined, dateFormat)}
				</DescriptionDetails>
				<DescriptionTerm>Updated At</DescriptionTerm>
				<DescriptionDetails>
					{new Date(user.updated_at).toLocaleString(undefined, dateFormat)}
				</DescriptionDetails>
			</DescriptionList>

			<Heading level={2}>Recent activity</Heading>

			<ActivityTable activity={activity?.data ?? []} />
		</Stack>
	)
}
