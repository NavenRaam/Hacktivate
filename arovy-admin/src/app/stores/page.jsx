import { getAllStores, getRiskPools, CITY_COLORS, getWorkersByStore } from '@/lib/data'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function StoresPage() {
  const stores  = getAllStores()
  const pools   = getRiskPools()
  const poolMap = Object.fromEntries(pools.map(p => [p.store_id, p]))
  const cities  = ['Chennai','Bangalore','Hyderabad']

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      <div className="stagger-1">
        <h1 className="font-display font-bold text-3xl text-white">Dark Stores</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>
          15 stores across 3 cities with pool risk analysis
        </p>
      </div>

      {cities.map((city, ci) => {
        const cityStores = stores.filter(s => s.city === city)
        const color      = CITY_COLORS[city]

        return (
          <div key={city} style={{ animationDelay:`${ci*0.08}s` }} className="stagger-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ background:color }}/>
              <h2 className="font-display font-bold text-xl text-white">{city}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{ background:color+'12', color, border:`1px solid ${color}30` }}>
                {cityStores.length} stores
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {cityStores.map(store => {
                const pool    = poolMap[store.store_id]
                const workers = getWorkersByStore(store.store_id)
                const rel     = store.reliability
                const relColor= rel >= 0.7 ? '#23D18B' : rel >= 0.5 ? '#F5A623' : '#F5532D'
                const avgTrust= pool ? pool.pool_avg_trust_score : 0
                const riskScore= pool ? pool.pool_risk_score : 0

                return (
                  <Link key={store.store_id} href={`/stores/${store.store_id}`}
                    className="card card-hover p-4 block no-underline">

                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-display font-semibold text-white text-sm leading-tight">
                          {store.name}
                        </p>
                        <p className="text-xs font-mono mt-0.5"
                          style={{ color:'rgba(238,242,255,0.38)' }}>
                          {store.zone}
                        </p>
                      </div>
                      <ArrowRight size={13} style={{ color:'rgba(238,242,255,0.2)' }}/>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="rounded-lg p-2 text-center"
                        style={{ background:'rgba(255,255,255,0.04)' }}>
                        <p className="font-display font-bold text-base text-white">
                          {workers.length}
                        </p>
                        <p className="text-[10px] font-mono mt-0.5"
                          style={{ color:'rgba(238,242,255,0.35)' }}>workers</p>
                      </div>
                      <div className="rounded-lg p-2 text-center"
                        style={{ background:'rgba(255,255,255,0.04)' }}>
                        <p className="font-display font-bold text-base"
                          style={{ color: relColor }}>
                          {Math.round(rel*100)}%
                        </p>
                        <p className="text-[10px] font-mono mt-0.5"
                          style={{ color:'rgba(238,242,255,0.35)' }}>uptime</p>
                      </div>
                      <div className="rounded-lg p-2 text-center"
                        style={{ background:'rgba(255,255,255,0.04)' }}>
                        <p className="font-display font-bold text-base"
                          style={{ color: riskScore > 0.6 ? '#F5532D' : '#F5A623' }}>
                          {pool ? pool.pool_risk_score.toFixed(2) : '—'}
                        </p>
                        <p className="text-[10px] font-mono mt-0.5"
                          style={{ color:'rgba(238,242,255,0.35)' }}>pool risk</p>
                      </div>
                    </div>

                    {/* Trust bar */}
                    {pool && (
                      <div>
                        <div className="flex justify-between text-[10px] font-mono mb-1"
                          style={{ color:'rgba(238,242,255,0.3)' }}>
                          <span>Pool trust</span>
                          <span>{Math.round(pool.pool_avg_trust_score*100)}%</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden"
                          style={{ background:'rgba(255,255,255,0.07)' }}>
                          <div className="h-full rounded-full"
                            style={{
                              width:`${pool.pool_avg_trust_score*100}%`,
                              background: pool.pool_avg_trust_score > 0.7 ? '#23D18B'
                                        : pool.pool_avg_trust_score > 0.5 ? '#F5A623'
                                        : '#F5532D'
                            }}/>
                        </div>
                      </div>
                    )}

                    {/* Weekly premium */}
                    {pool && (
                      <div className="mt-3 pt-3 border-t flex justify-between text-xs font-mono"
                        style={{ borderColor:'rgba(255,255,255,0.07)', color:'rgba(238,242,255,0.35)' }}>
                        <span>Collective premium</span>
                        <span style={{ color:'rgba(238,242,255,0.65)' }}>
                          ₹{Math.round(pool.collective_weekly_premium)}/wk
                        </span>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
