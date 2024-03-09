# Next-auth

使用Next框架做SSR時, 處理***驗證***的方式與CSR不太一樣, 需要在伺服器端進行, Next-auth套件可以很方便的解決這個問題, 不過當中有很多的底層邏輯在文件裡寫的不是很清楚, 要經過一番的試驗, 甚至閱讀源始碼才能理解, 由於大部分公司開發時是前後端分離, 如何將***API server***(由後端team架設的server)端的溝通驗證整合至***Next server***(由前端team架設)將會是重點, 這篇用來記錄整個流程

# 簡介

一般API Server在使用者登入後, 會回傳一個token, 在進行某些API請求時, 此token必須加在請求的header裡, 方能拿到資料, 以往在做CSR時只需要用interceptors之類的功能即可做到, 但在SSR時, 還必須將該token存在Next server的session中, 以便使用者在後續的請求中能夠維持該狀態(State)

# 版本

next版本13.5.6

next-auth版本4.24.6

# Next-auth中的JWT Session

在預設的情況下, Next-auth會使用Jwe的方式來實作session, 由Next Server返回且被存在客戶端cookie的token大概長下面這個樣子:

```jsx
eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..PHFd6TGQ-z0kx0Yp.LDvf_wOPvci4AssREgpShe4VyipmxN3VdSGI182qn5cxpgkEZOFn8hFY5YT3CyBlCIL-rPuOjJdjCWTDJTpSSmRZTPP_8lPDuJ8RKCP5TkrLp_BWndPBeUFTHBezEHTjYiv3uSb6zi7lQ9RwwmlNyQ7ksqOU_vWsbseORlbLLKbfbn3bMiW7o3eiaESvj5pF_pItqGVrX3bMrORYbEBAhHYu.RqkyCO2G4ztpgOFQbEaYyQ
```

此token是加密(encrypt)後的JWT, 必須在Next server端被解密(decrypt)後才能看到儲存的內容, 解密後的內容如下: 

```jsx
{
  "sub": "1234567890",
  "name": "Brilian Firdaus",
  "iat": 1651422365
}
```

事實上, Next-auth預設的session完全是存在JWT裡面, 當使用者發送請求到Next server後, 挾帶在請求cookie中的JWE於Next server端被解密, 根據自訂義的session回調函數(callback function)來決定session的返回值, 這點可以從原始碼中看出來:

```jsx
...
		 const token = await callbacks.jwt({
        token: payload,
        ...(isUpdate && { trigger: "update" }),
        session: newSession,
      })

      const newExpires = fromDate(sessionMaxAge)

      if (token !== null) {.
				// session主要為jwt回調函數返回的內容
        const session = {
          user: { name: token.name, email: token.email, image: token.picture },
          expires: newExpires.toISOString(),
        }
				// 根據自訂義的session回調函數, 我們可以決定session所對應的資料
        const newSession = await callbacks.session({ session, token })
...
```

