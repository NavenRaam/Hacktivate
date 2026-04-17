import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  SafeAreaView, TouchableOpacity, Modal, Pressable,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { getAllDisruptions } from '../../src/lib/api'
import { C, fmt, payoutStatusColor, payoutStatusLabel, rejectionReason, disruptionLabel } from '../../src/lib/theme'

function StatusPill({ status }) {
  const color = payoutStatusColor(status)
  return (
    <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:999, backgroundColor:color+'15', borderWidth:1, borderColor:color+'35' }}>
      <Text style={{ fontSize:10, color, fontFamily:'DMMono_500Medium', fontWeight:'600' }}>
        {payoutStatusLabel(status)}
      </Text>
    </View>
  )
}

function PayoutCard({ item, onPress }) {
  const dl    = disruptionLabel(item.type)
  const color = payoutStatusColor(item.payoutStatus)
  const hasPay= item.payoutAmount > 0

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={{
        backgroundColor:C.card, borderRadius:16, borderWidth:1,
        borderColor:C.border, padding:16, marginBottom:10,
      }}>
      <View style={{ flexDirection:'row', alignItems:'flex-start', gap:12 }}>
        <View style={{ width:42, height:42, borderRadius:12, backgroundColor:'rgba(255,255,255,0.06)', alignItems:'center', justifyContent:'center' }}>
          <Text style={{ fontSize:20 }}>{dl.icon}</Text>
        </View>
        <View style={{ flex:1 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
            <Text style={{ fontSize:14, color:C.hi, fontFamily:'DMSans_500Medium', flex:1 }}>{dl.label}</Text>
            {hasPay
              ? <Text style={{ fontSize:16, color:C.green, fontFamily:'DMMono_500Medium', fontWeight:'700' }}>{fmt(item.payoutAmount)}</Text>
              : <Text style={{ fontSize:14, color:C.muted, fontFamily:'DMMono_500Medium' }}>—</Text>
            }
          </View>
          <Text style={{ fontSize:11, color:C.low, fontFamily:'DMMono_500Medium', marginBottom:8 }}>
            {item.zone} · {item.startTime}–{item.endTime}
          </Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <StatusPill status={item.payoutStatus}/>
            {item.razorpay?.final_status === 'success' && (
              <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:999, backgroundColor:'rgba(35,209,139,0.1)', borderWidth:1, borderColor:'rgba(35,209,139,0.25)' }}>
                <Text style={{ fontSize:10, color:C.green, fontFamily:'DMMono_500Medium' }}>Transferred</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function DetailModal({ item, onClose }) {
  if (!item) return null
  const dl     = disruptionLabel(item.type)
  const reason = rejectionReason(item.flags || [], item.verdict)
  const hasPay = item.payoutAmount > 0

  return (
    <Modal visible animationType="slide" transparent presentationStyle="overFullScreen">
      <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.7)' }} onPress={onClose}/>
      <View style={{
        position:'absolute', bottom:0, left:0, right:0,
        backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24,
        padding:24, paddingBottom:40,
      }}>
        {/* Handle */}
        <View style={{ width:40, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:20 }}/>

        <View style={{ alignItems:'center', marginBottom:20 }}>
          <Text style={{ fontSize:36, marginBottom:8 }}>{dl.icon}</Text>
          <Text style={{ fontSize:18, color:C.hi, fontFamily:'DMSans_700Bold', marginBottom:4 }}>{dl.label}</Text>
          <Text style={{ fontSize:12, color:C.low, fontFamily:'DMMono_500Medium' }}>{item.zone} · {item.startTime}</Text>
        </View>

        {/* Payout amount */}
        <View style={{
          backgroundColor: hasPay ? 'rgba(35,209,139,0.08)' : 'rgba(255,255,255,0.04)',
          borderRadius:16, borderWidth:1,
          borderColor: hasPay ? 'rgba(35,209,139,0.2)' : C.border,
          padding:16, alignItems:'center', marginBottom:16,
        }}>
          <Text style={{ fontSize:36, color:hasPay?C.green:C.muted, fontFamily:'DMMono_500Medium', fontWeight:'700' }}>
            {hasPay ? fmt(item.payoutAmount) : '₹0'}
          </Text>
          <StatusPill status={item.payoutStatus}/>
        </View>

        {/* Reason if rejected */}
        {reason && (
          <View style={{
            backgroundColor:'rgba(245,83,45,0.08)', borderRadius:12,
            borderWidth:1, borderColor:'rgba(245,83,45,0.2)',
            padding:14, marginBottom:16,
          }}>
            <Text style={{ fontSize:11, color:C.red, fontFamily:'DMMono_500Medium', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              Why this was rejected
            </Text>
            <Text style={{ fontSize:13, color:C.mid, fontFamily:'DMSans_400Regular', lineHeight:20 }}>
              {reason}
            </Text>
          </View>
        )}

        {/* Transfer detail */}
        {item.razorpay?.final_status === 'success' && (
          <View style={{ flexDirection:'row', justifyContent:'space-between', padding:12, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, marginBottom:16 }}>
            <Text style={{ fontSize:12, color:C.low, fontFamily:'DMMono_500Medium' }}>UPI Transfer</Text>
            <Text style={{ fontSize:12, color:C.green, fontFamily:'DMMono_500Medium' }}>
              {item.razorpay.razorpay_payout_id?.slice(0,16)}…
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={onClose}
          style={{ backgroundColor:'rgba(255,255,255,0.08)', borderRadius:14, padding:14, alignItems:'center' }}>
          <Text style={{ color:C.mid, fontFamily:'DMSans_500Medium', fontSize:14 }}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

export default function PayoutsScreen() {
  const [items,     setItems]    = useState([])
  const [selected,  setSelected] = useState(null)
  const [refreshing,setRefreshing]=useState(false)
  const [filter,    setFilter]   = useState('all')

  const load = useCallback(async () => {
    try {
      const id  = await SecureStore.getItemAsync('worker_id')
      const all = await getAllDisruptions()

      const myPayouts = all
        .filter(d => d.status === 'completed' && d.validationResults?.length)
        .flatMap(d => {
          const myResult = (d.validationResults || []).find(r =>
            (r.worker_id||r.workerId) === id
          )
          if (!myResult) return []
          return [{
            id:           d.id,
            type:         d.type,
            zone:         d.zone,
            startTime:    d.startTime,
            endTime:      d.endTime,
            severity:     d.severity,
            payoutAmount: myResult.outcome?.payout_amount || 0,
            payoutStatus: myResult.outcome?.payout_status || 'unknown',
            verdict:      myResult.fraud?.verdict || 'unknown',
            flags:        myResult.fraud?.flags || [],
            notification: myResult.outcome?.notification_message || '',
            razorpay:     myResult.razorpay || null,
            completedAt:  d.endedAt,
          }]
        })
        .sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt))

      setItems(myPayouts)
    } catch (e) {
      console.warn('Payouts load error:', e.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const filtered = items.filter(i => {
    if (filter === 'approved') return i.payoutStatus === 'approved'
    if (filter === 'partial')  return i.payoutStatus === 'partial_approved'
    if (filter === 'rejected') return ['blocked','not_applicable'].includes(i.payoutStatus)
    return true
  })

  const total = items.filter(i=>i.payoutAmount>0).reduce((s,i)=>s+i.payoutAmount,0)

  const FILTERS = [
    { key:'all',      label:'All'      },
    { key:'approved', label:'Approved' },
    { key:'partial',  label:'Partial'  },
    { key:'rejected', label:'Rejected' },
  ]

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue}/>}
        contentContainerStyle={{ paddingBottom:100 }}>

        <View style={{ paddingHorizontal:20, paddingTop:20, paddingBottom:12 }}>
          <Text style={{ fontSize:26, color:C.hi, fontFamily:'DMSans_700Bold' }}>Payouts</Text>
          <Text style={{ fontSize:13, color:C.low, fontFamily:'DMSans_400Regular', marginTop:2 }}>
            {items.length} events recorded
          </Text>

          {/* Summary */}
          <View style={{ flexDirection:'row', gap:10, marginTop:16, backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:14 }}>
            {[
              { label:'Total Received', value:fmt(total),                                    color:C.green },
              { label:'Approved',       value:items.filter(i=>i.payoutStatus==='approved').length, color:C.green },
              { label:'Rejected',       value:items.filter(i=>['blocked','not_applicable'].includes(i.payoutStatus)).length, color:C.red },
            ].map(s => (
              <View key={s.label} style={{ flex:1, alignItems:'center' }}>
                <Text style={{ fontSize:17, color:s.color, fontFamily:'DMMono_500Medium', fontWeight:'700' }}>{s.value}</Text>
                <Text style={{ fontSize:10, color:C.low, fontFamily:'DMMono_500Medium', marginTop:2 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Filters */}
          <View style={{ flexDirection:'row', gap:8, marginTop:12 }}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
                style={{
                  paddingHorizontal:12, paddingVertical:6, borderRadius:999,
                  backgroundColor: filter===f.key ? C.blue+'20' : 'rgba(255,255,255,0.05)',
                  borderWidth:1, borderColor: filter===f.key ? C.blue+'50' : C.border,
                }}>
                <Text style={{ fontSize:12, fontFamily:'DMMono_500Medium', color:filter===f.key?C.blue:C.mid }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal:20 }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems:'center', marginTop:60 }}>
              <Text style={{ fontSize:36, marginBottom:12 }}>📭</Text>
              <Text style={{ fontSize:14, color:C.mid, fontFamily:'DMSans_400Regular' }}>No payouts yet</Text>
              <Text style={{ fontSize:12, color:C.muted, fontFamily:'DMSans_400Regular', marginTop:4 }}>
                Payouts appear here after a disruption in your zone is processed.
              </Text>
            </View>
          ) : filtered.map(item => (
            <PayoutCard key={item.id} item={item} onPress={() => setSelected(item)}/>
          ))}
        </View>
      </ScrollView>

      <DetailModal item={selected} onClose={() => setSelected(null)}/>
    </SafeAreaView>
  )
}
