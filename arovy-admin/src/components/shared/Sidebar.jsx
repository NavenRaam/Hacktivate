'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Store, Zap, BarChart2, ChevronRight } from 'lucide-react'
import LiveClock from '@/components/shared/LiveClock'

const NAV = [
  { href:'/',           label:'Overview',    icon:LayoutDashboard },
  { href:'/disruptions',label:'Disruptions', icon:Zap             },
  { href:'/predict',    label:'Predictives', icon:BarChart2       },
  { href:'/stores',     label:'Stores',      icon:Store           },
  { href:'/workers',    label:'Workers',     icon:Users           },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-52 shrink-0 flex flex-col border-r h-screen"
      style={{ background:'#090D16', borderColor:'rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-5 border-b" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#4F8EF7,#8B7FED)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L11 6L6 11L1 6L6 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm leading-none">Arovy</p>
            <p className="text-[10px] mt-0.5 font-mono" style={{ color:'rgba(238,242,255,0.3)' }}>Admin</p>
          </div>
        </div>
        <LiveClock/>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href==='/' ? path==='/' : path.startsWith(href)
          return (
            <Link key={href} href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={active
                ? { background:'rgba(79,142,247,0.12)', color:'#4F8EF7' }
                : { color:'rgba(238,242,255,0.45)' }}>
              <Icon size={15}/>
              {label}
              {active && <ChevronRight size={12} className="ml-auto opacity-50"/>}
            </Link>
          )
        })}
      </nav>
      <div className="px-5 py-4 border-t space-y-1.5" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
        <a href="http://localhost:3000" target="_blank"
          className="block text-[11px] font-mono hover:text-white/50 transition-colors"
          style={{ color:'rgba(238,242,255,0.2)' }}>
          ← Disruption Panel
        </a>
        <p className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.15)' }}>
          3 cities · 15 stores · 150 workers
        </p>
      </div>
    </aside>
  )
}
