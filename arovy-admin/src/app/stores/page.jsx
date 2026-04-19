import { fetchStores, CITY_COLORS } from '@/lib/data'
import Link from 'next/link'
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function TrustBar({ value }) {
  const color = value>=0.75?'#23D18B':value>=0.55?'#4F8EF7':value>=0.35?'#F5A623':'#F5532D'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
        <div style={{ width:`${value*100}%`, height:'100%', background:color, borderRadius:3 }}/>
      </div>
      <span className="text-xs font-mono" style={{ color, minWidth:'36px', textAlign:'right' }}>
        {Math.round(value*100)}%
      </span>
    </div>
  )
}

export default async function StoresPage() {
  const stores = await fetchStores()
  const cities = ['Chennai','Bangalore','Hyderabad']

  const globalPool = stores.reduce((s,st) => s + (st.live?.weekly_premium_pool||0), 0)

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      <div className="stagger-1">
        <h1 className="font-display font-bold text-3xl text-white">Dark Stores</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>
          15 stores · live worker aggregates · updates after each disruption
        </p>
      </div>

      {/* Global pool stat */}
      <div className="grid grid-cols-3 gap-4 stagger-2">
        {[
          { label:'Total Stores',       value:stores.length,                                           accent:'#4F8EF7' },
          { label:'Total Weekly Pool',  value:`₹${Math.round(globalPool).toLocaleString('en-IN')}`,   accent:'#23D18B' },
          { label:'Avg Pool / Store',   value:`₹${Math.round(globalPool/stores.length||0)}`,          accent:'#F5A623' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color:'rgba(238,242,255,0.3)' }}>{item.label}</p>
            <p className="font-display font-bold text-2xl" style={{ color:item.accent }}>{item.value}</p>
          </div>
        ))}
      </div>

      {cities.map((city, ci) => {
        const cityStores = stores.filter(s => s.city === city)
        const color      = CITY_COLORS[city]
        const cityPool   = cityStores.reduce((s,st) => s+(st.live?.weekly_premium_pool||0), 0)

        return (
          <div key={city} className="stagger-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ background:color }}/>
              <h2 className="font-display font-bold text-xl text-white">{city}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background:color+'12', color, border:`1px solid ${color}30` }}>
                {cityStores.length} stores
              </span>
              <span className="text-xs font-mono ml-auto" style={{ color:'rgba(238,242,255,0.4)' }}>
                Pool: ₹{Math.round(cityPool)}/wk
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {cityStores.map(store => {
                const live = store.live || {}
                const rel  = store.reliability || 0.5
                const relColor = rel>=0.70?'#23D18B':rel>=0.50?'#F5A623':'#F5532D'
                const disrupted = (store.disruption_count||0) > 0

                return (
                  <Link key={store.store_id} href={`/stores/${store.store_id}`}
                    className="card card-hover p-4 no-underline block">

                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-display font-semibold text-white text-sm">{store.name}</p>
                        <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.4)' }}>{store.zone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {disrupted && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background:'rgba(245,83,45,0.12)', color:'#F5532D', border:'1px solid rgba(245,83,45,0.2)' }}>
                            {store.disruption_count}× disrupted
                          </span>
                        )}
                        <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.3)' }}>
                          {store.store_id}
                        </span>
                      </div>
                    </div>

                    {/* Reliability bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs font-mono mb-1" style={{ color:'rgba(238,242,255,0.4)' }}>
                        <span>Reliability</span>
                        <span style={{ color:relColor }}>{Math.round(rel*100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                        <div style={{ width:`${rel*100}%`, height:'100%', background:relColor, borderRadius:3 }}/>
                      </div>
                    </div>

                    {/* Live aggregates */}
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span style={{ color:'rgba(238,242,255,0.4)' }}>Workers</span>
                        <span className="text-white">{live.worker_count||store.worker_count||10}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ color:'rgba(238,242,255,0.4)' }}>Avg Trust</span>
                        <TrustBar value={live.avg_trust||store.avg_trust||0.7}/>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color:'rgba(238,242,255,0.4)' }}>Avg Risk</span>
                        <span style={{ color:live.avg_risk>0.6?'#F5532D':live.avg_risk>0.45?'#F5A623':'#23D18B' }}>
                          {(live.avg_risk||store.avg_risk||0.5).toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
                        <span style={{ color:'rgba(238,242,255,0.4)' }}>Weekly Pool</span>
                        <span style={{ color:'#23D18B', fontWeight:'600' }}>
                          ₹{Math.round(live.weekly_premium_pool||store.weekly_premium_pool||0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-3">
                      <ArrowRight size={12} style={{ color:'rgba(238,242,255,0.2)' }}/>
                    </div>
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
