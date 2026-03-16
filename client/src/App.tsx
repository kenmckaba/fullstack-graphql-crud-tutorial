import { gql } from '@apollo/client'
import { useMutation, useQuery, useSubscription } from '@apollo/client/react'
import { type ChangeEvent, useEffect, useState } from 'react'

// User CRUD GraphQL Operations
const GET_USERS = gql`
  query GetUsers {
    getUsers {
      id
      name
      email
      createdAt
    }
  }
`

const CREATE_USER = gql`
  mutation CreateUser($name: String!, $email: String!) {
    createUser(name: $name, email: $email) {
      id
      name
      email
      createdAt
    }
  }
`

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $name: String, $email: String) {
    updateUser(id: $id, name: $name, email: $email) {
      id
      name
      email
      createdAt
    }
  }
`

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`

// Subscriptions
const USER_ADDED_SUBSCRIPTION = gql`
  subscription UserAdded {
    userAdded {
      id
      name
      email
      createdAt
    }
  }
`

const USER_UPDATED_SUBSCRIPTION = gql`
  subscription UserUpdated {
    userUpdated {
      id
      name
      email
      createdAt
    }
  }
`

const USER_DELETED_SUBSCRIPTION = gql`
  subscription UserDeleted {
    userDeleted
  }
`

// Types
interface User {
  id: string
  name: string
  email: string
  createdAt: string
  [key: string]: any // Index signature for Apollo Client compatibility
}

interface NewUser {
  name?: string
  email?: string
}

interface SubscriptionNotification {
  id: string
  type: 'added' | 'updated' | 'deleted'
  timestamp: Date
  userId?: string
  userName?: string
}

interface GetUsersData {
  getUsers: User[]
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

interface CreateUserData {
  createUser: User
}

interface UpdateUserData {
  updateUser: User
}

interface DeleteUserData {
  deleteUser: { id: string }
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

  const [createUser] = useMutation<CreateUserData>(CREATE_USER, {
    update(cache, { data }) {
      console.log('📝 CREATE_MUTATION update function called')
      const newUser = data?.createUser
      if (!newUser) return

      // Read existing users
      const existingUsers = cache.readQuery<GetUsersData>({
        query: GET_USERS,
      })

      if (existingUsers) {
        // Write updated users back to cache
        cache.writeQuery({
          query: GET_USERS,
          data: {
            getUsers: [...existingUsers.getUsers, newUser],
          },
        })
      }
    },
    refetchQueries: [
      {
        query: GET_USERS,
      },
    ],
  })
  const [updateUser] = useMutation<UpdateUserData>(UPDATE_USER, {
    update(cache, { data }) {
      const updatedUser = data?.updateUser
      if (!updatedUser) return

      cache.modify({
        fields: {
          getUsers(existingUsers = []) {
            return existingUsers.map((userRef: any) => {
              if (cache.identify(userRef) === cache.identify(updatedUser)) {
                return cache.writeFragment({
                  id: cache.identify(updatedUser),
                  fragment: gql`
                    fragment UpdatedUser on User {
                      id
                      name
                      email
                      createdAt
                    }
                  `,
                  data: updatedUser,
                })
              }
              return userRef
            })
          },
        },
      })
    },
    refetchQueries: [
      {
        query: GET_USERS,
      },
    ],
  })
  const [deleteUser] = useMutation<DeleteUserData>(DELETE_USER, {
    update(cache, { data }) {
      const deletedUserId = data?.deleteUser?.id
      if (!deletedUserId) return

      cache.modify({
        fields: {
          getUsers(existingUsers, { readField }) {
            return existingUsers.filter(
              (userRef: any) => deletedUserId !== readField('id', userRef),
            )
          },
        },
      })
    },
    refetchQueries: [
      {
        query: GET_USERS,
      },
    ],
  })

  // Subscriptions
  useSubscription<UserAddedData>(USER_ADDED_SUBSCRIPTION, {
    onData: ({ data }) => {
      console.log('🔔 User Added subscription triggered:', data.data)
      if (data.data?.userAdded) {
        const notification: SubscriptionNotification = {
          id: Date.now().toString(),
          type: 'added',
          timestamp: new Date(),
          userId: data.data.userAdded.id,
          userName: data.data.userAdded.name,
        }
        setNotifications((prev) => [notification, ...prev.slice(0, 4)])
      }
    },
  })

