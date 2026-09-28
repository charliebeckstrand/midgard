'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { deleteAccount, downloadAccount } from './account-api'

type YourDataProps = {
	/** An admin cannot delete the account until the admin role is removed. */
	admin: boolean
}

/**
 * The download and the deletion of the account of the signed-in user.
 *
 * @remarks
 * The download holds the account, the sign-in methods, the recent activity,
 * and the data of each app. A deletion asks for confirmation first.
 */
export function YourData({ admin }: YourDataProps) {
	const download = useMutation({ mutationFn: downloadAccount })
	const remove = useMutation({ mutationFn: deleteAccount })
	const [confirming, setConfirming] = useState(false)

	const error = download.error ?? remove.error

	return (
		<Stack gap="sm">
			<Heading level={3}>Your data</Heading>

			<Text>
				Download a copy of your account and the data of each app, or delete your account and all of
				its data.
			</Text>

			{admin && <Text>Remove the admin role before you delete this account.</Text>}

			{error && <Text tone="error">{error.message}</Text>}

			<div className="flex flex-wrap gap-2">
				<Button variant="outline" disabled={download.isPending} onClick={() => download.mutate()}>
					Download your data
				</Button>
				<Button
					color="red"
					disabled={admin || remove.isPending}
					onClick={() => setConfirming(true)}
				>
					Delete your account
				</Button>
			</div>

			<Confirm
				open={confirming}
				onOpenChange={setConfirming}
				onConfirm={() => {
					remove.mutate()

					setConfirming(false)
				}}
				title="Delete your account?"
				description="Your account and all of its data are deleted. You cannot undo this."
				confirm={{ label: 'Delete', color: 'red' }}
			/>
		</Stack>
	)
}
