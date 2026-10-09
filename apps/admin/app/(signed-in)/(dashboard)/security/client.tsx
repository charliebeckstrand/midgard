'use client'

import { latestError } from 'shared/providers'
import { Alert } from 'ui/alert'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { useConfirm } from 'ui/confirm'
import { DateTime } from 'ui/date-time'
import { Stack } from 'ui/structure/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { Text } from 'ui/text'
import { BansSection, ThreatsSection } from './sections'
import type { Ban, Threat } from './security-api'
import { useBans, useRemoveBan, useResolveThreat, useThreats } from './security-queries'

type SecurityClientProps = {
	threats: Threat[]
	bans: Ban[]
}

const threatLabels: Record<string, string> = {
	brute_force: 'Repeated failed sign-ins',
	credential_stuffing: 'Failed sign-ins to many accounts',
	registration_spam: 'Too many sign-ups',
	rate_limit_abuse: 'Repeated rate limit hits',
}

const severityColors = { low: 'zinc', medium: 'amber', high: 'red' } as const

/**
 * The threats that Vidar found and the bans in force, with an action that
 * resolves each threat and an action that removes each ban.
 *
 * @remarks
 * The server page seeds both queries. Vidar keeps a threat for 30 days. A
 * threat type that Vidar adds later shows its raw name, so the table never
 * hides a threat. Removing a ban lets the address sign in again at once, so
 * it asks for confirmation first.
 */
export function SecurityClient({
	threats: initialThreats,
	bans: initialBans,
}: SecurityClientProps) {
	const { data: threats } = useThreats(initialThreats)
	const { data: bans } = useBans(initialBans)
	const resolve = useResolveThreat()
	const unban = useRemoveBan()
	const confirm = useConfirm()

	const error = latestError(resolve, unban)

	return (
		<Stack gap="xl">
			{error && <Alert severity="error" title={error.message} />}

			<BansSection>
				{bans.length === 0 ? (
					<Text tone="muted">No address is banned.</Text>
				) : (
					<Table>
						<TableHead>
							<TableRow>
								<TableHeader>IP address</TableHeader>
								<TableHeader>Reason</TableHeader>
								<TableHeader>Until</TableHeader>
								<TableHeader>
									<span className="sr-only">Actions</span>
								</TableHeader>
							</TableRow>
						</TableHead>
						<TableBody>
							{bans.map((ban) => (
								<TableRow key={ban.id}>
									<TableCell className="font-mono">{ban.ip}</TableCell>
									<TableCell>{ban.reason}</TableCell>
									<TableCell>
										{ban.expires_at ? <DateTime value={ban.expires_at} /> : 'Permanent'}
									</TableCell>
									<TableCell className="text-end">
										<Button
											variant="outline"
											size="sm"
											disabled={unban.isPending}
											onClick={async () => {
												const confirmed = await confirm({
													title: `Unban ${ban.ip}?`,
													description: 'The address can sign in and sign up again at once.',
													confirm: { label: 'Unban' },
												})

												if (confirmed) unban.mutate(ban.ip)
											}}
										>
											Unban
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</BansSection>

			<ThreatsSection>
				{threats.length === 0 ? (
					<Text tone="muted">No threats in the last 30 days.</Text>
				) : (
					<Table>
						<TableHead>
							<TableRow>
								<TableHeader>Threat</TableHeader>
								<TableHeader>IP address</TableHeader>
								<TableHeader>Severity</TableHeader>
								<TableHeader>Action taken</TableHeader>
								<TableHeader>Status</TableHeader>
								<TableHeader>Time</TableHeader>
								<TableHeader>
									<span className="sr-only">Actions</span>
								</TableHeader>
							</TableRow>
						</TableHead>
						<TableBody>
							{threats.map((threat) => (
								<TableRow key={threat.id}>
									<TableCell>{threatLabels[threat.threat_type] ?? threat.threat_type}</TableCell>
									<TableCell className="font-mono">{threat.ip}</TableCell>
									<TableCell>
										<Badge color={severityColors[threat.severity]} className="capitalize">
											{threat.severity}
										</Badge>
									</TableCell>
									<TableCell className="capitalize">{threat.action_taken ?? ''}</TableCell>
									<TableCell>
										<Badge color={threat.resolved ? 'zinc' : 'amber'}>
											{threat.resolved ? 'Resolved' : 'Open'}
										</Badge>
									</TableCell>
									<TableCell>
										<DateTime value={threat.created_at} />
									</TableCell>
									<TableCell className="text-end">
										<Button
											variant="outline"
											size="sm"
											disabled={resolve.isPending}
											onClick={() => resolve.mutate({ id: threat.id, resolved: !threat.resolved })}
										>
											{threat.resolved ? 'Reopen' : 'Resolve'}
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</ThreatsSection>
		</Stack>
	)
}
