import { useState, ChangeEvent, useEffect } from "react";
import "./App.css";
import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
import { gql } from "@apollo/client";

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
      id
      name
      age
      isMarried
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $name: String, $age: Int, $isMarried: Boolean) {
    updateUser(id: $id, name: $name, age: $age, isMarried: $isMarried) {
      id
      name
      age
      isMarried
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

// Subscriptions
const USER_ADDED = gql`
  subscription UserAdded {
    userAdded {
      id
      name
      age
      isMarried
    }
  }
`;

const USER_UPDATED = gql`
  subscription UserUpdated {
    userUpdated {
      id
      name
      age
      isMarried
    }
  }
`;

const USER_DELETED = gql`
  subscription UserDeleted {
    userDeleted
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

interface SubscriptionNotification {
  type: 'added' | 'updated' | 'deleted';
  message: string;
  timestamp: Date;
}

interface GetUsersData {
  getUsers: User[];
}

interface GetUserByIdData {
  getUserById: User;
}

interface UserAddedData {
  userAdded: User;
}

interface UserUpdatedData {
  userUpdated: User;
}

interface UserDeletedData {
  userDeleted: string;
}

function App() {
  console.log('🚀 App component starting to load...');

  const [newUser, setNewUser] = useState<NewUser>({});
  const [notifications, setNotifications] = useState<SubscriptionNotification[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [wsStatus, setWsStatus] = useState<string>('Connecting...');

  console.log('🔧 State initialized, setting up useEffect...');

  useEffect(() => {
    console.log('App component mounted, subscriptions should be active');
    console.log('Current URL:', window.location.href);

    // Check WebSocket status periodically
    const checkWs = () => {
      setWsStatus('Checking connection...');
    };
    checkWs();
    const interval = setInterval(checkWs, 30000);
    return () => clearInterval(interval);
  }, []);

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
  const [updateUser] = useMutation(UPDATE_USER);
  const [deleteUser] = useMutation(DELETE_USER);

  // Subscriptions
  console.log('Setting up USER_ADDED subscription...');
  useSubscription<UserAddedData>(USER_ADDED, {
    onData: ({ data, client }) => {
      console.log('USER_ADDED subscription triggered:', { fullData: data, dataKeys: Object.keys(data), dataData: data.data });

      const newUser = data.data?.userAdded;

      console.log('newUser:', newUser);

      if (newUser) {
        console.log('New user received:', newUser);
        addNotification('added', `New user ${newUser.name} was added!`);

        // Update the cache with the new user
        try {
          client.cache.modify({
            fields: {
              getUsers(existingUsers = []) {
                const newUserRef = client.cache.writeFragment({
                  data: newUser,
                  fragment: gql`
                    fragment NewUser on User {
                      id
                      name
                      age
                      isMarried
                    }
                  `
                });
                console.log('Cache modify: adding new user', newUser);
                return [...existingUsers, newUserRef];
              }
            }
          });
        } catch (error) {
          console.error('Error updating cache for USER_ADDED:', error);
          // Fallback: refetch the query
          client.refetchQueries({
            include: [GET_USERS]
          });
        }
      }
    },
    onError: (error) => {
      console.error('USER_ADDED subscription error:', error);
    },
    onComplete: () => {
      console.log('USER_ADDED subscription completed');
    }
  });

  console.log('Setting up USER_UPDATED subscription...');
  useSubscription<UserUpdatedData>(USER_UPDATED, {
    onData: ({ data, client }) => {
      console.log('USER_UPDATED subscription triggered:', data);
      if (data.data?.userUpdated) {
        const updatedUser = data.data.userUpdated;
        addNotification('updated', `User ${updatedUser.name} was updated!`);

        // Update the cache with the updated user
        const existingData = client.readQuery<GetUsersData>({ query: GET_USERS });
        if (existingData) {
          client.writeQuery({
            query: GET_USERS,
            data: {
              getUsers: existingData.getUsers.map(user =>
                user.id === updatedUser.id ? updatedUser : user
              )
            }
          });
        }
      }
    },
    onError: (error) => {
      console.error('USER_UPDATED subscription error:', error);
    }
  });

  console.log('Setting up USER_DELETED subscription...');
  useSubscription<UserDeletedData>(USER_DELETED, {
    onData: ({ data, client }) => {
      console.log('USER_DELETED subscription triggered:', data);
      if (data.data?.userDeleted) {
        const deletedUserId = data.data.userDeleted;
        addNotification('deleted', `User with ID ${deletedUserId} was deleted!`);

        // Update the cache by removing the deleted user
        const existingData = client.readQuery<GetUsersData>({ query: GET_USERS });
        if (existingData) {
          client.writeQuery({
            query: GET_USERS,
            data: {
              getUsers: existingData.getUsers.filter(user => user.id !== deletedUserId)
            }
          });
        }
      }
    },
    onError: (error) => {
      console.error('USER_DELETED subscription error:', error);
    }
  });

  console.log('All subscriptions initialized');

  const addNotification = (type: 'added' | 'updated' | 'deleted', message: string) => {
    const notification: SubscriptionNotification = {
      type,
      message,
      timestamp: new Date(),
    };
    setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep only last 10 notifications
  };

  if (getUsersLoading) return <p> Data loading...</p>;

  if (getUsersError) return <p> Error: {getUsersError.message}</p>;

  const handleCreateUser = async (): Promise<void> => {
    if (!newUser.name || !newUser.age) {
      alert('Please fill in both name and age');
      return;
    }
    try {
      await createUser({
        variables: {
          name: newUser.name,
          age: Number(newUser.age),
          isMarried: false,
        },
      });
      setNewUser({}); // Clear form
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (): Promise<void> => {
    if (!editingUser) return;
    try {
      await updateUser({
        variables: {
          id: editingUser.id,
          name: editingUser.name,
          age: editingUser.age,
          isMarried: editingUser.isMarried,
        },
      });
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (id: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser({
        variables: { id },
      });
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewUser((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleAgeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewUser((prev) => ({ ...prev, age: e.target.value }));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const testSubscription = async () => {
    const testUser = {
      name: `Test User ${Date.now()}`,
      age: Math.floor(Math.random() * 50) + 18,
      isMarried: Math.random() > 0.5
    };

    try {
      console.log('Creating test user for subscription test:', testUser);
      await createUser({
        variables: testUser,
      });
    } catch (error) {
      console.error('Error creating test user:', error);
    }
  };

  return (
    <>
      {/* Real-time Notifications */}
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        maxWidth: '300px',
        zIndex: 1000,
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🔔 Real-time Updates</h3>
          <div>
            <button
              onClick={testSubscription}
              style={{ fontSize: '10px', padding: '2px 6px', marginRight: '5px', backgroundColor: '#007bff', color: 'white', border: 'none' }}
            >
              Test
            </button>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                style={{ fontSize: '12px', padding: '2px 6px' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '5px' }}>
          WebSocket: {wsStatus}
        </div>
        {notifications.length === 0 ? (
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>No notifications</p>
        ) : (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {notifications.map((notification, index) => (
              <div
                key={index}
                style={{
                  fontSize: '12px',
                  padding: '5px',
                  margin: '2px 0',
                  borderRadius: '4px',
                  backgroundColor:
                    notification.type === 'added' ? '#d4edda' :
                    notification.type === 'updated' ? '#fff3cd' : '#f8d7da'
                }}
              >
                <div>{notification.message}</div>
                <div style={{ color: '#666', fontSize: '10px' }}>
                  {notification.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Create User Form */}
        <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Create New User</h2>
          <input
            placeholder="Name..."
            value={newUser.name || ''}
            onChange={handleNameChange}
            style={{ margin: '5px', padding: '8px', fontSize: '14px' }}
          />
          <input
            placeholder="Age..."
            type="number"
            value={newUser.age || ''}
            onChange={handleAgeChange}
            style={{ margin: '5px', padding: '8px', fontSize: '14px' }}
          />
          <button
            onClick={handleCreateUser}
            style={{ margin: '5px', padding: '8px 16px', fontSize: '14px' }}
          >
            Create User
          </button>
        </div>

        {/* Single User Display */}
        <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          {getUserByIdLoading ? (
            <p>Loading user...</p>
          ) : (
            <>
              <h2>Featured User (ID: 2)</h2>
              <div style={{ fontSize: '16px' }}>
                <p><strong>Name:</strong> {getUserByIdData?.getUserById.name}</p>
                <p><strong>Age:</strong> {getUserByIdData?.getUserById.age}</p>
                <p><strong>Married:</strong> {getUserByIdData?.getUserById.isMarried ? 'Yes' : 'No'}</p>
              </div>
            </>
          )}
        </div>

        {/* All Users List */}
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>All Users ({getUsersData?.getUsers.length || 0})</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {getUsersData?.getUsers.map((user: User) => (
              <div
                key={user.id}
                style={{
                  padding: '15px',
                  border: '1px solid #eee',
                  borderRadius: '6px',
                  backgroundColor: '#fafafa'
                }}
              >
                {editingUser?.id === user.id ? (
                  // Edit mode
                  <div>
                    <input
                      value={editingUser.name}
                      title="name"
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                      style={{ margin: '2px', padding: '5px' }}
                    />
                    <input
                      type="number"
                      title="age"
                      value={editingUser.age}
                      onChange={(e) => setEditingUser({...editingUser, age: Number(e.target.value)})}
                      style={{ margin: '2px', padding: '5px' }}
                    />
                    <label style={{ margin: '2px' }}>
                      <input
                        type="checkbox"
                        checked={editingUser.isMarried}
                        onChange={(e) => setEditingUser({...editingUser, isMarried: e.target.checked})}
                      />
                      Married
                    </label>
                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={() => handleUpdateUser()}
                        style={{ margin: '2px', padding: '5px 10px', backgroundColor: '#28a745', color: 'white' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        style={{ margin: '2px', padding: '5px 10px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ margin: '2px' }}><strong>ID:</strong> {user.id}</p>
                      <p style={{ margin: '2px' }}><strong>Name:</strong> {user.name}</p>
                      <p style={{ margin: '2px' }}><strong>Age:</strong> {user.age}</p>
                      <p style={{ margin: '2px' }}><strong>Married:</strong> {user.isMarried ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <button
                        onClick={() => setEditingUser(user)}
                        style={{ margin: '2px', padding: '5px 10px', backgroundColor: '#007bff', color: 'white' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        style={{ margin: '2px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;