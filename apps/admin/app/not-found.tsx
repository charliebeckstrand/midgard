import type { Metadata } from 'next'
import { Center } from 'ui/center'
import { Stack } from 'ui/stack'

export const metadata: Metadata = {
	title: '404 - Page Not Found',
}

export default function NotFound() {
	return (
		<Center>
			<Stack align="center" gap={2} className="px-4 text-center text-xl dark:text-white">
				<div className="text-3xl font-black">404</div>
				<div className="font-light text-gray-400">This page could not be found</div>
			</Stack>
		</Center>
	)
}
