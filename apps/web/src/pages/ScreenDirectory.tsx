import { Link } from 'react-router-dom'

const pageLinks = [
  { href: '/introduction', label: 'Introduction' },
  { href: '/signin', label: 'Sign In' },
  { href: '/home', label: 'Home' },
  { href: '/search', label: 'Search & Last Scans' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/scan', label: 'Scan' },
  { href: '/adviser/scan', label: 'Adviser Scan' },
  { href: '/adviser/result', label: 'Adviser Result' },
  { href: '/adviser/chat', label: 'Adviser Chat Open' },
  { href: '/adviser/chatting', label: 'Adviser Chatting' },
]

function ScreenDirectory() {
  return (
    <main className="min-h-dvh bg-[#fff7f4] px-5 py-7 text-[#18181b] [font-family:Geist,'Avenir_Next',sans-serif]">
      <h1 className="mb-2 text-[28px] leading-none">Skinory Screens</h1>
      <p className="mb-4 text-[#71717a]">Figma implementation pages</p>
      <div>
        {pageLinks.map((page) => (
          <Link
            key={page.href}
            to={page.href}
            className="mb-2.5 block rounded-[12px] border border-[#e4e4e7] bg-white p-3 text-[#18181b] no-underline"
          >
            {page.label}
          </Link>
        ))}
      </div>
    </main>
  )
}

export default ScreenDirectory
