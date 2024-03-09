import { useSession } from 'next-auth/react'
const Home = () => {
  const { data: session } = useSession()
  console.log('session', session)
  return (
    <div>
      <h1>Home</h1>
      <h2>Session</h2>
      <div>{ JSON.stringify(session) }</div>
    </div>
  )
}
export default Home