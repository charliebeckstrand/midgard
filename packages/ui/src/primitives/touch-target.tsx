import type { ReactNode } from 'react'
export function TouchTarget({ children }: { children: ReactNode }) {
	return (
		<>
			<span
				className="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 pointer-events-none pointer-fine:hidden"
				aria-hidden="true"
			/>
			{children}
		</>
	)
}
