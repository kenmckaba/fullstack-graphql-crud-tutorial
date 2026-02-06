import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

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
    getUserById: (_parent: any, args: GetUserByIdArgs): User | undefined => {
      const id = args.id;
      return users.find((user) => user.id === id);
    },
  },
  Mutation: {
    createUser: (_parent: any, args: CreateUserArgs): User => {
      const { name, age, isMarried } = args;
      const newUser: User = {
        id: (users.length + 1).toString(),
        name,
        age,
        isMarried,
      };
      console.log(newUser);
      users.push(newUser);
      return newUser;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Server Running at: ${url}`);

///// Query, Mutation
//// typeDefs, resolvers