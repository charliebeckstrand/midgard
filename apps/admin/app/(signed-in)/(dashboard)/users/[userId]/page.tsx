import { bifrost, requireGateway } from 'auth'
import { notFound } from 'next/navigation'
import { Badge } from 'ui/badge'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { Card, CardHeader, CardTitle } from 'ui/card'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/dl'
import { Stack } from 'ui/structure/stack'
import { ActivityTable } from '@/components/activity-table'
import { PageHeader } from '@/components/page-header'

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
			<PageHeader
				title={user.email}
				breadcrumb={
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="/users">Users</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink current>{user.email}</BreadcrumbLink>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Details</CardTitle>
				</CardHeader>
				<DescriptionList>
					<DescriptionTerm>ID</DescriptionTerm>
					<DescriptionDetails className="font-mono break-all">{user.id}</DescriptionDetails>
					<DescriptionTerm>Role</DescriptionTerm>
					<DescriptionDetails>{user.roles.includes('admin') ? 'Admin' : 'User'}</DescriptionDetails>
					<DescriptionTerm>Status</DescriptionTerm>
					<DescriptionDetails>
						<Badge color={user.is_active ? 'green' : 'zinc'}>
							{user.is_active ? 'Active' : 'Inactive'}
						</Badge>
					</DescriptionDetails>
					<DescriptionTerm>Email</DescriptionTerm>
					<DescriptionDetails>
						<Badge color={user.is_verified ? 'green' : 'amber'}>
							{user.is_verified ? 'Verified' : 'Not verified'}
						</Badge>
					</DescriptionDetails>
					<DescriptionTerm>Created</DescriptionTerm>
					<DescriptionDetails>
						{new Date(user.created_at).toLocaleString(undefined, dateFormat)}
					</DescriptionDetails>
					<DescriptionTerm>Updated</DescriptionTerm>
					<DescriptionDetails>
						{new Date(user.updated_at).toLocaleString(undefined, dateFormat)}
					</DescriptionDetails>
				</DescriptionList>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent activity</CardTitle>
				</CardHeader>
				<ActivityTable activity={activity?.data ?? []} />
			</Card>
		</Stack>
	)
}
