import type { ComponentPropsWithoutRef } from 'react'
import { createCurrentContent } from '../../primitives'

const { Contents: TabContents, Content: TabContent } = createCurrentContent('tab')

export { TabContent, TabContents }

export type TabContentsProps = ComponentPropsWithoutRef<typeof TabContents>
export type TabContentProps = ComponentPropsWithoutRef<typeof TabContent>
