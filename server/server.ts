import { EventEmitter } from "node:events";
import http from "node:http";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import express from "express";
import { useServer } from "graphql-ws/use/ws";
import { Pool } from "pg";
import { WebSocketServer } from "ws";
import "dotenv/config";

// Initialize PostgreSQL connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize Prisma Client with PostgreSQL adapter
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface User {
	id: string;
	name: string;
	age: number;
	isMarried: boolean;
}

interface CreateUserArgs {
	name: string;
	age: number;
	isMarried: boolean;
}

interface GetUserByIdArgs {
	id: string;
}

// Create simple event emitter for subscriptions
const eventEmitter = new EventEmitter();

// Simple async iterator implementation
const createAsyncIterator = (eventName: string) => {
	return {
		[Symbol.asyncIterator]: () => {
			const listeners: Array<(value: unknown) => void> = [];
			let listening = true;

			const listener = (data: unknown) => {
				if (listening) {
					listeners.forEach((resolve) => {
						resolve({ value: data });
					});
					listeners.length = 0;
				}
			};

			eventEmitter.on(eventName, listener);

			return {
				next: () =>
					new Promise((resolve) => {
						if (listening) {
							listeners.push(resolve);
						} else {
							resolve({ done: true, value: undefined });
						}
					}),
				return: () => {
					listening = false;
					eventEmitter.removeListener(eventName, listener);
					return Promise.resolve({ done: true, value: undefined });
				},
			};
		},
	};
};

const typeDefs = `
    type Query {
      getUsers: [User]
      getUserById(id: ID!): User
    }

    type Mutation {
      createUser(name: String!, age: Int!, isMarried: Boolean!): User
      updateUser(id: ID!, name: String, age: Int, isMarried: Boolean): User
      deleteUser(id: ID!): Boolean
    }

    type Subscription {
      userAdded: User
      userUpdated: User
      userDeleted: String
    }

    type User {
      id: ID
      name: String
      age: Int
      isMarried: Boolean
    }
`;

const resolvers = {
	Query: {
		getUsers: async (): Promise<User[]> => {
			return await prisma.user.findMany();
		},
		getUserById: async (
			_parent: unknown,
			args: GetUserByIdArgs,
		): Promise<User | null> => {
			return await prisma.user.findUnique({
				where: { id: args.id },
			});
		},
	},
	Mutation: {
		createUser: async (
			_parent: unknown,
			args: CreateUserArgs,
		): Promise<User> => {
			const { name, age, isMarried } = args;
			const newUser = await prisma.user.create({
				data: {
					name,
					age,
					isMarried,
				},
			});

			console.log("Created new user:", newUser);

			// Publish the new user to subscribers
			console.log("Publishing USER_ADDED event:", { userAdded: newUser });
			eventEmitter.emit("USER_ADDED", { userAdded: newUser });

			return newUser;
		},
		updateUser: async (
			_parent: unknown,
			args: { id: string; name?: string; age?: number; isMarried?: boolean },
		): Promise<User | null> => {
			try {
				// Build the data object with only defined fields
				const updateData: {
					name?: string;
					age?: number;
					isMarried?: boolean;
				} = {};

				if (args.name !== undefined) updateData.name = args.name;
				if (args.age !== undefined) updateData.age = args.age;
				if (args.isMarried !== undefined) updateData.isMarried = args.isMarried;

				const updatedUser = await prisma.user.update({
					where: { id: args.id },
					data: updateData,
				});

				// Publish the updated user to subscribers
				console.log("Publishing USER_UPDATED event:", {
					userUpdated: updatedUser,
				});
				eventEmitter.emit("USER_UPDATED", { userUpdated: updatedUser });

				return updatedUser;
			} catch (error) {
				console.error("Error updating user:", error);
				return null;
			}
		},
		deleteUser: async (
			_parent: unknown,
			args: { id: string },
		): Promise<boolean> => {
			try {
				await prisma.user.delete({
					where: { id: args.id },
				});

				// Publish the deleted user ID to subscribers
				console.log("Publishing USER_DELETED event:", { userDeleted: args.id });
				eventEmitter.emit("USER_DELETED", { userDeleted: args.id });

				return true;
			} catch (error) {
				console.error("Error deleting user:", error);
				return false;
			}
		},
	},
	Subscription: {
		userAdded: {
			subscribe: () => {
				console.log("Client subscribed to USER_ADDED");
				console.log("Creating async iterator for USER_ADDED");
				return createAsyncIterator("USER_ADDED");
			},
		},
		userUpdated: {
			subscribe: () => {
				console.log("Client subscribed to USER_UPDATED");
				return createAsyncIterator("USER_UPDATED");
			},
		},
		userDeleted: {
			subscribe: () => {
				console.log("Client subscribed to USER_DELETED");
				return createAsyncIterator("USER_DELETED");
			},
		},
	},
};

// Create the schema
const schema = makeExecutableSchema({
	typeDefs,
	resolvers,
});

// Create an Express app and HTTP server
const app = express();
const httpServer = http.createServer(app);

// Create our WebSocket server using the HTTP server we just set up
const wsServer = new WebSocketServer({
	server: httpServer,
	path: "/graphql",
});

// Save the returned server's info so we can shutdown this server later
const serverCleanup = useServer({ schema }, wsServer);

// Set up ApolloServer
const server = new ApolloServer({
	schema,
	plugins: [
		// Proper shutdown for the HTTP server
		ApolloServerPluginDrainHttpServer({ httpServer }),
		// Proper shutdown for the WebSocket server
		{
			async serverWillStart() {
				return {
					async drainServer() {
						await serverCleanup.dispose();
					},
				};
			},
		},
	],
});

await server.start();

// Set up our Express middleware to handle CORS, body parsing,
// and our expressMiddleware function
app.use(
	"/graphql",
	cors<cors.CorsRequest>(),
	express.json(),
	expressMiddleware(server) as unknown as express.RequestHandler,
);

const PORT = 4000;

// Now that our HTTP server is fully set up, we can listen to it
httpServer.listen(PORT, () => {
	console.log(`Server is now running on http://localhost:${PORT}/graphql`);
	console.log(`Subscriptions ready at ws://localhost:${PORT}/graphql`);
});

///// Query, Mutation, Subscription
//// typeDefs, resolvers
