import { getAllWorkers, trustLabel, eligLabel, planLabel, CITY_COLORS } from '@/lib/data'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import TrustRing from '@/components/shared/TrustRing'

export default function WorkersPage({ searchParams }) {
  const cityFilter  = searchParams?.city  || 'all'
  const trustFilter = searchParams?.trust || 'all'

  let workers = getAllWorkers()
  if (cityFilter  !== 'all') workers = workers.filter(w => w.city === cityFilter)
  if (trustFilter !== 'all') workers = workers.filter(w => w.trust_profile.profile_type === trustFilter)

  const cities     = ['Chennai','Bangalore','Hyderabad']
  const trustTypes = ['excellent','good','moderate','low','critical']

  return (
    <div className="p-8 space-y-6 max-w-6xl">

      {/* Header */}
      <div className="stagger-1">
        <h1 className="font-display font-bold text-3xl text-white">Workers</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>
          {workers.length} workers · click any row to view full profile
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-6 stagger-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>City</span>
          <div className="flex gap-1">
            {['all',...cities].map(c => (
              <Link key={c} href={`/workers?city=${c}&trust=${trustFilter}`}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono no-underline transition-all ${
                  cityFilter === c ? 'text-white' : ''
                }`}
                style={cityFilter === c
                  ? { background:CITY_COLORS[c] || 'rgba(255,255,255,0.12)', color:'#fff' }
                  : { background:'rgba(255,255,255,0.05)', color:'rgba(238,242,255,0.45)' }}>
                {c === 'all' ? 'All' : c}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>Trust</span>
          <div className="flex gap-1">
            {['all',...trustTypes].map(t => {
              const colors = { excellent:'#23D18B', good:'#4F8EF7', moderate:'#F5A623', low:'#F5532D', critical:'#EF4444' }
              return (
                <Link key={t} href={`/workers?city=${cityFilter}&trust=${t}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono no-underline capitalize transition-all`}
                  style={trustFilter === t
                    ? { background:(colors[t]||'rgba(255,255,255,0.12)')+'20', color:colors[t]||'#fff', border:`1px solid ${colors[t]||'rgba(255,255,255,0.2)'}40` }
                    : { background:'rgba(255,255,255,0.05)', color:'rgba(238,242,255,0.45)' }}>
                  {t === 'all' ? 'All' : t}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden stagger-3">
        <div className="grid px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border-b"
          style={{
            gridTemplateColumns:'1fr 90px 70px 80px 80px 70px 80px',
            color:'rgba(238,242,255,0.3)',
            borderColor:'rgba(255,255,255,0.07)',
            background:'rgba(255,255,255,0.02)'
          }}>
          <span>Worker</span>
          <span>Store</span>
          <span className="text-center">Trust</span>
          <span className="text-center">Plan</span>
          <span className="text-center">Eligible</span>
          <span className="text-right">Risk</span>
          <span className="text-right">Premium</span>
        </div>

        {workers.map((w, i) => {
          const tl       = trustLabel(w.trust_profile.trust_score)
          const el       = eligLabel(w.eligibility_tier)
          const pl       = planLabel(w.insurance_plan.plan_tier)
          const cityCol  = CITY_COLORS[w.city] || '#6B7280'

          return (
            <Link key={w.worker_id} href={`/workers/${w.worker_id}`}
              className="table-row no-underline"
              style={{ gridTemplateColumns:'1fr 90px 70px 80px 80px 70px 80px' }}>

              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{w.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono" style={{ color:cityCol }}>{w.city}</span>
                  <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.2)' }}>·</span>
                  <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>{w.zone}</span>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-mono truncate" style={{ color:'rgba(238,242,255,0.5)' }}>
                  {w.primary_store_id}
                </p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.3)' }}>
                  {w.months_of_service}mo service
                </p>
              </div>

              <div className="flex justify-center">
                <TrustRing score={w.trust_profile.trust_score} size={34}/>
              </div>

              <div className="flex justify-center">
                <span className={`badge ${pl.cls}`}>{pl.text}</span>
              </div>

              <div className="flex justify-center">
                <span className={`badge ${el.cls}`}>{el.text}</span>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono"
                  style={{ color: w.risk_profile.risk_score > 0.6 ? '#F5532D'
                               : w.risk_profile.risk_score > 0.45 ? '#F5A623' : '#23D18B' }}>
                  {w.risk_profile.risk_score}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.6)' }}>
                  ₹{Math.round(w.premium.weekly_premium)}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
