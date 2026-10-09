'use client'

import { useMutation } from '@tanstack/react-query'
import { latestError } from 'shared/providers'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { Card, CardHeader, CardTitle } from 'ui/card'
import { useConfirm } from 'ui/confirm'
import { Divider } from 'ui/divider'
import { Stack } from 'ui/structure/stack'
import { deleteAccount, downloadAccount } from './account-api'
import { Section } from './section'

type YourDataProps = {
	/** An admin cannot delete the account until the admin role is removed. */
	admin: boolean
}

/**
 * Card of the download and the deletion of the account of the signed-in user.
 *
 * @remarks
 * The download holds the account, the sign-in methods, the recent activity,
 * and the data of each app. A deletion asks for confirmation first.
 */
export function YourData({ admin }: YourDataProps) {
	const download = useMutation({ mutationFn: downloadAccount, meta: { inlineError: true } })
	const remove = useMutation({ mutationFn: deleteAccount, meta: { inlineError: true } })
	const confirm = useConfirm()

	const error = latestError(download, remove)

	return (
		<Card>
			<CardHeader>
				<CardTitle level={2}>Your data</CardTitle>
			</CardHeader>

			<Stack gap="lg">
				{error && <Alert severity="error" title={error.message} />}

				<Section
					title="Download your data"
					description="A copy of your account and the data of each app, as a JSON file."
					action={
						<Button
							variant="outline"
							disabled={download.isPending}
							onClick={() => download.mutate()}
						>
							Download
						</Button>
					}
				/>

				<Divider soft />

				<Section
					title="Delete your account"
					description={
						admin
							? 'Remove the admin role before you delete this account.'
							: 'Your account and all of its data are deleted. You cannot undo this.'
					}
					action={
						<Button
							variant="outline"
							color="red"
							disabled={admin || remove.isPending}
							onClick={async () => {
								const confirmed = await confirm({
									title: 'Delete your account?',
									description:
										'Your account and all of its data are deleted. You cannot undo this.',
									confirm: { label: 'Delete', color: 'red' },
								})

								if (confirmed) remove.mutate()
							}}
						>
							Delete
						</Button>
					}
				/>
			</Stack>
		</Card>
	)
}
