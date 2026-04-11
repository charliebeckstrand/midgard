'use client'

import { useEffect, useState } from 'react'
import { Avatar } from '../../components/avatar'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Card, CardBody, CardHeader } from '../../components/card'
import { Checkbox } from '../../components/checkbox'
import { Chip } from '../../components/chip'
import { Heading } from '../../components/heading'
import { Input } from '../../components/input'
import { Radio } from '../../components/radio'
import { Skeleton } from '../../components/skeleton'
import { Switch } from '../../components/switch'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Feedback' }

function TransitionDemo() {
	const [ready, setReady] = useState(false)

	useEffect(() => {
		if (!ready) return

		const timer = setTimeout(() => setReady(false), 4000)

		return () => clearTimeout(timer)
	}, [ready])

	return (
		<div className="space-y-4">
			<Button variant="outline" size="sm" onClick={() => setReady(!ready)}>
				{ready ? 'Reset' : 'Simulate load'}
			</Button>

			<Skeleton ready={ready}>
				<Card className="max-w-sm">
					<CardHeader>
						<div className="flex items-center gap-3">
							<Avatar initials="JD" />
							<div className="flex-1 space-y-1">
								<Heading level={5}>Jane Doe</Heading>
								<Text>Senior Engineer</Text>
							</div>
						</div>
					</CardHeader>
					<CardBody>
						<Text>Working on design systems and component libraries. Based in San Francisco.</Text>
					</CardBody>
				</Card>
			</Skeleton>
		</div>
	)
}

export default function SkeletonDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Dynamic skeletons"
				code={code`
					import { Skeleton } from 'ui/skeleton'

					<Skeleton>
						<Button size="lg">Submit</Button>
						<Avatar size="md" />
						<Input placeholder="Email" />
					</Skeleton>
				`}
			>
				<Skeleton>
					<div className="flex flex-wrap items-center gap-4">
						<Button size="lg">Submit</Button>
						<Button>Save</Button>
						<Button size="sm" variant="outline">
							Cancel
						</Button>
						<Avatar size="md" />
						<Badge>New</Badge>
						<Chip>Filter</Chip>
						<Switch />
						<Checkbox />
						<Radio />
					</div>
				</Skeleton>
			</Example>

			<Example title="Form">
				<Skeleton>
					<div className="max-w-sm space-y-3">
						<Heading level={3}>Create account</Heading>
						<Input placeholder="Email" />
						<Input placeholder="Password" type="password" />
						<Textarea placeholder="Bio" />
						<Button>Sign up</Button>
					</div>
				</Skeleton>
			</Example>

			<Example
				title="Transition"
				code={code`
					<Skeleton ready={!loading}>
						<UserCard user={user} />
					</Skeleton>
				`}
			>
				<TransitionDemo />
			</Example>
		</div>
	)
}
