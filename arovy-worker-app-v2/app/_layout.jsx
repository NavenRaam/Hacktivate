import { Stack } from 'expo-router'
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono'
import { View, ActivityIndicator } from 'react-native'
import { C } from '../src/lib/theme'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  const [loaded] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
    DMMono_400Regular, DMMono_500Medium,
  })

  if (!loaded) return (
    <View style={{ flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator color={C.blue} size="large"/>
    </View>
  )

  return (
    <>
      <StatusBar style="light"/>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="index"/>
        <Stack.Screen name="(app)"/>
      </Stack>
    </>
  )
}
