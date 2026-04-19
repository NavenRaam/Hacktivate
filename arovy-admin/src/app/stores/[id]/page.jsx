import { fetchStoreById, trustLabel, CITY_COLORS } from '@/lib/data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import TrustRing from '@/components/shared/TrustRing'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StoreDetailPage({ params }) {
  const store = await fetchStoreById(params.id)
  if (!store) notFound()

  const workers  = store.workers || []
  const live     = store.live    || {}
  const color    = CITY_COLORS[store.city] || '#6B7280'
  const rel      = store.reliability || 0.5
  const relColor = rel>=0.70?'#23D18B':rel>=0.50?'#F5A623':'#F5532D'

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <Link href="/stores" className="flex items-center gap-1.5 text-sm no-underline" style={{ color:'rgba(238,242,255,0.4)' }}>
        <ArrowLeft size={13}/> Back to Stores
      </Link>

      {/* Header */}
      <div className="card mesh-blue p-6 stagger-1">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display font-bold text-2xl text-white">{store.name}</h1>
              {(store.disruption_count||0) > 0 && (
                <span className="badge badge-red">{store.disruption_count} disruptions</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm font-mono" style={{ color:'rgba(238,242,255,0.4)' }}>
              <span style={{ color }}>{store.city}</span>
              <span>·</span><span>{store.zone}</span>
              <span>·</span><span>{store.store_id}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-3xl" style={{ color:'#23D18B' }}>
              ₹{Math.round(live.weekly_premium_pool||0)}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.35)' }}>weekly premium pool</p>
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-4 gap-4 stagger-2">
        {[
          { label:'Workers',      value:live.worker_count||workers.length,              color:'#EEF2FF' },
          { label:'Avg Trust',    value:`${Math.round((live.avg_trust||0)*100)}%`,      color:live.avg_trust>0.7?'#23D18B':'#F5A623' },
          { label:'Avg Risk',     value:(live.avg_risk||0).toFixed(3),                 color:live.avg_risk>0.6?'#F5532D':'#F5A623'  },
          { label:'Reliability',  value:`${Math.round(rel*100)}%`,                     color:relColor },
        ].map(item => (
          <div key={item.label} className="card p-4 text-center">
            <p className="font-display font-bold text-2xl mb-1" style={{ color:item.color }}>{item.value}</p>
            <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.4)' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Reliability */}
      <div className="card p-5 stagger-3">
        <div className="flex justify-between text-xs font-mono mb-2" style={{ color:'rgba(238,242,255,0.4)' }}>
          <span>Store Reliability Score</span>
          <span style={{ color:relColor }}>{Math.round(rel*100)}% · {rel>=0.70?'High':rel>=0.50?'Moderate':'Low'}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
          <div style={{ width:`${rel*100}%`, height:'100%', background:relColor, borderRadius:4 }}/>
        </div>
        <p className="text-xs font-mono mt-2" style={{ color:'rgba(238,242,255,0.3)' }}>
          Reliability decreases slightly after each disruption and recovers over time.
          {store.last_disruption_at && ` Last disruption: ${store.last_disruption_at?.split('T')[1]?.slice(0,8)}`}
        </p>
      </div>

      {/* Workers in this store */}
      {workers.length > 0 && (
        <div className="stagger-4">
          <h2 className="font-display font-bold text-lg text-white mb-4">
            Workers · {workers.length} assigned
          </h2>
          <div className="card overflow-hidden">
            <div className="grid px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border-b"
              style={{ gridTemplateColumns:'1fr 60px 80px 80px 80px', color:'rgba(238,242,255,0.3)', borderColor:'rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>
              <span>Worker</span><span className="text-center">Trust</span>
              <span className="text-center">Eligible</span><span className="text-right">Risk</span><span className="text-right">Premium</span>
            </div>
            {workers.map(w => {
              const tl = trustLabel(w.trust_profile.trust_score)
              return (
                <Link key={w.worker_id} href={`/workers/${w.worker_id}`}
                  className="table-row no-underline"
                  style={{ gridTemplateColumns:'1fr 60px 80px 80px 80px' }}>
                  <div>
                    <p className="text-sm font-medium text-white">{w.name}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.35)' }}>{w.worker_id} · {w.months_of_service}mo</p>
                  </div>
                  <div className="flex justify-center"><TrustRing score={w.trust_profile.trust_score} size={34}/></div>
                  <div className="flex justify-center">
                    <span className={`badge ${w.eligibility_tier==='full'?'badge-green':w.eligibility_tier==='partial'?'badge-blue':'badge-amber'}`}>
                      {w.eligibility_tier.replace('_',' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono" style={{ color:w.risk_profile.risk_score>0.6?'#F5532D':'#F5A623' }}>
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
      )}
    </div>
  )
}
