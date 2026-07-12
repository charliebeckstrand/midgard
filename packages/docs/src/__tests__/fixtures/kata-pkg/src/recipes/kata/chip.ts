type RecipeConfig = {
	base: string[]
	variant: Record<string, string>
	defaults: Record<string, string>
}

function defineRecipe(config: RecipeConfig): () => string {
	return () => config.base.join(' ')
}

export const k = defineRecipe({
	base: ['inline-flex'],
	variant: { solid: 'ring', soft: 'inset' },
	defaults: { variant: 'solid', color: 'zinc', size: 'md' },
})
