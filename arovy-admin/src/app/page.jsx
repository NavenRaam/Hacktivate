import { getGlobalStatsLive, getCityOverviewLive, getAllSimulations, CITY_COLORS, disruptionTypeLabel } from '@/lib/data'
import StatCard from '@/components/shared/StatCard'
import LiveDisruptionMonitor from '@/components/overview/LiveDisruptionMonitor'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OverviewPage() {
  const [stats, chennai, bangalore, hyderabad] = await Promise.all([
    getGlobalStatsLive(),
    getCityOverviewLive('Chennai'),
    getCityOverviewLive('Bangalore'),
    getCityOverviewLive('Hyderabad'),
  ])
  const cities = [chennai, bangalore, hyderabad]
  const sims   = getAllSimulations()
  const payoutRate = (stats.approved + stats.partial + stats.blocked) > 0
    ? Math.round((stats.approved / (stats.approved + stats.partial + stats.blocked)) * 100)
    : 0

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      <div className="stagger-1">
        <h1 className="font-display font-bold text-3xl text-white">Overview</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>
          Live system snapshot · data from single backend source
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 stagger-2">
        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total Workers"  value={stats.workers||stats.totalWorkers}
              icon="👥" sub="across 15 stores"/>
            <StatCard label="Weekly Premium Pool"
              value={`₹${Math.round(stats.totalPremium||0).toLocaleString('en-IN')}`}
              icon="💰" accent="#23D18B" sub="live · updates after disruptions"/>
            <StatCard label="Total Disbursed"
              value={`₹${Math.round(stats.totalDisbursed||stats.totalPayout||0).toLocaleString('en-IN')}`}
              icon="📤" accent="#4F8EF7" sub="all events combined"/>
            <StatCard label="Avg Trust Score"
              value={`${Math.round((stats.avgTrust||0)*100)}%`}
              icon="🛡" accent={(stats.avgTrust||0)>0.7?'#23D18B':'#F5A623'}
              sub="live · updates after each disruption"/>
          </div>

          <div className="card mesh-blue p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color:'rgba(238,242,255,0.35)' }}>
                Payout Outcomes · All Events
              </p>
              <span className="badge badge-green">{payoutRate}% approval rate</span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label:'Approved',    v:stats.approved||0,    c:'#23D18B', bg:'rgba(35,209,139,0.1)'  },
                { label:'Partial',     v:stats.partial||0,     c:'#F5A623', bg:'rgba(245,166,35,0.1)'  },
                { label:'Blocked',     v:stats.blocked||0,     c:'#F5532D', bg:'rgba(245,83,45,0.1)'   },
                { label:'Crash Events',v:stats.crashEvents||0, c:'#8B7FED', bg:'rgba(139,127,237,0.1)' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 text-center" style={{ background:item.bg }}>
                  <p className="font-display font-bold text-xl" style={{ color:item.c }}>{item.v}</p>
                  <p className="text-xs mt-1" style={{ color:'rgba(238,242,255,0.45)' }}>{item.label}</p>
                </div>
              ))}
            </div>
            {/* Stacked progress bar */}
            <div className="h-2 rounded-full overflow-hidden flex" style={{ background:'rgba(255,255,255,0.06)' }}>
              {(() => {
                const total = (stats.approved||0)+(stats.partial||0)+(stats.blocked||0)||1
                return [
                  { v:stats.approved||0, c:'#23D18B' },
                  { v:stats.partial||0,  c:'#F5A623' },
                  { v:stats.blocked||0,  c:'#F5532D' },
                ].map((item,i) => (
                  <div key={i} className="h-full" style={{ width:`${(item.v/total)*100}%`, background:item.c }}/>
                ))
              })()}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:'rgba(238,242,255,0.3)' }}>Live System</p>
          <LiveDisruptionMonitor/>
        </div>
      </div>

      {/* City cards — live */}
      <div className="stagger-3">
        <h2 className="font-display font-bold text-lg text-white mb-4">Cities · Live Data</h2>
        <div className="grid grid-cols-3 gap-4">
          {cities.map(city => {
            const color = CITY_COLORS[city.city]
            return (
              <div key={city.city} className="card card-hover p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background:color }}/>
                    <h3 className="font-display font-bold text-white">{city.city}</h3>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
                    style={{ color, borderColor:color+'40', background:color+'10' }}>
                    {city.stores.length} stores
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.04)' }}>
                    <p className="font-display font-bold text-xl text-white">{city.totalWorkers}</p>
                    <p className="text-xs mt-0.5" style={{ color:'rgba(238,242,255,0.4)' }}>Workers</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.04)' }}>
                    <p className="font-display font-bold text-xl" style={{ color }}>
                      ₹{Math.round(city.totalPremiumPool||0)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color:'rgba(238,242,255,0.4)' }}>Weekly Pool</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {[
                    ['Avg Trust',   `${Math.round(city.avgTrust*100)}%`,  city.avgTrust>0.7?'#23D18B':'#F5A623'],
                    ['Avg Risk',    city.avgRisk.toFixed(2),               city.avgRisk>0.6?'#F5532D':'#F5A623' ],
                    ['Avg Premium', `₹${Math.round(city.avgPremium)}/wk`, 'rgba(238,242,255,0.65)'             ],
                  ].map(([k,v,c]) => (
                    <div key={k} className="flex justify-between">
                      <span style={{ color:'rgba(238,242,255,0.35)' }}>{k}</span>
                      <span style={{ color:c }}>{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-mono mt-3 pt-3 border-t"
                  style={{ borderColor:'rgba(255,255,255,0.07)', color:'rgba(238,242,255,0.25)' }}>
                  ↻ updates after each disruption
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trust + eligibility live */}
      <div className="grid grid-cols-2 gap-4 stagger-4">
        <div className="card p-5">
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:'rgba(238,242,255,0.35)' }}>
            Trust Distribution · Live
          </p>
          <div className="space-y-2.5">
            {Object.entries(stats.trustDist||{}).map(([type,count]) => {
              const colors = { excellent:'#23D18B',good:'#4F8EF7',moderate:'#F5A623',low:'#F5532D',critical:'#EF4444' }
              const total  = stats.workers || stats.totalWorkers || 150
              const pct    = total > 0 ? Math.round((count/total)*100) : 0
              return (
                <div key={type}>
                  <div className="flex justify-between text-xs font-mono mb-1" style={{ color:'rgba(238,242,255,0.5)' }}>
                    <span className="capitalize">{type}</span>
                    <span style={{ color:colors[type] }}>{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width:`${pct}%`, background:colors[type] }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:'rgba(238,242,255,0.35)' }}>
            Eligibility Tiers · Live
          </p>
          <div className="space-y-3">
            {Object.entries(stats.eligDist||{}).map(([tier,count]) => {
              const colors = { full:'#23D18B',partial:'#4F8EF7',limited:'#F5A623',not_eligible:'#6B7280' }
              const labels = { full:'Full Coverage',partial:'Partial',limited:'Limited',not_eligible:'Ineligible' }
              const total  = stats.workers || stats.totalWorkers || 150
              const pct    = total > 0 ? Math.round((count/total)*100) : 0
              return (
                <div key={tier} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background:colors[tier] }}/>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-mono mb-0.5">
                      <span style={{ color:'rgba(238,242,255,0.55)' }}>{labels[tier]}</span>
                      <span style={{ color:colors[tier] }}>{count}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width:`${pct}%`, background:colors[tier] }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent events */}
      <div className="stagger-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-white">Recent Events</h2>
          <Link href="/disruptions" className="flex items-center gap-1 text-xs font-mono no-underline" style={{ color:'rgba(238,242,255,0.4)' }}>
            View all <ArrowRight size={12}/>
          </Link>
        </div>
        <div className="card overflow-hidden">
          {sims.slice(0,5).map(sim => {
            const tl = disruptionTypeLabel(sim.disruption_type)
            return (
              <Link key={sim.simulation_id} href={`/disruptions/${sim.simulation_id}`}
                className="table-row no-underline"
                style={{ gridTemplateColumns:'1fr 1fr auto auto' }}>
                <div className="flex items-center gap-2.5">
                  <span>{tl.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white leading-tight">{sim.label}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.35)' }}>{sim.scheduled_start}–{sim.scheduled_end}</p>
                  </div>
                </div>
                <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.45)' }}>{sim.city} · {sim.zone}</p>
                <p className="text-sm font-mono font-medium" style={{ color:'#23D18B' }}>₹{sim.summary?.total_payout_disbursed?.toFixed(0)||0}</p>
                <ArrowRight size={13} style={{ color:'rgba(238,242,255,0.2)' }}/>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
