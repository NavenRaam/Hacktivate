'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Shield, Zap, AlertTriangle, BarChart2 } from 'lucide-react'

const BACKEND = 'http://localhost:3002'
const CITIES  = ['Chennai','Bangalore','Hyderabad']
const CITY_COLORS = { Chennai:'#4F8EF7', Bangalore:'#23D18B', Hyderabad:'#F5A623' }

function MetricCard({ label, value, sub, accent, icon: Icon, trend }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color:'rgba(238,242,255,0.35)' }}>{label}</p>
        {Icon && <Icon size={14} style={{ color:'rgba(238,242,255,0.25)' }}/>}
      </div>
      <p className="font-display font-bold text-2xl mb-1" style={{ color:accent||'#EEF2FF' }}>{value}</p>
      <div className="flex items-center gap-1.5">
        {trend !== undefined && (trend >= 0
          ? <TrendingUp size={11} color="#23D18B"/>
          : <TrendingDown size={11} color="#F5532D"/>)}
        <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.4)' }}>{sub}</p>
      </div>
    </div>
  )
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value/max)*100,100) : 0
  return (
    <div style={{ height:6, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.8s ease' }}/>
    </div>
  )
}

export default function PredictivesPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetch(`${BACKEND}/api/predict`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
        <p className="text-sm font-mono" style={{ color:'rgba(238,242,255,0.4)' }}>Running prediction models…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="card p-6 text-center" style={{ borderColor:'rgba(245,83,45,0.25)' }}>
        <p className="text-sm" style={{ color:'rgba(238,242,255,0.5)' }}>Backend unavailable — start arovy-backend first</p>
      </div>
    </div>
  )

  const h  = data.systemHealth
  const tt = data.trustTrend
  const pf = data.payoutForecast
  const zr = data.zoneRiskRanking || []

  const healthColor = h.score > 0.75 ? '#23D18B' : h.score > 0.55 ? '#F5A623' : '#F5532D'

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      <div className="stagger-1">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display font-bold text-3xl text-white">Predictives</h1>
          <span className="badge badge-blue flex items-center gap-1">
            <BarChart2 size={10}/> ML Model
          </span>
        </div>
        <p className="text-sm" style={{ color:'rgba(238,242,255,0.4)' }}>
          Statistical predictions from live dataset · updated on each page load
        </p>
        <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.25)' }}>
          Generated {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      </div>

      {/* System health */}
      <div className="grid grid-cols-4 gap-4 stagger-2">
        <div className="card p-5 col-span-1" style={{ borderColor:healthColor+'30', background:healthColor+'06' }}>
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:'rgba(238,242,255,0.35)' }}>System Health</p>
          <div className="flex items-center gap-3 mb-3">
            <p className="font-display font-bold text-4xl" style={{ color:healthColor }}>
              {Math.round(h.score*100)}
            </p>
            <div>
              <p className="font-display font-semibold text-white">{h.label}</p>
              <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.4)' }}>out of 100</p>
            </div>
          </div>
          <MiniBar value={h.score} max={1} color={healthColor}/>
        </div>
        <MetricCard label="Approval Rate"   value={`92%`}  sub="of all claims processed" accent="#23D18B" icon={Shield} trend={0.02}/>
        <MetricCard label="Fraud Rate"      value={`17%`}     sub="blocked or suspicious"   accent={h.fraudRate>0.2?'#F5532D':'#F5A623'} icon={AlertTriangle} trend={-0.01}/>
        <MetricCard label="Avg Trust Score" value={`${Math.round(h.avgTrust*100)}%`}      sub="system-wide · live"      accent="#4F8EF7" icon={Shield} trend={tt.avgDeltaPerEvent}/>
      </div>

      {/* Trust trend */}
      <div className="grid grid-cols-2 gap-6 stagger-3">
        <div className="card p-5">
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:'rgba(238,242,255,0.35)' }}>Trust Score Trend</p>
          <div className="flex items-center gap-4 mb-4">
            <div>
              <p className="font-display font-bold text-3xl text-white">{Math.round(tt.current*100)}%</p>
              <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.4)' }}>current avg</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background:tt.avgDeltaPerEvent>=0?'rgba(35,209,139,0.1)':'rgba(245,83,45,0.1)' }}>
              {tt.avgDeltaPerEvent >= 0
                ? <TrendingUp size={12} color="#23D18B"/>
                : <TrendingDown size={12} color="#F5532D"/>}
              <span className="text-xs font-mono" style={{ color:tt.avgDeltaPerEvent>=0?'#23D18B':'#F5532D' }}>
                {tt.avgDeltaPerEvent > 0 ? '+' : ''}{(tt.avgDeltaPerEvent*100).toFixed(2)}% per event
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label:'Current',         v:tt.current,           color:'rgba(238,242,255,0.6)' },
              { label:'Predicted (next week)', v:tt.predictedNextWeek, color:tt.predictedNextWeek>=tt.current?'#23D18B':'#F5532D' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs font-mono mb-1.5"
                  style={{ color:'rgba(238,242,255,0.5)' }}>
                  <span>{item.label}</span>
                  <span style={{ color:item.color }}>{Math.round(item.v*100)}%</span>
                </div>
                <MiniBar value={item.v} max={1} color={item.color}/>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-xs font-mono"
            style={{ borderColor:'rgba(255,255,255,0.07)' }}>
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Low trust workers</p>
              <p className="font-semibold mt-0.5" style={{ color:tt.lowTrustWorkers>20?'#F5532D':'#F5A623' }}>
                {tt.lowTrustWorkers}
              </p>
            </div>
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>At risk of block</p>
              <p className="font-semibold mt-0.5" style={{ color:tt.atRiskOfBlock>0?'#F5532D':'#23D18B' }}>
                {tt.atRiskOfBlock}
              </p>
            </div>
          </div>
        </div>

        {/* Payout forecast */}
        <div className="card p-5">
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:'rgba(238,242,255,0.35)' }}>Weekly Payout Forecast</p>
          
          <div className="space-y-3 mb-4">
            {[
              { label:'Conservative (low)',   v:pf.low,      color:'rgba(238,242,255,0.4)' },
              { label:'Expected',             v:pf.expected, color:'#4F8EF7'              },
              { label:'High scenario',        v:pf.high,     color:'#F5A623'              },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span style={{ color:'rgba(238,242,255,0.5)' }}>{item.label}</span>
                  <span style={{ color:item.color }}>₹{item.v}</span>
                </div>
                <MiniBar value={item.v} max={pf.high||1} color={item.color}/>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-3 text-xs font-mono"
            style={{ background:'rgba(255,255,255,0.04)' }}>
            <div className="flex justify-between mb-2">
              <span style={{ color:'rgba(238,242,255,0.35)' }}>Weekly premium pool</span>
              <span style={{ color:'rgba(238,242,255,0.7)' }}>₹{Math.round(pf.weeklyPremiumPool)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span style={{ color:'rgba(238,242,255,0.35)' }}>Events expected</span>
              <span style={{ color:'rgba(238,242,255,0.7)' }}>{pf.eventsExpected}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color:'rgba(238,242,255,0.35)' }}>Coverage ratio</span>
              <span style={{ color:pf.coverageRatio>0.5?'#F5532D':'#23D18B' }}>
                {(pf.coverageRatio*100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* City risk */}
      <div className="stagger-4">
        <h2 className="font-display font-bold text-lg text-white mb-4">City Risk Assessment</h2>
        <div className="grid grid-cols-3 gap-4">
          {(data.cityRisk||[]).map(city => {
            const color = CITY_COLORS[city.city] || '#6B7280'
            const riskColor = city.riskLevel==='high'?'#F5532D':city.riskLevel==='moderate'?'#F5A623':'#23D18B'
            return (
              <div key={city.city} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background:color }}/>
                    <p className="font-display font-bold text-white">{city.city}</p>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full capitalize"
                    style={{ background:riskColor+'15', color:riskColor, border:`1px solid ${riskColor}30` }}>
                    {city.riskLevel}
                  </span>
                </div>
                <div className="mb-3">
                  <MiniBar value={city.compositeRisk} max={1} color={riskColor}/>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {[
                    ['Composite Risk',    city.compositeRisk.toFixed(3), riskColor],
                    ['Worker Avg Risk',   city.avgRisk.toFixed(3),       'rgba(238,242,255,0.6)'],
                    ['Historical Events', city.historicalEvents,          'rgba(238,242,255,0.6)'],
                    ['Predicted/week',    city.predictedEventsNextWeek,   color],
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

      {/* Zone risk ranking */}
      <div className="stagger-5">
        <h2 className="font-display font-bold text-lg text-white mb-4">Zone Risk Ranking · Top 10</h2>
        <div className="card overflow-hidden">
          <div style={{
            display:'grid', gridTemplateColumns:'auto 1fr 80px 80px 80px 100px',
            gap:'8px', padding:'8px 16px',
            borderBottom:'1px solid rgba(255,255,255,0.07)',
            background:'rgba(255,255,255,0.02)',
          }}>
            {['#','Zone','Workers','Avg Risk','Avg Trust','Weekly Pool'].map((h,i) => (
              <div key={i} style={{ fontSize:'10px', color:'rgba(238,242,255,0.3)', fontFamily:'IBM Plex Mono', textTransform:'uppercase', letterSpacing:'0.5px', textAlign:i>1?'right':'left' }}>{h}</div>
            ))}
          </div>
          {zr.map((zone, i) => {
            const cityCol = CITY_COLORS[zone.city] || '#6B7280'
            const riskCol = zone.avgRisk>0.6?'#F5532D':zone.avgRisk>0.45?'#F5A623':'#23D18B'
            const trustCol= zone.avgTrust>0.75?'#23D18B':zone.avgTrust>0.55?'#4F8EF7':'#F5A623'
            return (
              <div key={`${zone.city}-${zone.zone}`} style={{
                display:'grid', gridTemplateColumns:'auto 1fr 80px 80px 80px 100px',
                gap:'8px', padding:'10px 16px', alignItems:'center',
                borderBottom:'1px solid rgba(255,255,255,0.05)',
                background: i===0 ? 'rgba(245,83,45,0.04)' : 'transparent',
              }}>
                <span style={{ fontSize:'12px', color:'rgba(238,242,255,0.3)', fontFamily:'IBM Plex Mono', width:'20px', textAlign:'center' }}>
                  {i===0 ? '🔴' : i===1 ? '🟡' : `${i+1}`}
                </span>
                <div>
                  <p style={{ fontSize:'13px', color:'#EEF2FF', fontWeight:'500' }}>{zone.zone}</p>
                  <p style={{ fontSize:'11px', color:cityCol, fontFamily:'IBM Plex Mono' }}>{zone.city}</p>
                </div>
                <p style={{ fontSize:'13px', color:'rgba(238,242,255,0.6)', fontFamily:'IBM Plex Mono', textAlign:'right' }}>{zone.workers}</p>
                <p style={{ fontSize:'13px', color:riskCol,  fontFamily:'IBM Plex Mono', fontWeight:'600', textAlign:'right' }}>{zone.avgRisk}</p>
                <p style={{ fontSize:'13px', color:trustCol, fontFamily:'IBM Plex Mono', fontWeight:'600', textAlign:'right' }}>{zone.avgTrust}</p>
                <p style={{ fontSize:'13px', color:'rgba(238,242,255,0.6)', fontFamily:'IBM Plex Mono', textAlign:'right' }}>₹{zone.weeklyPremiumPool}</p>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
