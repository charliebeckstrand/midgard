import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: '404 - Page Not Found',
}

export default function NotFound() {
	return (
		<div className="flex justify-center items-center">
			<div className="flex flex-col items-center text-xl dark:text-white text-center px-4 gap-2">
				<div className="text-3xl font-black">404</div>
				<div className="text-gray-400 font-light">This page could not be found</div>
			</div>
		</div>
	)
}
