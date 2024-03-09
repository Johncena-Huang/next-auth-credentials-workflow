import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
const Dashboard = (props) => {
  return <div>{ props.name }</div>
}
export async function getServerSideProps ({ req, res }) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) { 
    return {
      redirect: {
        destination: "/login", // Redirect to login page
        permanent: false,
      }
    }
  }

  return {
    props: {
      name: session.token.name
    }
  }
}
  export default Dashboard;