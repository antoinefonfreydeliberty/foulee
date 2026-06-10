import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single()

    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && pathname === '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single()

    if (profile?.onboarding_completed) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
