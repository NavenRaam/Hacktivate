import { getGlobalStats, getCityOverview, getAllSimulations, CITY_COLORS, disruptionTypeLabel } from '@/lib/data'
import StatCard from '@/components/shared/StatCard'
import LiveDisruptionMonitor from '@/components/overview/LiveDisruptionMonitor'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function OverviewPage() {
  const stats  = getGlobalStats()
  const cities = ['Chennai','Bangalore','Hyderabad'].map(getCityOverview)
  const sims   = getAllSimulations()

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      {/* Header */}
      <div className="stagger-1">
        <h1 className="font-display font-bold text-3xl text-white">Overview</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>
          System snapshot · real-time disruption monitor
        </p>
      </div>

      {/* Top row — stats + live monitor */}
      <div className="grid grid-cols-3 gap-6 stagger-2">

        {/* Left — global stats */}
        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total Workers"   value={stats.totalWorkers}  icon="👥" sub="across 15 stores"/>
            <StatCard label="Weekly Premium"  value={`₹${Math.round(stats.totalPremium).toLocaleString()}`} icon="💰" accent="#23D18B" sub="collective pool"/>
            <StatCard label="Total Disbursed" value={`₹${Math.round(stats.totalPayout).toLocaleString()}`} icon="📤" accent="#4F8EF7" sub="all events"/>
            <StatCard label="Avg Trust Score" value={`${Math.round(stats.avgTrust*100)}%`} icon="🛡" accent={stats.avgTrust > 0.7 ? '#23D18B' : '#F5A623'} sub="system-wide"/>
          </div>

          {/* Payout outcomes */}
          <div className="card mesh-blue p-5">
            <p className="text-xs font-mono uppercase tracking-widest mb-4"
              style={{ color:'rgba(238,242,255,0.35)' }}>
              Payout Outcomes · All Events
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label:'Approved',    value:stats.approved,    color:'#23D18B', bg:'rgba(35,209,139,0.1)'  },
                { label:'Partial',     value:stats.partial,     color:'#F5A623', bg:'rgba(245,166,35,0.1)'  },
                { label:'Blocked',     value:stats.blocked,     color:'#F5532D', bg:'rgba(245,83,45,0.1)'   },
                { label:'Crash Events',value:stats.crashEvents, color:'#8B7FED', bg:'rgba(139,127,237,0.1)' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 text-center" style={{ background:item.bg }}>
                  <p className="font-display font-bold text-xl" style={{ color:item.color }}>{item.value}</p>
                  <p className="text-xs mt-1" style={{ color:'rgba(238,242,255,0.45)' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — live disruption monitor */}
        <div>
          <LiveDisruptionMonitor/>
        </div>
      </div>

      {/* City cards */}
      <div className="stagger-3">
        <h2 className="font-display font-bold text-lg text-white mb-4">Cities</h2>
        <div className="grid grid-cols-3 gap-4">
          {cities.map(city => {
            const color    = CITY_COLORS[city.city]
            const citySims = sims.filter(s => s.city === city.city)
            const cityPayout = citySims.reduce((s,sim) => s+(sim.summary?.total_payout_disbursed||0), 0)
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

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.04)' }}>
                    <p className="font-display font-bold text-xl text-white">{city.totalWorkers}</p>
                    <p className="text-xs mt-0.5" style={{ color:'rgba(238,242,255,0.4)' }}>Workers</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.04)' }}>
                    <p className="font-display font-bold text-xl" style={{ color }}>
                      ₹{Math.round(cityPayout)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color:'rgba(238,242,255,0.4)' }}>Disbursed</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  {[
                    ['Avg Trust', `${Math.round(city.avgTrust*100)}%`, city.avgTrust > 0.7 ? '#23D18B' : '#F5A623'],
                    ['Avg Risk',  city.avgRisk,                        city.avgRisk > 0.6 ? '#F5532D' : '#F5A623' ],
                    ['Avg Premium', `₹${Math.round(city.avgPremium)}/wk`, 'rgba(238,242,255,0.65)'],
                  ].map(([k,v,c]) => (
                    <div key={k} className="flex justify-between">
                      <span style={{ color:'rgba(238,242,255,0.35)' }}>{k}</span>
                      <span style={{ color:c }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trust distribution */}
      <div className="grid grid-cols-2 gap-4 stagger-4">
        <div className="card p-5">
          <p className="text-xs font-mono uppercase tracking-widest mb-4"
            style={{ color:'rgba(238,242,255,0.35)' }}>Trust Distribution</p>
          <div className="space-y-2.5">
            {Object.entries(stats.trustDist).map(([type, count]) => {
              const colors = { excellent:'#23D18B', good:'#4F8EF7', moderate:'#F5A623', low:'#F5532D', critical:'#EF4444' }
              const pct = Math.round((count / stats.totalWorkers) * 100)
              return (
                <div key={type}>
                  <div className="flex justify-between text-xs font-mono mb-1"
                    style={{ color:'rgba(238,242,255,0.5)' }}>
                    <span className="capitalize">{type}</span>
                    <span style={{ color:colors[type] }}>{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background:'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width:`${pct}%`, background:colors[type] }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs font-mono uppercase tracking-widest mb-4"
            style={{ color:'rgba(238,242,255,0.35)' }}>Eligibility Tiers</p>
          <div className="space-y-3">
            {Object.entries(stats.eligDist).map(([tier, count]) => {
              const colors = { full:'#23D18B', partial:'#4F8EF7', limited:'#F5A623', not_eligible:'#6B7280' }
              const labels = { full:'Full Coverage', partial:'Partial', limited:'Limited', not_eligible:'Ineligible' }
              const pct = Math.round((count / stats.totalWorkers) * 100)
              return (
                <div key={tier} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background:colors[tier] }}/>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-mono mb-0.5">
                      <span style={{ color:'rgba(238,242,255,0.55)' }}>{labels[tier]}</span>
                      <span style={{ color:colors[tier] }}>{count}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden"
                      style={{ background:'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full"
                        style={{ width:`${pct}%`, background:colors[tier] }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent disruptions */}
      <div className="stagger-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-white">Recent Events</h2>
          <Link href="/disruptions"
            className="flex items-center gap-1 text-xs font-mono no-underline transition-colors"
            style={{ color:'rgba(238,242,255,0.4)' }}>
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
                    <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.35)' }}>
                      {sim.scheduled_start}–{sim.scheduled_end}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.45)' }}>
                  {sim.city} · {sim.zone}
                </p>
                <p className="text-sm font-mono font-medium" style={{ color:'#23D18B' }}>
                  ₹{sim.summary?.total_payout_disbursed?.toFixed(0)||0}
                </p>
                <ArrowRight size={13} style={{ color:'rgba(238,242,255,0.2)' }}/>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
