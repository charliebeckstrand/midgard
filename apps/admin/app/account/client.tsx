'use client'

import type { User } from 'auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Heading } from 'ui/heading'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { Stack } from 'ui/structure/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { Text } from 'ui/text'
import type { Passkey } from './account-api'
import { useAddPasskey, usePasskeys, useRemovePasskey } from './account-queries'

type AccountClientProps = {
	user: User
	passkeys: Passkey[]
}

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

/**
 * Account page: the passkeys of the signed-in user, and sign-out.
 *
 * @remarks
 * The server page seeds the `usePasskeys` query. The user owns the passkeys,
 * and no admin can change them. The gateway accepts a change only soon after
 * the sign-in, and shows why when it refuses. A removal asks for confirmation
 * first.
 */
export function AccountClient({ user, passkeys: initialPasskeys }: AccountClientProps) {
	const router = useRouter()
	const { data: passkeys } = usePasskeys(initialPasskeys)
	const add = useAddPasskey()
	const remove = useRemovePasskey()
	const [removing, setRemoving] = useState<Passkey | null>(null)

	const error = add.error ?? remove.error

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		router.push('/login')
	}

	return (
		<AuthLayout>
			<Stack gap="lg" className="w-full sm:max-w-lg">
				<div>
					<Heading>Account</Heading>
					<Text>{user.email}</Text>
				</div>

				{error && <Text tone="error">{error.message}</Text>}

				<Table>
					<TableHead>
						<TableRow>
							<TableHeader>Passkey</TableHeader>
							<TableHeader>Added</TableHeader>
							<TableHeader></TableHeader>
						</TableRow>
					</TableHead>
					<TableBody>
						{passkeys.map((passkey, index) => (
							<TableRow key={passkey.id}>
								<TableCell>Passkey {index + 1}</TableCell>
								<TableCell>
									{new Date(passkey.created_at).toLocaleString(undefined, dateFormat)}
								</TableCell>
								<TableCell>
									<Button
										variant="outline"
										disabled={remove.isPending}
										onClick={() => setRemoving(passkey)}
									>
										Remove
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>

				{passkeys.length === 0 && <Text>You have no passkeys.</Text>}

				<Button disabled={add.isPending} onClick={() => add.mutate()}>
					Add a passkey
				</Button>

				<Button variant="outline" onClick={signOut}>
					Sign out
				</Button>

				{user.role === 'admin' && (
					<Text className="text-center">
						<Link href="/" underline>
							Back to the dashboard
						</Link>
					</Text>
				)}
			</Stack>

			<Confirm
				open={removing !== null}
				onOpenChange={(open) => !open && setRemoving(null)}
				onConfirm={() => {
					if (removing) remove.mutate(removing.id)

					setRemoving(null)
				}}
				title="Remove this passkey?"
				description="You cannot sign in with this passkey after you remove it."
				confirm={{ label: 'Remove', color: 'red' }}
			/>
		</AuthLayout>
	)
}
