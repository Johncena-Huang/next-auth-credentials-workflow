import NextAuth from "next-auth"
import CredentialsProvider from 'next-auth/providers/credentials'
function getCurrentTime() {
  const now = new Date();
  
  // Get UTC date and time components
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  const hours = now.getUTCHours().toString().padStart(2, '0');
  const minutes = now.getUTCMinutes().toString().padStart(2, '0');
  const seconds = now.getUTCSeconds().toString().padStart(2, '0');
  
  // Format into "yyyy-mm-dd hh:mm:ss"
  const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  
  return formattedTime;
}
const timeout = (timeout) => new Promise((resolve) => {
  setTimeout(resolve, timeout)
})
export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    // ...add more providers here
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: 'Credentials',
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      // credentials: {
      //   username: { label: "Username", type: "text", placeholder: "jsmith" },
      //   password: { label: "Password", type: "password" }
      // },
      async authorize(credentials, req) {
        // 已透過firebase SDK登入(Google or Apple Id)
        console.log('authorize called')
        console.log('credentials', credentials)
        // data passed into SignIn() function can be accessed here in credentials
        const userData = {
          name: 'john',
          age: 31,
          time: getCurrentTime()            
        }
        return userData
        // if (credentials?.mode === 'firebase') {
        //   return {
        //     memberId: credentials.memberId,
        //     nickName: credentials.nickName,
        //     token: credentials.token,
        //   }
        // }

        // const clientIp = req.headers['x-forwarded-for'].split(/, /)[0]
        // // 一般登入
        // const res = await normalLogIn({ ...credentials, clientIp })
        // if (res.code !== 'G_0000') {
        //   throw new Error(res.message)
        // }
        // console.log('authorize', res.data)
        // return res.data
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    maxAge: 60 * 60 * 24 * 30, // 30天
  },
  pages: {
    signIn: '/error',
    // error: '/auth/error', // Error code passed in query string as ?error=
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (account.provider === 'credentials') {
        if (user) return true
        return false
      }
    },
    async jwt({ token, user }) {
      console.log('callback.jwt', token)
      if (user) {
        token.time = user.time
        token.jwt = 'jwt specific'
        token.extra = 'God did'
      }
      console.log('callback.jwt', user)
      return token
    },
    async session({ session, token }) {
      delete session.user.email
      delete session.user.image
      session.token = token
      // 重新整理畫面只會走session
      return session
    },
  },
}
export default async function auth(req, res) {
  // Do whatever you want here, before the request is passed down to `NextAuth`
  // if (req.body.encrypt !== undefined) {
  //   encryptPassword = req.body.encrypt
  // }
  // if (req.body.apiSecretKey !== undefined) {
  //   apiSecretKey = req.body.apiSecretKey
  // }
  return await NextAuth(req, res, authOptions)
}

// signIn() -> authorize() --(return)->(user)-> callbacks.signIn(user)