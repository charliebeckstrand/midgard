import { AvatarSkeleton } from '../../components/avatar'
import { BadgeSkeleton } from '../../components/badge'
import { Button, ButtonSkeleton } from '../../components/button'
import { CheckboxSkeleton } from '../../components/checkbox'
import { DividerSkeleton } from '../../components/divider'
import { HeadingSkeleton } from '../../components/heading'
import { Input, InputSkeleton } from '../../components/input'
import { Skeleton } from '../../components/placeholder'
import { RadioSkeleton } from '../../components/radio'
import { SelectSkeleton } from '../../components/select'
import { SwitchSkeleton } from '../../components/switch'
import { TextSkeleton } from '../../components/text'
import { TextareaSkeleton } from '../../components/textarea'

export const meta = { category: 'Feedback' }

export default function PlaceholderDemo() {
	return (
		<div className="max-w-md space-y-8">
			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Skeleton wrapper (dynamic)</p>
				<Skeleton>
					<Button>Submit</Button>
				</Skeleton>
				<Skeleton>
					<Input placeholder="Email" />
				</Skeleton>
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Form controls</p>
				<InputSkeleton />
				<SelectSkeleton />
				<TextareaSkeleton />
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Button</p>
				<div className="flex gap-2">
					<ButtonSkeleton className="w-20" />
					<ButtonSkeleton className="w-28" />
				</div>
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Text</p>
				<HeadingSkeleton />
				<TextSkeleton />
				<TextSkeleton className="max-w-[70%]" />
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Toggles</p>
				<div className="flex items-center gap-4">
					<CheckboxSkeleton />
					<RadioSkeleton />
					<SwitchSkeleton />
				</div>
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Avatar &amp; Badge</p>
				<div className="flex items-center gap-3">
					<AvatarSkeleton />
					<AvatarSkeleton className="size-10" />
					<AvatarSkeleton className="size-12" />
					<BadgeSkeleton className="w-16" />
				</div>
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Divider</p>
				<DividerSkeleton />
			</section>
		</div>
	)
}
