import { cn } from '../../core'
import { codeVariants } from './variants'

export type CodeProps = React.ComponentPropsWithoutRef<'code'>

export function Code({ className, ...props }: CodeProps) {
	return <code data-slot="code" className={cn(codeVariants(), className)} {...props} />
}
