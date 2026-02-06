import { useState, ChangeEvent } from "react";
import "./App.css";
import { useQuery, useMutation, gql } from "@apollo/client";

const GET_USERS = gql`
  query GetUsers {
    getUsers {
      id
      age
      name
      isMarried
    }
  }
`;

const GET_USER_BY_ID = gql`
  query GetUserById($id: ID!) {
    getUserById(id: $id) {
      id
      age
      name
      isMarried
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($name: String!, $age: Int!, $isMarried: Boolean!) {
    createUser(name: $name, age: $age, isMarried: $isMarried) {
      name
    }
  }
`;

interface User {
  id: string;
  name: string;
  age: number;
  isMarried: boolean;
}

interface NewUser {
  name?: string;
  age?: string;
}

interface GetUsersData {
  getUsers: User[];
}

interface GetUserByIdData {
  getUserById: User;
}

function App() {
  const [newUser, setNewUser] = useState<NewUser>({});

  const {
    data: getUsersData,
    error: getUsersError,
    loading: getUsersLoading,
  } = useQuery<GetUsersData>(GET_USERS);

  const { data: getUserByIdData, loading: getUserByIdLoading } = useQuery<GetUserByIdData>(
    GET_USER_BY_ID,
    {
      variables: { id: "2" },
    }
  );

  const [createUser] = useMutation(CREATE_USER);

  if (getUsersLoading) return <p> Data loading...</p>;

  if (getUsersError) return <p> Error: {getUsersError.message}</p>;

  const handleCreateUser = async (): Promise<void> => {
    console.log(newUser);
    createUser({
      variables: {
        name: newUser.name,
        age: Number(newUser.age),
        isMarried: false,
      },
    });
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewUser((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleAgeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewUser((prev) => ({ ...prev, age: e.target.value }));
  };

  return (
    <>
      <div>
        <input
          placeholder="Name..."
          onChange={handleNameChange}
        />
        <input
          placeholder="Age..."
          type="number"
          onChange={handleAgeChange}
        />
        <button onClick={handleCreateUser}> Create User</button>
      </div>

      <div>
        {getUserByIdLoading ? (
          <p> Loading user...</p>
        ) : (
          <>
            <h1> Chosen User: </h1>
            <p>{getUserByIdData?.getUserById.name}</p>
            <p>{getUserByIdData?.getUserById.age}</p>
          </>
        )}
      </div>

      <h1> Users</h1>
      <div>
        {" "}
        {getUsersData?.getUsers.map((user: User) => (
          <div key={user.id}>
            <p> Name: {user.name}</p>
            <p> Age: {user.age}</p>
            <p> Is this user married: {user.isMarried ? "Yes" : "No"}</p>
          </div>
        ))}{" "}
      </div>
    </>
  );
}

export default App;