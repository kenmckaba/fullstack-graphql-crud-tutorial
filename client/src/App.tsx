import { gql } from '@apollo/client'
import { useMutation, useQuery, useSubscription } from '@apollo/client/react'
import { type ChangeEvent, useEffect, useState } from 'react'

const GET_USERS = gql`
  query GetUsers {
    getUsers {
      id
      age
      name
      isMarried
    }
  }
`

const GET_USER_BY_ID = gql`
  query GetUserById($id: ID!) {
    getUserById(id: $id) {
      id
      age
      name
      isMarried
    }
  }
`

const CREATE_USER = gql`
  mutation CreateUser($name: String!, $age: Int!, $isMarried: Boolean!) {
    createUser(name: $name, age: $age, isMarried: $isMarried) {
      id
      name
      age
      isMarried
    }
  }
`

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $name: String, $age: Int, $isMarried: Boolean) {
    updateUser(id: $id, name: $name, age: $age, isMarried: $isMarried) {
      id
      name
      age
      isMarried
    }
  }
`

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`

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
`

const USER_UPDATED = gql`
  subscription UserUpdated {
    userUpdated {
      id
      name
      age
      isMarried
    }
  }
`

const USER_DELETED = gql`
  subscription UserDeleted {
    userDeleted
  }
`

interface User {
  id: string
  name: string
  age: number
  isMarried: boolean
}

interface NewUser {
  name?: string
  age?: string


}

interface SubscriptionNotification {
  type: 'added' | 'updated' | 'deleted'
  message: string
  timestamp: Date
}

interface GetUsersData {
  getUsers: User[]
}

interface GetUserByIdData {
  getUserById: User
}

interface UserAddedData {
  userAdded: User
}

interface UserUpdatedData {
  userUpdated: User
}

interface UserDeletedData {
  userDeleted: string
}

function App() {
  console.log('🚀 App component starting to load...')

  const [newUser, setNewUser] = useState<NewUser>({})
  const [notifications, setNotifications] = useState<
    SubscriptionNotification[]
  >([])
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [wsStatus, setWsStatus] = useState<string>('Connecting...')

  console.log('🔧 State initialized, setting up useEffect...')

  useEffect(() => {
    console.log('App component mounted, subscriptions should be active')
    console.log('Current URL:', window.location.href)

    // Check WebSocket status periodically
    const checkWs = () => {
      setWsStatus('Checking connection...')
    }
    checkWs()
    const interval = setInterval(checkWs, 30000)
    return () => clearInterval(interval)
  }, [])

  const {
    data: getUsersData,
    error: getUsersError,
    loading: getUsersLoading,
  } = useQuery<GetUsersData>(GET_USERS)

  const { data: getUserByIdData, loading: getUserByIdLoading } =
    useQuery<GetUserByIdData>(GET_USER_BY_ID, {
      variables: { id: '2' },
    })

  const [createUser] = useMutation(CREATE_USER)
  const [updateUser] = useMutation(UPDATE_USER)
  const [deleteUser] = useMutation(DELETE_USER)

  // Subscriptions
  console.log('Setting up USER_ADDED subscription...')
  useSubscription<UserAddedData>(USER_ADDED, {
    onData: ({ data, client }) => {
      console.log('USER_ADDED subscription triggered:', {
        fullData: data,
        dataKeys: Object.keys(data),
        dataData: data.data,
      })

      const newUser = data.data?.userAdded

      console.log('newUser:', newUser)

      if (newUser) {
        console.log('New user received:', newUser)
        addNotification('added', `New user ${newUser.name} was added!`)

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
                  `,
                })
                console.log('Cache modify: adding new user', newUser)
                return [...existingUsers, newUserRef]
              },
            },
          })
        } catch (error) {
          console.error('Error updating cache for USER_ADDED:', error)
          // Fallback: refetch the query
          client.refetchQueries({
            include: [GET_USERS],
          })
        }
      }
    },
    onError: (error) => {
      console.error('USER_ADDED subscription error:', error)
    },
    onComplete: () => {
      console.log('USER_ADDED subscription completed')
    },
  })

  console.log('Setting up USER_UPDATED subscription...')
  useSubscription<UserUpdatedData>(USER_UPDATED, {
    onData: ({ data, client }) => {
      console.log('USER_UPDATED subscription triggered:', data)
      if (data.data?.userUpdated) {
        const updatedUser = data.data.userUpdated
        addNotification('updated', `User ${updatedUser.name} was updated!`)

        // Update the cache with the updated user
        const existingData = client.readQuery<GetUsersData>({
          query: GET_USERS,
        })
        if (existingData) {
          client.writeQuery({
            query: GET_USERS,
            data: {
              getUsers: existingData.getUsers.map((user) =>
                user.id === updatedUser.id ? updatedUser : user,
              ),
            },
          })
        }
      }
    },
    onError: (error) => {
      console.error('USER_UPDATED subscription error:', error)
    },
  })

  console.log('Setting up USER_DELETED subscription...')
  useSubscription<UserDeletedData>(USER_DELETED, {
    onData: ({ data, client }) => {
      console.log('USER_DELETED subscription triggered:', data)
      if (data.data?.userDeleted) {
        const deletedUserId = data.data.userDeleted
        addNotification('deleted', `User with ID ${deletedUserId} was deleted!`)

        // Update the cache by removing the deleted user
        const existingData = client.readQuery<GetUsersData>({
          query: GET_USERS,
        })
        if (existingData) {
          client.writeQuery({
            query: GET_USERS,
            data: {
              getUsers: existingData.getUsers.filter(
                (user) => user.id !== deletedUserId,
              ),
            },
          })
        }
      }
    },
    onError: (error) => {
      console.error('USER_DELETED subscription error:', error)
    },
  })

  console.log('All subscriptions initialized')

  const addNotification = (
    type: 'added' | 'updated' | 'deleted',
    message: string,
  ) => {
    const notification: SubscriptionNotification = {
      type,
      message,
      timestamp: new Date(),
    }
    setNotifications((prev) => [notification, ...prev].slice(0, 10)) // Keep only last 10 notifications
  }

  if (getUsersLoading)
    return <p className="text-center p-8"> Data loading...</p>

  if (getUsersError)
    return (
      <p className="text-center p-8 text-red-600">
        {' '}
        Error: {getUsersError.message}
      </p>
    )

  const handleCreateUser = async (): Promise<void> => {
    if (!newUser.name || !newUser.age) {
      alert('Please fill in both name and age')
      return
    }
    try {
      await createUser({
        variables: {
          name: newUser.name,
          age: Number(newUser.age),
          isMarried: false,
        },
      })
      setNewUser({}) // Clear form
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const handleUpdateUser = async (): Promise<void> => {
    if (!editingUser) return
    try {
      await updateUser({
        variables: {
          id: editingUser.id,
          name: editingUser.name,
          age: editingUser.age,
          isMarried: editingUser.isMarried,
        },
      })
      setEditingUser(null)
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleDeleteUser = async (id: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await deleteUser({
        variables: { id },
      })
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewUser((prev) => ({ ...prev, name: e.target.value }))
  }

  const handleAgeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewUser((prev) => ({ ...prev, age: e.target.value }))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const testSubscription = async () => {
    const testUser = {
      name: `Test User ${Date.now()}`,
      age: Math.floor(Math.random() * 50) + 18,
      isMarried: Math.random() > 0.5,
    }

    try {
      console.log('Creating test user for subscription test:', testUser)
      await createUser({
        variables: testUser,
      })
    } catch (error) {
      console.error('Error creating test user:', error)
    }
  }

  return (
    <>
      {/* Real-time Notifications */}
      <div className="notification-panel">
        <div className="notification-header">
          <h3 className="notification-title">🔔 Real-time Updates</h3>
          <div>
            <button
              type="button"
              onClick={testSubscription}
              className="text-xs px-1.5 py-0.5 mr-1 bg-blue-600 text-white border-0 rounded hover:bg-blue-700 transition-colors"
            >
              Test
            </button>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                className="btn-secondary"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          WebSocket: {wsStatus}
        </div>
        {notifications.length === 0 ? (
          <p className="m-0 text-xs text-gray-600 dark:text-gray-400">
            No notifications
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.timestamp.getTime()}
                className={`text-xs p-2 my-0.5 rounded ${notification.type === 'added'
                  ? 'bg-green-100 dark:bg-green-900'
                  : notification.type === 'updated'
                    ? 'bg-yellow-100 dark:bg-yellow-900'
                    : 'bg-red-100 dark:bg-red-900'
                  }`}
              >
                <div>{notification.message}</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">
                  {notification.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 max-w-4xl mx-auto">
        {/* Create User Form */}
        <div className="form-container">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 text-center">
            Create New User
          </h2>
          <div className="form-inputs">
            <input
              placeholder="Name..."
              value={newUser.name || ''}
              onChange={handleNameChange}
              className="form-input"
            />
            <input
              placeholder="Age..."
              type="number"
              value={newUser.age || ''}
              onChange={handleAgeChange}
              className="form-input"
            />
            <button
              type="button"
              onClick={handleCreateUser}
              className="btn-primary"
            >
              Create User
            </button>
          </div>
        </div>

        {/* Single User Display */}
        <div className="form-container">
          {getUserByIdLoading ? (
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Loading user...
            </p>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 text-center">
                Featured User (ID: 2)
              </h2>
              <div className="text-base text-center">
                <p className="mb-2 text-center">
                  <strong>Name:</strong> {getUserByIdData?.getUserById.name}
                </p>
                <p className="mb-2 text-center">
                  <strong>Age:</strong> {getUserByIdData?.getUserById.age}
                </p>
                <p className="mb-2 text-center">
                  <strong>Married:</strong>{' '}
                  {getUserByIdData?.getUserById.isMarried ? 'Yes' : 'No'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* All Users List */}
        <div className="form-container">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 text-center">
            All Users ({getUsersData?.getUsers.length || 0})
          </h2>
          <div className="grid gap-4">
            {getUsersData?.getUsers.map((user: User) => (
              <div key={user.id} className="user-card">
                {editingUser?.id === user.id ? (
                  // Edit mode
                  <div className="form-inputs">
                    <input
                      value={editingUser.name}
                      title="name"
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, name: e.target.value })
                      }
                      className="form-input"
                    />
                    <input
                      type="number"
                      title="age"
                      value={editingUser.age}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          age: Number(e.target.value),
                        })
                      }
                      className="form-input"
                    />
                    <label className="m-1 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={editingUser.isMarried}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            isMarried: e.target.checked,
                          })
                        }
                      />
                      <span className="ml-1">Married</span>
                    </label>
                    <div className="button-group">
                      <button
                        type="button"
                        onClick={() => handleUpdateUser()}
                        className="m-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="text-center">
                    <div className="mb-2">
                      <p className="mb-1 text-center">
                        <strong>ID:</strong> {user.id}
                      </p>
                      <p className="mb-1 text-center">
                        <strong>Name:</strong> {user.name}
                      </p>
                      <p className="mb-1 text-center">
                        <strong>Age:</strong> {user.age}
                      </p>
                      <p className="mb-1 text-center">
                        <strong>Married:</strong>{' '}
                        {user.isMarried ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="button-group">
                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className="m-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id)}
                        className="btn-danger"
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
  )
}

export default App
