import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  SafeAreaView,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { LinearGradient } from 'expo-linear-gradient'
import { refreshProfile } from '../../src/lib/api'
import { C, fmt, planColor } from '../../src/lib/theme'

function Section({ title, children }) {
  return (
    <View style={{ backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 }}>
      <Text style={{ fontSize:10, color:C.low, fontFamily:'DMMono_500Medium', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>{title}</Text>
      {children}
    </View>
  )
}

function Row({ label, value, color, last }) {
  return (
    <View style={{
      flexDirection:'row', justifyContent:'space-between', alignItems:'center',
      paddingVertical:9,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: C.border,
    }}>
      <Text style={{ fontSize:12, color:C.low, fontFamily:'DMMono_500Medium' }}>{label}</Text>
      <Text style={{ fontSize:13, color:color||C.hi, fontFamily:'DMMono_500Medium', fontWeight:'600', textTransform:'capitalize' }}>{value}</Text>
    </View>
  )
}

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_SHORT = { monday:'M', tuesday:'T', wednesday:'W', thursday:'T', friday:'F', saturday:'S', sunday:'S' }

function BaselineBar({ worker }) {
  const vals   = DAYS.map(d => worker.baseline_income?.[d] || 0)
  const maxVal = Math.max(...vals)

  return (
    <View>
      <View style={{ flexDirection:'row', alignItems:'flex-end', gap:5, height:64 }}>
        {DAYS.map((d, i) => {
          const h = maxVal > 0 ? (vals[i] / maxVal) * 50 + 8 : 8
          return (
            <View key={d} style={{ flex:1, alignItems:'center' }}>
              <View style={{
                width:'100%', height:h, borderRadius:4,
                backgroundColor: i >= 5 ? 'rgba(79,142,247,0.35)' : 'rgba(255,255,255,0.12)',
              }}/>
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection:'row', gap:5, marginTop:4 }}>
        {DAYS.map(d => (
          <View key={d} style={{ flex:1, alignItems:'center' }}>
            <Text style={{ fontSize:9, color:C.muted, fontFamily:'DMMono_500Medium' }}>{DAY_SHORT[d]}</Text>
            <Text style={{ fontSize:8, color:C.low, fontFamily:'DMMono_400Regular', marginTop:1 }}>₹{worker.baseline_income?.[d]||0}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export default function ProfileScreen() {
  const [worker,    setWorker]    = useState(null)
  const [refreshing,setRefreshing]= useState(false)

  const load = useCallback(async () => {
    try {
      const id = await SecureStore.getItemAsync('worker_id')
      if (!id) return
      const w  = await refreshProfile(id)
      setWorker(w)
      await SecureStore.setItemAsync('worker_data', JSON.stringify(w))
    } catch {
      const cached = await SecureStore.getItemAsync('worker_data')
      if (cached) setWorker(JSON.parse(cached))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  if (!worker) return (
    <View style={{ flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' }}>
      <Text style={{ color:C.low, fontFamily:'DMMono_500Medium', fontSize:12 }}>Loading…</Text>
    </View>
  )

  const planTier  = worker.insurance_plan?.plan_tier || 'basic'
  const pColor    = planColor(planTier)
  const eligMap   = { full:{label:'Full Coverage',color:C.green}, partial:{label:'Partial',color:C.blue}, limited:{label:'Limited',color:C.amber}, not_eligible:{label:'Ineligible',color:C.low} }
  const elig      = eligMap[worker.eligibility_tier] || eligMap.not_eligible
  const avgDaily  = DAYS.reduce((s,d) => s+(worker.baseline_income?.[d]||0), 0) / 7

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue}/>}
        contentContainerStyle={{ paddingBottom:100 }}>

        {/* Header */}
        <LinearGradient colors={['#0D1420','#05070C']}
          style={{ paddingHorizontal:20, paddingTop:20, paddingBottom:24 }}>
          <Text style={{ fontSize:26, color:C.hi, fontFamily:'DMSans_700Bold', marginBottom:4 }}>Profile</Text>

          {/* Worker card */}
          <View style={{ backgroundColor:'rgba(255,255,255,0.04)', borderRadius:16, borderWidth:1, borderColor:C.border, padding:16 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
              <View style={{ width:52, height:52, borderRadius:26, backgroundColor:pColor+'20', borderWidth:2, borderColor:pColor+'50', alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:22, color:pColor, fontFamily:'DMSans_700Bold' }}>
                  {worker.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:20, color:C.hi, fontFamily:'DMSans_700Bold' }}>{worker.name}</Text>
                <Text style={{ fontSize:12, color:C.low, fontFamily:'DMMono_500Medium', marginTop:1 }}>{worker.worker_id}</Text>
                <Text style={{ fontSize:12, color:C.low, fontFamily:'DMMono_500Medium' }}>{worker.city} · {worker.zone}</Text>
              </View>
              <View style={{ paddingHorizontal:10, paddingVertical:4, borderRadius:10, backgroundColor:pColor+'15', borderWidth:1, borderColor:pColor+'30' }}>
                <Text style={{ fontSize:11, color:pColor, fontFamily:'DMMono_500Medium', textTransform:'uppercase' }}>{planTier}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal:20, paddingTop:12 }}>

          {/* Plan details */}
          <Section title="Insurance Plan">
            <Row label="Plan Tier"      value={planTier}                                          color={pColor}/>
            <Row label="Coverage"       value={`${Math.round((worker.insurance_plan?.adjusted_coverage||0)*100)}%`} color={C.green}/>
            <Row label="Status"         value={elig.label}                                        color={elig.color}/>
            <Row label="Weekly Premium" value={fmt(worker.premium?.weekly_premium)}               color={C.blue}/>
            <Row label="Annual Premium" value={fmt((worker.premium?.weekly_premium||0)*52)}/>
            <Row label="Member For"     value={`${worker.months_of_service} months`}              last/>
          </Section>

          {/* How payouts work */}
          <Section title="How Your Payouts Work">
            <View style={{ backgroundColor:'rgba(79,142,247,0.08)', borderRadius:10, padding:12, marginBottom:12 }}>
              <Text style={{ fontSize:13, color:C.mid, fontFamily:'DMSans_400Regular', lineHeight:20 }}>
                When a verified disruption occurs in your zone while you are on shift, your income loss is automatically calculated and a payout is sent to your UPI. No action needed from you.
              </Text>
            </View>
            {[
              ['Disruption detected',       'System detects a verified event in your zone'   ],
              ['Your session verified',      'Your shift activity is automatically checked'   ],
              ['Income loss calculated',     'Based on your earnings and the disruption period'],
              ['Payout transferred',         'Amount sent to your registered UPI within hours' ],
            ].map(([step, desc], i) => (
              <View key={step} style={{ flexDirection:'row', gap:12, marginBottom:10, alignItems:'flex-start' }}>
                <View style={{ width:22, height:22, borderRadius:11, backgroundColor:'rgba(79,142,247,0.15)', alignItems:'center', justifyContent:'center', marginTop:1 }}>
                  <Text style={{ fontSize:11, color:C.blue, fontFamily:'DMMono_500Medium', fontWeight:'600' }}>{i+1}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:13, color:C.hi, fontFamily:'DMSans_500Medium' }}>{step}</Text>
                  <Text style={{ fontSize:11, color:C.low, fontFamily:'DMSans_400Regular', marginTop:1 }}>{desc}</Text>
                </View>
              </View>
            ))}
          </Section>

          {/* Daily baseline chart */}
          <Section title="Your Daily Baseline Income">
            <BaselineChart worker={worker}/>
            <Row label="Avg Daily" value={fmt(avgDaily)} color={C.hi} last/>
          </Section>

          {/* Personal details */}
          <Section title="Personal Details">
            <Row label="Worker ID"  value={worker.worker_id}/>
            <Row label="City"       value={worker.city}/>
            <Row label="Zone"       value={worker.zone}/>
            <Row label="Store"      value={worker.primary_store_id}/>
            <Row label="UPI ID"     value={worker.upi_id || 'Not registered'} last/>
          </Section>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function BaselineChart({ worker }) {
  const vals   = DAYS.map(d => worker.baseline_income?.[d] || 0)
  const maxVal = Math.max(...vals, 1)

  return (
    <View style={{ marginBottom:12 }}>
      <View style={{ flexDirection:'row', alignItems:'flex-end', gap:5, height:64, marginBottom:6 }}>
        {DAYS.map((d, i) => {
          const h = (vals[i] / maxVal) * 54 + 6
          return (
            <View key={d} style={{ flex:1, alignItems:'center' }}>
              <Text style={{ fontSize:8, color:C.muted, fontFamily:'DMMono_500Medium', marginBottom:3 }}>₹{vals[i]}</Text>
              <View style={{ width:'100%', height:h, borderRadius:4, backgroundColor: i >= 5 ? 'rgba(79,142,247,0.35)' : 'rgba(255,255,255,0.12)' }}/>
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection:'row', gap:5 }}>
        {DAYS.map(d => (
          <View key={d} style={{ flex:1, alignItems:'center' }}>
            <Text style={{ fontSize:9, color:C.muted, fontFamily:'DMMono_500Medium' }}>{DAY_SHORT[d]}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
