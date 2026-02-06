https://www.youtube.com/watch?v=BNYwj0ZvU1U

# React GraphQL FullStack Tutorial 2025 - Apollo Client + Apollo Server
Welcome to the **React GraphQL FullStack Tutorial 2025**! This project demonstrates how to create a full-stack application using **React**, **Apollo Client**, **Apollo Server**, and **GraphQL**. The project includes a simple **CRUD (Create, Read, Update, Delete)** example where you can:

1. View a list of users.
2. View a single user by ID.
3. Create a new user.

## Features

- **React** for building the frontend.
- **Apollo Client** for interacting with the GraphQL API.
- **Apollo Server** for building the backend with GraphQL.
- Simple **User** model with fields `id`, `name`, `age`, and `isMarried`.

## Prerequisites

- Node.js (v14 or above)
- npm or yarn

## Installation

Follow these steps to set up the project on your local machine.

### 1. Clone this repository

```bash
git clone https://github.com/your-username/react-graphql-fullstack.git
cd react-graphql-fullstack
```

### 2. Backend Setup

1. Go to the backend directory:

```bash
cd backend
```

2. Install the required dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

This will run the Apollo Server on `http://localhost:4000`.

### 3. Frontend Setup

1. Go to the frontend directory:

```bash
cd frontend
```

2. Install the required dependencies:

```bash
npm install
```

3. Start the React development server:

```bash
npm run dev
```

This will run the React app on `http://localhost:3000`.

## How to Use

### 1. View all users

Once the app is running, the **All Users** section will display a list of users retrieved from the GraphQL server.

### 2. View a user by ID

Enter a user ID in the **Get User By ID** input field, and the app will fetch and display that user's details.

### 3. Create a new user

Use the **Create New User** form to add a new user. You'll need to provide a `name`, `age`, and whether the user is `married`.

## Tech Stack

- **Frontend**: React, Apollo Client, Vite
- **Backend**: Node.js, Apollo Server, GraphQL
- **Database**: In-memory (No database used in this tutorial)

## YouTube Channel

If you enjoyed this tutorial, make sure to subscribe to my YouTube channel for more tech tutorials and tips:

[**@pedrotechnologies**](https://www.youtube.com/@pedrotechnologies)

## License

This project is open source and available under the [MIT License](LICENSE).
