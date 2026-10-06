import { bifrost, requireGateway } from 'auth'
import { notFound } from 'next/navigation'
import { type ReactNode, Suspense } from 'react'
import { Badge } from 'ui/badge'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
	BreadcrumbSkeleton,
} from 'ui/breadcrumb'
import { Card, CardHeader, CardTitle } from 'ui/card'
import { DateTime } from 'ui/date-time'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import { HeadingSkeleton } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import { TextSkeleton } from 'ui/text'
import { ActivityTable } from '@/components/activity-table'
import { PageHeader } from '@/components/page-header'

type Params = Promise<{ userId: string }>

/**
 * A card with its title. The page and its loading state give the same cards,
 * so the page keeps its shape when the user lands.
 *
 * @internal
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			{children}
		</Card>
	)
}

/**
 * Reads the user and the activity from the gateway, and renders them.
 *
 * @internal
 */
async function UserDetails({ params }: { params: Params }) {
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

			<Section title="Details">
				{' '}
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
						<DateTime value={user.created_at} />
					</DescriptionDetails>
					<DescriptionTerm>Updated</DescriptionTerm>
					<DescriptionDetails>
						<DateTime value={user.updated_at} />
					</DescriptionDetails>
				</DescriptionList>
			</Section>

			<Section title="Recent activity">
				{' '}
				<ActivityTable activity={activity?.data ?? []} />
			</Section>
		</Stack>
	)
}

/**
 * The header and the cards while the user loads.
 *
 * @internal
 */
function UserDetailsLoading() {
	return (
		<Stack gap="xl">
			<Stack gap="xl">
				<HeadingSkeleton />
				<BreadcrumbSkeleton crumbs={2} />
			</Stack>
			<Section title="Details">
				<TextSkeleton />
			</Section>
			<Section title="Recent activity">
				<TextSkeleton />
			</Section>
		</Stack>
	)
}

/**
 * One user: the details of the account, and its recent activity.
 *
 * @remarks
 * The id comes from the address, and the title is the email of the user, so
 * the whole page waits in one boundary. Its loading state keeps the shape of
 * the page, and a navigation to the page shows it at once. An id that names no
 * user gives the not-found page.
 */
export default function UserDetailsPage({ params }: { params: Params }) {
	return (
		<Suspense fallback={<UserDetailsLoading />}>
			<UserDetails params={params} />
		</Suspense>
	)
}
