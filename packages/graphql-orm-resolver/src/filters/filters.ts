import { TableResolveContext } from "../resolvers/table"
import { is_plain_object } from "../utils/is-plain-object"

// TODO: per-field definitions
export type FiltersDef = boolean

export type FilterScalarValue = null | string | number | boolean
export type FilterValue = FilterScalarValue | Exclude<FilterScalarValue, null>[]
export type Filter = { [property: string]: FilterValue }

interface ApplyFiltersOptions {
	filters: FiltersDef
	modifiers?: Record<string, ApplyFiltersModifier>
	context: TableResolveContext
}

export type ApplyFiltersModifier = (
	query: unknown,
	value: any,
	context: TableResolveContext
) => unknown

export function apply_filters(
	query: unknown,
	{ filters, modifiers, context }: ApplyFiltersOptions
) {
	if (!filters) {
		return query
	}
	const filter_obj = context.tree.args?.filter
	if (!filter_obj) {
		return query
	}
	if (!is_plain_object(filter_obj)) {
		throw new Error(`Invalid filter: ${filter_obj}, must be object.`)
	}
	for (const [field, value] of Object.entries(filter_obj)) {
		if (value === undefined) {
			// Support optional GraphQL arguments in filter
			continue
		}
		if (modifiers?.[field]) {
			query = modifiers[field](query, value, context)
		} else {
			const [table_field, op0] = field.split("__")
			const op = op0?.toLowerCase()
			// TODO: validate op
			query = context.graph.orm.where(query, table_field, op, value)
		}
	}
	return query
}
