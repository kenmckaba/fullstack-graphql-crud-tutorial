import { EventEmitter } from "node:events";
import http from "node:http";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import cors from "cors";
import express from "express";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";

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
						if (!listening) {
							resolve({ done: true, value: undefined });
						} else {
							listeners.push(resolve);
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

const users: User[] = [
	{ id: "1", name: "John Doe", age: 30, isMarried: true },
	{ id: "2", name: "Jane Smith", age: 25, isMarried: false },
	{ id: "3", name: "Alice Johnson", age: 28, isMarried: false },
];

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
		getUsers: (): User[] => {
			return users;
		},
		getUserById: (
			_parent: unknown,
			args: GetUserByIdArgs,
		): User | undefined => {
			const id = args.id;
			return users.find((user) => user.id === id);
		},
	},
	Mutation: {
		createUser: (_parent: unknown, args: CreateUserArgs): User => {
			const { name, age, isMarried } = args;
			const newUser: User = {
				id: (users.length + 1).toString(),
				name,
				age,
				isMarried,
			};
			console.log("Created new user:", newUser);
			users.push(newUser);

			// Publish the new user to subscribers
			console.log("Publishing USER_ADDED event:", { userAdded: newUser });
			eventEmitter.emit("USER_ADDED", { userAdded: newUser });

			return newUser;
		},
		updateUser: (
			_parent: unknown,
			args: { id: string; name?: string; age?: number; isMarried?: boolean },
		): User | null => {
			const userIndex = users.findIndex((user) => user.id === args.id);
			if (userIndex === -1) return null;

			const existingUser = users[userIndex];
			if (!existingUser) return null;

			const updatedUser: User = {
				id: existingUser.id,
				name: args.name !== undefined ? args.name : existingUser.name,
				age: args.age !== undefined ? args.age : existingUser.age,
				isMarried:
					args.isMarried !== undefined
						? args.isMarried
						: existingUser.isMarried,
			};

			users[userIndex] = updatedUser;

			// Publish the updated user to subscribers
			console.log("Publishing USER_UPDATED event:", {
				userUpdated: updatedUser,
			});
			eventEmitter.emit("USER_UPDATED", { userUpdated: updatedUser });

			return updatedUser;
		},
		deleteUser: (_parent: unknown, args: { id: string }): boolean => {
			const userIndex = users.findIndex((user) => user.id === args.id);
			if (userIndex === -1) return false;

			users.splice(userIndex, 1);

			// Publish the deleted user ID to subscribers
			console.log("Publishing USER_DELETED event:", { userDeleted: args.id });
			eventEmitter.emit("USER_DELETED", { userDeleted: args.id });

			return true;
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
