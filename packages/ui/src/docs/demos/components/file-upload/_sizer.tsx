import type { ReactNode } from 'react'

export function Sizer({ children }: { children: ReactNode }) {
	return <div className="sm:max-w-sm">{children}</div>
}
