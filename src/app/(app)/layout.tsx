import type React from 'react'
import './globals.css'
import Header from '@/components/header'
import Footer from '@/components/footer'
/* Our app sits here to not cause any conflicts with payload's root layout  */
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <html lang="ca" className="dark mx-auto max-w-[1200px]">
      <body className="flex min-h-screen flex-col">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}

export default Layout
