// Replicate basic demo from README.md

import gql from "graphql-tag"
import { Model } from "objection"
import { GraphResolver, ModelResolver } from "objection-graphql-resolver"
import tap from "tap"

import { Resolvers, setup } from "./setup"

// Define Objection.js models

class PostModel extends Model {
	static tableName = "post"

	id?: number
	text?: string
}

// Define GraphQL schema

const typeDefs = gql`
	type Post {
		id: Int!
		text: String!
	}

	type Mutation {
		create_post(text: String!): Post!
	}

	type Query {
		posts: [Post!]!
	}
`

// Map GraphQL types to model resolvers

const resolveGraph = GraphResolver({
	Post: ModelResolver(PostModel),
})

// Define resolvers

const resolvers: Resolvers = {
	Mutation: {
		async create_post(_parent, args, ctx, info) {
			const post = await PostModel.query().insert(args)
			return resolveGraph(ctx, info, post.$query())
		},
	},
	Query: {
		posts(_parent, _args, ctx, info) {
			return resolveGraph(ctx, info, PostModel.query().orderBy("id"))
		},
	},
}

tap.test("basic demo", async (tap) => {
	const { client, knex } = await setup(tap, { typeDefs, resolvers })

	await knex.schema.createTable("post", (post) => {
		post.increments("id")
		post.text("text").notNullable()
	})

	await client.request(
		gql`
			mutation create_post($text: String!) {
				new_post: create_post(text: $text) {
					id
				}
			}
		`,
		{ text: "Hello, world!" }
	)

	const { posts } = await client.request(
		gql`
			query {
				posts {
					id
					text
				}
			}
		`
	)

	tap.same(posts, [{ id: 1, text: "Hello, world!" }])
})