  useSubscription<UserUpdatedData>(USER_UPDATED_SUBSCRIPTION, {
    onData: ({ data }) => {
      console.log('🔔 User Updated subscription triggered:', data.data)
      if (data.data?.userUpdated) {
        const notification: SubscriptionNotification = {
          id: Date.now().toString(),
          type: 'updated',
          timestamp: new Date(),
          userId: data.data.userUpdated.id,
          userName: data.data.userUpdated.name,
        }
        setNotifications((prev) => [notification, ...prev.slice(0, 4)])
      }
    },
  })

  useSubscription<UserDeletedData>(USER_DELETED_SUBSCRIPTION, {
    onData: ({ data }) => {
      console.log('🔔 User Deleted subscription triggered:', data.data)
      if (data.data?.userDeleted) {
        const notification: SubscriptionNotification = {
          id: Date.now().toString(),
          type: 'deleted',
          timestamp: new Date(),
          userId: data.data.userDeleted,
        }
        setNotifications((prev) => [notification, ...prev.slice(0, 4)])
      }
    },
  })

  console.log('🔍 Current state:')
  console.log('  - getUsersData:', getUsersData?.getUsers?.length, 'users')
  console.log('  - Loading states:', { getUsersLoading })
  console.log('  - Errors:', { getUsersError })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name || !newUser.email) {
      alert('Please fill in all fields')
      return
    }

    try {
      console.log('🚀 Creating user with input:', {
        name: newUser.name,
        email: newUser.email,
      })
      await createUser({
        variables: { name: newUser.name, email: newUser.email },
      })
      setNewUser({})
      // Reset the form
      const form = document.querySelector('form') as HTMLFormElement
      form?.reset()
    } catch (error) {
      console.error('❌ Error creating user:', error)
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewUser((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setNewUser({
      name: user.name,
      email: user.email,
    })
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser || !newUser.name || !newUser.email) {
      return
    }

    try {
      console.log('🔄 Updating user:', editingUser.id, {
        name: newUser.name,
        email: newUser.email,
      })
      await updateUser({
        variables: {
          id: editingUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      })
      setEditingUser(null)
      setNewUser({})
    } catch (error) {
      console.error('❌ Error updating user:', error)
    }
  }

  const handleDeleteUser = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user?',
    )
    if (!confirmed) return

    try {
      console.log('🗑️ Deleting user:', id)
      await deleteUser({ variables: { id } })
    } catch (error) {
      console.error('❌ Error deleting user:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setNewUser({})
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (getUsersLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">
            Loading users...
          </p>
        </div>
      </div>
    )
  }

  if (getUsersError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Data
          </h1>
          <p className="text-gray-600 mb-4">
            There was an error loading the users:
          </p>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md mx-auto">
            {getUsersError.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const users = getUsersData?.getUsers || []

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              GraphQL CRUD Tutorial
            </h1>
            <p className="text-lg text-gray-600">
              Full-stack user management with real-time subscriptions
            </p>
            <div className="mt-2 text-sm text-gray-500">
              WebSocket Status:{' '}
              <span
                className={`font-medium ${wsStatus.includes('Connected') ? 'text-green-600' : 'text-yellow-600'}`}
              >
                {wsStatus}
              </span>
            </div>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Recent Activity
              </h2>
              <div className="space-y-2">
                {notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      notification.type === 'added'
                        ? 'bg-green-50 border-green-400'
                        : notification.type === 'updated'
                          ? 'bg-blue-50 border-blue-400'
                          : 'bg-red-50 border-red-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {notification.type === 'added'
                          ? '✅ User Added'
                          : notification.type === 'updated'
                            ? '🔄 User Updated'
                            : '🗑️ User Deleted'}
                        : {notification.userName || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {notification.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>

              <form
                onSubmit={editingUser ? handleUpdateSubmit : handleSubmit}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newUser.name || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter user name"
                    autoComplete="name"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={newUser.email || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                  {editingUser && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Debug Info */}
              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Debug Information
                </h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Total Users: {users.length}</p>
                  <p>Editing: {editingUser ? editingUser.name : 'None'}</p>
                  <p>Form State: {JSON.stringify(newUser)}</p>
                </div>
              </div>
            </div>

            {/* Users List Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Users ({users.length})
              </h2>

              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-lg font-medium">No users found</p>
                  <p className="text-sm">
                    Create your first user using the form on the left.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`p-4 border rounded-lg transition-all ${
                        editingUser?.id === user.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.name}
                        </h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800 px-2 py-1 text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Email:</span>{' '}
                          {user.email}
                        </div>
                        <div className="col-span-1">
                          <span className="font-medium">ID:</span>{' '}
                          <code className="text-xs bg-gray-200 px-1 rounded">
                            {user.id}
                          </code>
                        </div>
                        <div className="col-span-1 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {formatDate(user.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
