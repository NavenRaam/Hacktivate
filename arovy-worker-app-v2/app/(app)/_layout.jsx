import { Tabs, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { C } from '../../src/lib/theme'
import { View } from 'react-native'

function TabIcon({ color, size, focused, shape }) {
  const s = focused ? size * 0.55 : size * 0.45
  const styles = {
    circle: { width:s, height:s, borderRadius:s/2, backgroundColor:color, opacity:focused?1:0.45 },
    square: { width:s, height:s, borderRadius:s*0.2, backgroundColor:color, opacity:focused?1:0.45 },
    diamond:{ width:s, height:s, borderRadius:2, backgroundColor:color, transform:[{rotate:'45deg'}], opacity:focused?1:0.45 },
  }
  return <View style={styles[shape] || styles.circle}/>
}

export default function AppLayout() {
  const router  = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    SecureStore.getItemAsync('worker_id').then(id => {
      if (!id) router.replace('/')
      else setReady(true)
    })
  }, [])

  if (!ready) return null

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor:  C.surface,
        borderTopColor:   C.border,
        borderTopWidth:   1,
        height:           68,
        paddingBottom:    10,
        paddingTop:       8,
      },
      tabBarActiveTintColor:   C.blue,
      tabBarInactiveTintColor: C.muted,
      tabBarLabelStyle:        { fontFamily:'DMMono_500Medium', fontSize:10 },
    }}>
      <Tabs.Screen name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => <TabIcon color={color} size={size} focused={focused} shape="square"/>,
        }}/>
      <Tabs.Screen name="payouts"
        options={{
          title: 'Payouts',
          tabBarIcon: ({ color, size, focused }) => <TabIcon color={color} size={size} focused={focused} shape="diamond"/>,
        }}/>
      <Tabs.Screen name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => <TabIcon color={color} size={size} focused={focused} shape="circle"/>,
        }}/>
    </Tabs>
  )
}
