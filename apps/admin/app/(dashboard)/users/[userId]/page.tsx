import { bifrost } from 'auth'
import { notFound } from 'next/navigation'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/dl'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import { ActivityTable } from '@/components/activity-table'

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

export default async function UserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params

	const options = { params: { path: { id: userId } } }

	const [{ data: user }, { data: activity }] = await Promise.all([
		bifrost.GET('/api/users/{id}', options),
		bifrost.GET('/api/users/{id}/activity', options),
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
