import { bifrost, requireGateway } from 'auth'
import { notFound } from 'next/navigation'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/dl'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import { ActivityTable } from '@/components/activity-table'

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

export default async function UserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params

	const options = { params: { path: { id: userId } } }

	// A `400` (an id that is not a UUID) or a `404` is a user that does not
	// exist. Any other failed read throws, so an outage does not show as a
	// missing user.
	const [user, activity] = await Promise.all([
		requireGateway('/api/users/{id}', () => bifrost.GET('/api/users/{id}', options), {
			absent: [400, 404],
		}),
		requireGateway(
			'/api/users/{id}/activity',
			() => bifrost.GET('/api/users/{id}/activity', options),
			{ absent: [400, 404] },
		),
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
