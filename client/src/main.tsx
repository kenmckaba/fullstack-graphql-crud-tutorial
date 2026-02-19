console.log('🌟 main.tsx loading...');

import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

console.log('📦 All imports loaded successfully');

// HTTP Link for queries and mutations
const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
});

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(createClient({
  url: "ws://localhost:4000/graphql",
  connectionParams: () => {
    console.log('WebSocket connection params being set');
    return {};
  },
  on: {
    connecting: () => console.log('WebSocket connecting...'),
    connected: () => console.log('WebSocket connected successfully'),
    error: (error) => console.error('WebSocket error:', error),
    closed: () => console.log('WebSocket connection closed'),
    message: (message) => console.log('WebSocket message received:', message),
  },
}));

console.log('GraphQL WebSocket client configured for ws://localhost:4000/graphql');

// Split link to route operations to the correct link
const splitLink = ApolloLink.split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

console.log('⚡ Apollo Client created, starting React render...');

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);

console.log('✅ React app render initiated');