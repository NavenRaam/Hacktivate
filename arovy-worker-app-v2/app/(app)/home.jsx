import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  SafeAreaView, TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as SecureStore from 'expo-secure-store'
import { refreshProfile, getActiveDisruption } from '../../src/lib/api'
import { C, fmt, disruptionLabel, planColor } from '../../src/lib/theme'

function Row({ label, value, color }) {
  return (
    <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:9, borderBottomWidth:1, borderBottomColor:C.border }}>
      <Text style={{ fontSize:12, color:C.low, fontFamily:'DMMono_500Medium' }}>{label}</Text>
      <Text style={{ fontSize:13, color:color||C.hi, fontFamily:'DMMono_500Medium', fontWeight:'600' }}>{value}</Text>
    </View>
  )
}

function Card({ children, style }) {
  return (
    <View style={[{ backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 }, style]}>
      {children}
    </View>
  )
}

function Label({ children }) {
  return <Text style={{ fontSize:10, color:C.low, fontFamily:'DMMono_500Medium', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>{children}</Text>
}

export default function HomeScreen() {
  const router = useRouter()
  const [worker,    setWorker]    = useState(null)
  const [disruption,setDisruption]= useState(null)
  const [refreshing,setRefreshing]= useState(false)
  const [error,     setError]     = useState(null)

  const load = useCallback(async () => {
    try {
      const id  = await SecureStore.getItemAsync('worker_id')
      if (!id) { router.replace('/'); return }
      const [w, d] = await Promise.all([
        refreshProfile(id),
        getActiveDisruption().catch(() => null),
      ])
      setWorker(w)
      if (d && d.zone === w.zone) setDisruption(d)
      else setDisruption(null)
      await SecureStore.setItemAsync('worker_data', JSON.stringify(w))
    } catch (e) {
      // Try cached data
      const cached = await SecureStore.getItemAsync('worker_data')
      if (cached) setWorker(JSON.parse(cached))
      else setError('Unable to connect. Check your network.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('worker_id')
    await SecureStore.deleteItemAsync('worker_data')
    router.replace('/')
  }

  if (!worker && !error) return (
    <View style={{ flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' }}>
      <Text style={{ color:C.low, fontFamily:'DMMono_500Medium', fontSize:12 }}>Loading your profile…</Text>
    </View>
  )

  if (error && !worker) return (
    <View style={{ flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center', padding:32 }}>
      <Text style={{ color:C.red, fontFamily:'DMSans_400Regular', textAlign:'center' }}>{error}</Text>
    </View>
  )

  const sess      = worker.current_session || {}
  const isActive  = sess.status === 'active'
  const day       = sess.day_of_week || 'monday'
  const todayBase = worker.baseline_income?.[day] || 0
  const hourly    = todayBase / 9
  const earnedSoFar = Math.round(hourly * ((sess.active_minutes_so_far || 0) / 60))
  const pct         = todayBase > 0 ? Math.round((earnedSoFar / todayBase) * 100) : 0

  const eligColors = { full:C.green, partial:C.blue, limited:C.amber, not_eligible:C.low }
  const eligLabels = { full:'Full Coverage', partial:'Partial', limited:'Limited', not_eligible:'Ineligible' }
  const planTier   = worker.insurance_plan?.plan_tier || 'basic'
  const pColor     = planColor(planTier)

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue}/>}
        contentContainerStyle={{ paddingBottom:100 }}>

        {/* Header */}
        <LinearGradient colors={['#0D1420','#05070C']}
          style={{ paddingHorizontal:20, paddingTop:20, paddingBottom:20 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <View>
              <Text style={{ fontSize:13, color:C.low, fontFamily:'DMMono_500Medium' }}>Good shift,</Text>
              <Text style={{ fontSize:24, color:C.hi, fontFamily:'DMSans_700Bold' }}>{worker.name.split(' ')[0]}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout}
              style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:999, borderWidth:1, borderColor:C.border, backgroundColor:'rgba(255,255,255,0.04)' }}>
              <Text style={{ fontSize:12, color:C.mid, fontFamily:'DMMono_500Medium' }}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Shift status */}
          <View style={{
            backgroundColor: isActive ? 'rgba(35,209,139,0.08)' : 'rgba(255,255,255,0.04)',
            borderRadius:16, borderWidth:1,
            borderColor: isActive ? 'rgba(35,209,139,0.25)' : C.border,
            padding:16,
          }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 }}>
              <View style={{ width:8, height:8, borderRadius:4, backgroundColor: isActive ? C.green : C.low }}/>
              <Text style={{ fontSize:11, fontFamily:'DMMono_500Medium', textTransform:'uppercase', letterSpacing:1.2, color: isActive ? C.green : C.mid }}>
                {isActive ? 'Shift Active' : 'Not on Shift'}
              </Text>
              <Text style={{ fontSize:11, color:C.low, fontFamily:'DMMono_500Medium', marginLeft:'auto' }}>
                {sess.shift_start}–{sess.shift_end}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={{ marginBottom:12 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                <Text style={{ fontSize:11, color:C.low, fontFamily:'DMMono_500Medium' }}>Today's earnings</Text>
                <Text style={{ fontSize:11, color:C.mid, fontFamily:'DMMono_500Medium' }}>{pct}% of baseline</Text>
              </View>
              <View style={{ height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                <View style={{ width:`${Math.min(pct,100)}%`, height:'100%', borderRadius:2, backgroundColor: isActive ? C.green : C.low }}/>
              </View>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:6 }}>
                <Text style={{ fontSize:18, color: isActive ? C.green : C.hi, fontFamily:'DMMono_500Medium', fontWeight:'700' }}>
                  {fmt(earnedSoFar)}
                </Text>
                <Text style={{ fontSize:13, color:C.low, fontFamily:'DMMono_500Medium', alignSelf:'flex-end' }}>
                  of {fmt(todayBase)} baseline
                </Text>
              </View>
            </View>

            <View style={{ flexDirection:'row', gap:8 }}>
              <View style={{ flex:1, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, padding:10, alignItems:'center' }}>
                <Text style={{ fontSize:14, color:C.hi, fontFamily:'DMSans_700Bold' }}>{worker.zone}</Text>
                <Text style={{ fontSize:10, color:C.low, fontFamily:'DMMono_500Medium', marginTop:2 }}>Zone</Text>
              </View>
              <View style={{ flex:1, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, padding:10, alignItems:'center' }}>
                <Text style={{ fontSize:14, color:C.hi, fontFamily:'DMSans_700Bold' }}>{worker.city}</Text>
                <Text style={{ fontSize:10, color:C.low, fontFamily:'DMMono_500Medium', marginTop:2 }}>City</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal:20, paddingTop:12 }}>

          {/* Active disruption banner */}
          {disruption && (
            <View style={{
              backgroundColor:'rgba(245,83,45,0.08)', borderRadius:16,
              borderWidth:1, borderColor:'rgba(245,83,45,0.3)', padding:16, marginBottom:12,
            }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:C.red }}/>
                <Text style={{ fontSize:11, color:C.red, fontFamily:'DMMono_500Medium', textTransform:'uppercase', letterSpacing:1 }}>
                  Active Disruption · Your Zone
                </Text>
              </View>
              <Text style={{ fontSize:15, color:C.hi, fontFamily:'DMSans_700Bold', marginBottom:2 }}>
                {disruptionLabel(disruption.type).icon} {disruptionLabel(disruption.type).label}
              </Text>
              <Text style={{ fontSize:12, color:C.mid, fontFamily:'DMSans_400Regular', marginBottom:8 }}>
                {disruption.startTime}–{disruption.endTime} · {disruption.zone}
              </Text>
              <View style={{ backgroundColor:'rgba(255,255,255,0.06)', borderRadius:8, padding:10 }}>
                <Text style={{ fontSize:12, color:C.mid, fontFamily:'DMSans_400Regular', lineHeight:18 }}>
                  Your income protection is active. If your earnings are affected, a payout will be calculated and sent to your UPI after the disruption ends.
                </Text>
              </View>
            </View>
          )}

          {/* Coverage card */}
          <Card>
            <Label>Your Coverage</Label>
            <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:12 }}>
              <View style={{
                paddingHorizontal:12, paddingVertical:6, borderRadius:10,
                backgroundColor:pColor+'15', borderWidth:1, borderColor:pColor+'35',
              }}>
                <Text style={{ fontSize:13, color:pColor, fontFamily:'DMMono_500Medium', fontWeight:'600', textTransform:'uppercase' }}>
                  {planTier}
                </Text>
              </View>
              <View style={{
                paddingHorizontal:10, paddingVertical:4, borderRadius:10,
                backgroundColor:eligColors[worker.eligibility_tier]+'12',
                borderWidth:1, borderColor:eligColors[worker.eligibility_tier]+'30',
              }}>
                <Text style={{ fontSize:12, color:eligColors[worker.eligibility_tier], fontFamily:'DMMono_500Medium' }}>
                  {eligLabels[worker.eligibility_tier]}
                </Text>
              </View>
            </View>
            <Row label="Weekly Premium" value={fmt(worker.premium.weekly_premium)} color={C.blue}/>
            <Row label="Coverage Rate"  value={`${Math.round((worker.insurance_plan?.adjusted_coverage||0)*100)}%`} color={C.green}/>
            <Row label="Store"          value={worker.primary_store_id}/>
            <Row label="Member Since"   value={`${worker.months_of_service} months`}/>
          </Card>

          {/* What your plan covers */}
          <Card>
            <Label>What Your Plan Covers</Label>
            {[
              { icon:'🌧', title:'Rainfall Disruption',    desc:'Heavy rain affecting delivery routes' },
              { icon:'⚡', title:'Store Outage',           desc:'Dark store power or system failure'   },
              { icon:'🚧', title:'Area Disruption',        desc:'Strikes, protests, road closures'     },
              { icon:'🌡', title:'AQI / Heat Alert',       desc:'Extreme weather conditions'           },
            ].map(item => (
              <View key={item.title} style={{ flexDirection:'row', gap:12, marginBottom:12, alignItems:'flex-start' }}>
                <Text style={{ fontSize:20 }}>{item.icon}</Text>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:13, color:C.hi, fontFamily:'DMSans_500Medium' }}>{item.title}</Text>
                  <Text style={{ fontSize:11, color:C.low, fontFamily:'DMSans_400Regular', marginTop:1 }}>{item.desc}</Text>
                </View>
                <Text style={{ fontSize:14, color:C.green }}>✓</Text>
              </View>
            ))}
            <View style={{ backgroundColor:'rgba(79,142,247,0.08)', borderRadius:10, padding:10, marginTop:4 }}>
              <Text style={{ fontSize:12, color:C.mid, fontFamily:'DMSans_400Regular', lineHeight:18 }}>
                Payouts are automatic — no claims needed. If a verified disruption affects your zone while you're on shift, your payout is calculated and transferred to your UPI within hours.
              </Text>
            </View>
          </Card>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
