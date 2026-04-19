import { fetchWorkers, trustLabel, eligLabel, planLabel, CITY_COLORS } from '@/lib/data'
import Link from 'next/link'
import TrustRing from '@/components/shared/TrustRing'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function WorkersPage({ searchParams }) {
  const cityFilter  = searchParams?.city  || 'all'
  const trustFilter = searchParams?.trust || 'all'

  const params = {}
  if (cityFilter !== 'all') params.city = cityFilter
  let workers = await fetchWorkers(params)
  if (trustFilter !== 'all') workers = workers.filter(w => w.trust_profile.profile_type === trustFilter)

  const cities     = ['Chennai','Bangalore','Hyderabad']
  const trustTypes = ['excellent','good','moderate','low','critical']

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="stagger-1">
        <h1 className="font-display font-bold text-3xl text-white">Workers</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>
          {workers.length} workers · live from backend · trust and premium update after each disruption
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-6 stagger-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>City</span>
          <div className="flex gap-1.5">
            {['all',...cities].map(c => (
              <Link key={c} href={`/workers?city=${c}&trust=${trustFilter}`}
                className="px-2.5 py-1 rounded-lg text-xs font-mono no-underline transition-all"
                style={cityFilter===c
                  ? { background:CITY_COLORS[c]||'rgba(255,255,255,0.15)', color:'#fff', fontWeight:'600' }
                  : { background:'rgba(255,255,255,0.05)', color:'rgba(238,242,255,0.45)' }}>
                {c==='all'?'All':c}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>Trust</span>
          <div className="flex gap-1.5 flex-wrap">
            {['all',...trustTypes].map(t => {
              const colors = { excellent:'#23D18B',good:'#4F8EF7',moderate:'#F5A623',low:'#F5532D',critical:'#EF4444' }
              return (
                <Link key={t} href={`/workers?city=${cityFilter}&trust=${t}`}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono no-underline capitalize transition-all"
                  style={trustFilter===t
                    ? { background:(colors[t]||'rgba(255,255,255,0.15)')+'25', color:colors[t]||'#fff', border:`1px solid ${colors[t]||'rgba(255,255,255,0.2)'}45` }
                    : { background:'rgba(255,255,255,0.05)', color:'rgba(238,242,255,0.45)' }}>
                  {t==='all'?'All':t}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden stagger-3">
        <div className="grid px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border-b"
          style={{ gridTemplateColumns:'1fr 100px 70px 80px 80px 70px 90px',
                   color:'rgba(238,242,255,0.3)', borderColor:'rgba(255,255,255,0.07)',
                   background:'rgba(255,255,255,0.02)' }}>
          <span>Worker</span><span>Store</span><span className="text-center">Trust</span>
          <span className="text-center">Plan</span><span className="text-center">Eligible</span>
          <span className="text-right">Risk</span><span className="text-right">Premium/wk</span>
        </div>
        {workers.length === 0 && (
          <div className="p-8 text-center text-sm" style={{ color:'rgba(238,242,255,0.4)' }}>
            No workers found
          </div>
        )}
        {workers.map(w => {
          const tl  = trustLabel(w.trust_profile.trust_score)
          const el  = eligLabel(w.eligibility_tier)
          const pl  = planLabel(w.insurance_plan.plan_tier)
          const col = CITY_COLORS[w.city] || '#6B7280'
          return (
            <Link key={w.worker_id} href={`/workers/${w.worker_id}`}
              className="table-row no-underline"
              style={{ gridTemplateColumns:'1fr 100px 70px 80px 80px 70px 90px' }}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{w.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono" style={{ color:col }}>{w.city}</span>
                  <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.2)' }}>·</span>
                  <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>{w.zone}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-mono truncate" style={{ color:'rgba(238,242,255,0.5)' }}>{w.primary_store_id}</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.3)' }}>{w.months_of_service}mo</p>
              </div>
              <div className="flex justify-center"><TrustRing score={w.trust_profile.trust_score} size={34}/></div>
              <div className="flex justify-center"><span className={`badge ${pl.cls}`}>{pl.text}</span></div>
              <div className="flex justify-center"><span className={`badge ${el.cls}`}>{el.text}</span></div>
              <div className="text-right">
                <span className="text-xs font-mono" style={{ color:w.risk_profile.risk_score>0.6?'#F5532D':w.risk_profile.risk_score>0.45?'#F5A623':'#23D18B' }}>
                  {w.risk_profile.risk_score}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-semibold" style={{ color:'rgba(238,242,255,0.7)' }}>
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