[原始碼](https://github.com/nextauthjs/next-auth/blob/8cc2a0f1cc11375e7bbfe8871dbd0b41d64bc37d/packages/core/src/lib/actions/session.ts)

文件中令人混淆的地方就在於jwt跟session回調函數的存在, 和其被執行的時間點, 細節的部分下面會做解釋, 這裡的重點在於, ***Next-auth的session預設下儲存於jwt中(客戶端cookie), 再透過回調函數的方式將資料進行增添與篩選***, 其返回值即是最後我們執行useSession得到的值, 如下圖:

![Untitled](Next-auth%20e4021007bb41428d8695957418f94dad/Untitled.png)

<aside>
💡 在某些情況下, 可能會有需要自訂義encode和decode函數的需求, 可以參考[此篇](https://github.com/nextauthjs/next-auth/discussions/1039#discussion-1336033)

</aside>

# 登入頁面與signIn函數

為了方便說明, 先從簡單的登入頁面開始, 該路徑位於/login, 當使用者按下Sign In後, 主要會執行由Next-auth提供的***signIn函數***, 因此, 接下來的重點會在於釐清執行signIn函數後的步驟, 和哪些階段有提供hook來讓開發者撰寫自訂義程式碼, 如下圖:

![Untitled](Next-auth%20e4021007bb41428d8695957418f94dad/Untitled%201.png)

相關程式碼:

```jsx
// src/pages/login.js
import { useState } from 'react'
import { signIn } from 'next-auth/react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    const params = {
      email,
      password
    }
    const res = await signIn('credentials', {
      ...params,
      redirect: false
    })
  }
  return (
    <section className="bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
          <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
              <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                  <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                      Sign in to your account
                  </h1>
                  <form className="space-y-4 md:space-y-6">
                      <div>
                          <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your email</label>
                          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" name="email" id="email" className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="name@company.com" required=""/>
                      </div>
                      <div>
                          <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label>
                          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" name="password" id="password" placeholder="••••••••" className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required=""/>
                      </div>
                      <div className="flex items-center justify-between">
                          <div className="flex items-start">
                              <div className="flex items-center h-5">
                                <input id="remember" aria-describedby="remember" type="checkbox" className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800" required=""/>
                              </div>
                              <div className="ml-3 text-sm">
                                <label htmlFor="remember" className="text-gray-500 dark:text-gray-300">Remember me</label>
                              </div>
                          </div>
                          <a href="#" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500">Forgot password?</a>
                      </div>
                      <button onClick={submit} className="w-full text-blue bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">Sign in</button>
                      <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                          Don’t have an account yet? <a href="#" className="font-medium text-primary-600 hover:underline dark:text-primary-500">Sign up</a>
                      </p>
                  </form>
              </div>
          </div>
      </div>
    </section>
  );
};
```

# 驗證流程

Next-auth的signIn函數底層其實做了不少事情, 這邊粗略分成兩個部分(其他較不重要的部分省略):

1. 身分驗證
2. Session

先附上流程圖

![Untitled](Next-auth%20e4021007bb41428d8695957418f94dad/Untitled%202.png)

### 身分驗證

signIn函數在瀏覽器被執行後, 會發送Post請求到Next server, 挾帶了使用者登入相關的資料, 在這一個request中, Next Server端執行的callbacks函數順序如下:

1. authorize() → 與API server溝通的邏輯可寫在這個回調函數中
2. signIn() → 決定驗證是否成功, 成功才會繼續下個步驟, 進行session相關的設置
3. jwt() →決定要儲存至jwt的資料

需要注意的是, callbacks裡signIn函數(Server端執行)返回的true或false會決定這一個request請求被resolve或reject, 倘若被reject則不會進入下一階段的session部分, 因此與API Server端的驗證相關邏輯可以寫在authorize函數中, 如果resolve的話, 我們可以在response headers這裡看到next-auth-session-token和其對應一連串的亂碼被存在cookie中, 此cookie會在接下來的請求中被帶上

![Untitled](Next-auth%20e4021007bb41428d8695957418f94dad/Untitled%203.png)

### Session

此時signIn還沒執行完畢, 會接者做另一個請求(圖中second request)到Next Server(挾帶next-auth-session-token), 而這一串的亂碼在伺服器端被decrypt後, 即可得到儲存的資料(即是第一次執行callbacks裡jwt函數完畢返回的token值), 該資料會被當作參數傳入session函數並被執行, 其返回的結果將會是useSession拿到的值, 事實上, 當我們在執行useSession時, 相同的流程還會再跑一遍, client端會做一個請求到Next Server, 並挾帶該next-auth-session-token的cookie, Next server端被解密(decrypt)後會被當作參數傳入jwt()與session()執行, session()返回的值即為useSession的data值

再撰寫回調函數jwt的邏輯時, 必須要特別注意, 這個函數會被多次呼叫, 因此只有當其在回調函數signIn後呼叫才會有除了token以外的參數, 如文件所述:

![Untitled](Next-auth%20e4021007bb41428d8695957418f94dad/Untitled%204.png)

### 程式碼備註

下面程式碼用來備註一般在設定時會做的調整, 當作boilerplate

```jsx
export default async function auth(req, res) {
  return await NextAuth(req, res, {
    // Configure one or more authentication providers
    providers: [
      // ...add more providers here
      CredentialsProvider({
        name: 'Credentials',
        async authorize(credentials, req) {
          // 已透過firebase SDK登入(Google or Apple Id)
          if (credentials?.mode === 'firebase') {
            return {
              memberId: credentials.memberId,
              nickName: credentials.nickName,
              token: credentials.token,
            }
          }

          const clientIp = req.headers['x-forwarded-for'].split(/, /)[0]
          // 再下面做自訂義的login(與Rest Server做溝通)
          const res = await customLogin({ ...credentials, clientIp })
          if (res.code !== 'G_0000') {
            throw new Error(res.message)
          }
          return res.dat
        },
      }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: {
      maxAge: 60 * 60 * 24 * 30, // 30天
    },
    pages: {
      signIn: '/login',
    },
    callbacks: {
      async signIn({ user, account, profile, email, credentials }) {
        if (account.provider === 'credentials') {
          if (user) return true
          return false
        }
      },
      async jwt({ token, user }) {
        if (user) {
          token.token = user.token
          token.memberId = user.memberId
          token.nickName = user.nickName
          token.isDisplayQuantify = user.isDisplayQuantify
          token.wsToken = user.wsToken
        }
        return token
      },
      async session({ session, token }) {
        session.token = token.token
        session.wsToken = token.wsToken
        session.user.memberId = token.memberId
        session.user.nickName = token.nickName
        session.user.isDisplayQuantify = token.isDisplayQuantify
        return session
      },
    },
  })
}
```

# 路徑保護

Next-auth有提供三種方式來保護路由, 當使用者具有權限時才能訪問並看到內容, 反之則用跳轉的方式把使用者導向其他頁面

## Middleware(推薦)

此方法可以將路徑保護的程式碼集中寫在同一個檔案裡面, 不需要在個別組件做設定

```jsx

// .middleware
export { default } from "next-auth/middleware"

export const config = { matcher: ["/dashboard/:path*"] }
```

<aside>
💡 matcher要使用regular expression, 可以在[這裡](https://regex101.com/r/nAcnSP/2)做測試

</aside>

## getServerSession

Next Server端拿到session後, 在伺服器端即可使用此session做渲染, 比useSession比起來速度會更快, 因為可以減少一次fetch請求

```jsx
// src/pages/dashboard/index.js
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
```

<aside>
💡 需要特別注意, props有可能會拿不到session, 原因在於session有可能無法被serialize, 必要時可以寫相關邏輯來處理此部分, 只回傳需要用到的屬性, 可以參考[這裡](https://stackoverflow.com/questions/75622569/next-auth-session-returning-undefined-from-getserversideprops-nextjs-13-2-1)

</aside>

## useSession(不推薦)

```jsx
// src/pages/user/index.js
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
```

# 參考來源

[官方文件](https://next-auth.js.org/)

[Next-auth源碼](https://github.com/nextauthjs/next-auth)

[Set up Next-Auth with Next.js and Prisma with this ultimate guide!](https://www.youtube.com/watch?v=2kgqPvs0j_I)
