import { bifrost, type User } from 'auth'
import { notFound } from 'next/navigation'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/dl'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

export default async function UserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params

	const res = await bifrost(`/api/users/${encodeURIComponent(userId)}`)

	if (!res.ok) notFound()

	const user = (await res.json()) as User

	return (
		<Stack gap="xl">
			<Heading>{user.email}</Heading>

			<DescriptionList>
				<DescriptionTerm>ID</DescriptionTerm>
				<DescriptionDetails>{user.id}</DescriptionDetails>
				<DescriptionTerm>Role</DescriptionTerm>
				<DescriptionDetails>{user.role === 'admin' ? 'Admin' : 'User'}</DescriptionDetails>
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
		</Stack>
	)
}
