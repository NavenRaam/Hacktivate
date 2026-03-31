import { getStoreById, getWorkersByStore, getRiskPoolByStore, trustLabel, eligLabel, planLabel, CITY_COLORS } from '@/lib/data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import TrustRing from '@/components/shared/TrustRing'

export default function StoreDetailPage({ params }) {
  const store   = getStoreById(params.id)
  if (!store) notFound()

  const workers = getWorkersByStore(params.id)
  const pool    = getRiskPoolByStore(params.id)
  const color   = CITY_COLORS[store.city] || '#4F8EF7'
  const rel     = store.reliability
  const relColor= rel >= 0.7 ? '#23D18B' : rel >= 0.5 ? '#F5A623' : '#F5532D'

  const avgTrust = workers.reduce((s,w) => s + w.trust_profile.trust_score, 0) / workers.length
  const avgRisk  = workers.reduce((s,w) => s + w.risk_profile.risk_score, 0) / workers.length

  const trustDist = { excellent:0, good:0, moderate:0, low:0, critical:0 }
  workers.forEach(w => trustDist[w.trust_profile.profile_type]++)

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      <Link href="/stores"
        className="flex items-center gap-1.5 text-sm no-underline"
        style={{ color:'rgba(238,242,255,0.4)' }}>
        <ArrowLeft size={13}/> Back to Stores
      </Link>

      {/* Store header */}
      <div className="card p-6 stagger-1"
        style={{ background:`radial-gradient(ellipse 60% 60% at 0% 0%, ${color}10, transparent 60%), #0F1521` }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background:color }}/>
              <span className="text-xs font-mono" style={{ color }}>{store.city}</span>
            </div>
            <h1 className="font-display font-bold text-3xl text-white">{store.name}</h1>
            <p className="text-sm mt-1" style={{ color:'rgba(238,242,255,0.45)' }}>
              {store.zone} · {store.store_id}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-4xl" style={{ color: relColor }}>
              {Math.round(rel*100)}%
            </p>
            <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.35)' }}>
              store uptime
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          {[
            { label:'Workers',         value: workers.length,                              accent:'#fff'     },
            { label:'Pool Risk',       value: pool?.pool_risk_score?.toFixed(2) || '—',   accent:'#F5A623'  },
            { label:'Avg Trust',       value: `${Math.round(avgTrust*100)}%`,              accent:'#23D18B'  },
            { label:'Weekly Premium',  value: `₹${Math.round(pool?.collective_weekly_premium||0)}`, accent:'#4F8EF7' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-4"
              style={{ background:'rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-mono uppercase tracking-widest mb-1.5"
                style={{ color:'rgba(238,242,255,0.3)' }}>{item.label}</p>
              <p className="font-display font-bold text-2xl" style={{ color:item.accent }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust distribution */}
      <div className="card p-5 stagger-2">
        <p className="text-xs font-mono uppercase tracking-widest mb-4"
          style={{ color:'rgba(238,242,255,0.35)' }}>
          Trust Distribution · {workers.length} workers
        </p>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(trustDist).map(([type, count]) => {
            const colors = { excellent:'#23D18B', good:'#4F8EF7', moderate:'#F5A623', low:'#F5532D', critical:'#EF4444' }
            return (
              <div key={type} className="rounded-xl p-3 text-center"
                style={{ background:colors[type]+'10', border:`1px solid ${colors[type]}20` }}>
                <p className="font-display font-bold text-xl" style={{ color:colors[type] }}>{count}</p>
                <p className="text-[10px] font-mono mt-1 capitalize"
                  style={{ color:'rgba(238,242,255,0.4)' }}>{type}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Workers table */}
      <div className="stagger-3">
        <h2 className="font-display font-bold text-lg text-white mb-4">Workers</h2>
        <div className="card overflow-hidden">
          <div className="grid px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border-b"
            style={{
              gridTemplateColumns:'1fr 60px 80px 80px 80px 80px',
              color:'rgba(238,242,255,0.3)',
              borderColor:'rgba(255,255,255,0.07)',
              background:'rgba(255,255,255,0.02)'
            }}>
            <span>Worker</span>
            <span className="text-center">Trust</span>
            <span className="text-center">Plan</span>
            <span className="text-center">Eligible</span>
            <span className="text-center">Premium</span>
            <span className="text-right">Risk</span>
          </div>

          {workers.map(w => {
            const tl  = trustLabel(w.trust_profile.trust_score)
            const el  = eligLabel(w.eligibility_tier)
            const pl  = planLabel(w.insurance_plan.plan_tier)

            return (
              <Link key={w.worker_id} href={`/workers/${w.worker_id}`}
                className="table-row no-underline"
                style={{ gridTemplateColumns:'1fr 60px 80px 80px 80px 80px' }}>
                <div>
                  <p className="text-sm font-medium text-white">{w.name}</p>
                  <p className="text-xs font-mono mt-0.5"
                    style={{ color:'rgba(238,242,255,0.35)' }}>
                    {w.worker_id} · {w.months_of_service}mo
                  </p>
                </div>
                <div className="flex justify-center">
                  <TrustRing score={w.trust_profile.trust_score} size={36}/>
                </div>
                <div className="flex justify-center">
                  <span className={`badge ${pl.cls}`}>{pl.text}</span>
                </div>
                <div className="flex justify-center">
                  <span className={`badge ${el.cls}`}>{el.text}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-mono" style={{ color:'rgba(238,242,255,0.65)' }}>
                    ₹{Math.round(w.premium.weekly_premium)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono"
                    style={{ color: w.risk_profile.risk_score > 0.6 ? '#F5532D' : '#F5A623' }}>
                    {w.risk_profile.risk_score}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
