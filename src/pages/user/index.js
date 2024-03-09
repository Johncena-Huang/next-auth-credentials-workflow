import { useSession } from "next-auth/react"
const User = () => {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <p>Loading...</p>
  }

  if (status === "unauthenticated") {
    return <p>Access Denied</p>
  }
  
  return (
    <>
      <h1>Protected Page</h1>
      <p>{ session.user.name }</p>
    </>
  )
}
export default User;