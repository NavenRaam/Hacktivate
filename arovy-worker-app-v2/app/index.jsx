import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform,
  Animated, ActivityIndicator, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as SecureStore from 'expo-secure-store'
import { login } from '../src/lib/api'
import { C } from '../src/lib/theme'

export default function LoginScreen() {
  const router   = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const shake = useRef(new Animated.Value(0)).current

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue:10, duration:50, useNativeDriver:true }),
      Animated.timing(shake, { toValue:-10,duration:50, useNativeDriver:true }),
      Animated.timing(shake, { toValue:6,  duration:50, useNativeDriver:true }),
      Animated.timing(shake, { toValue:0,  duration:50, useNativeDriver:true }),
    ]).start()
  }

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your Worker ID and password.')
      doShake(); return
    }
    setLoading(true); setError('')
    try {
      console.log({ username, password });
      const res = await login(username.trim(), password.trim())
      await SecureStore.setItemAsync('worker_id', res.worker.worker_id)
      await SecureStore.setItemAsync('worker_data', JSON.stringify(res.worker))
      router.replace('/(app)/home')
    } catch (e) {
      setError('Invalid Worker ID or password. Try again.')
      doShake()
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <KeyboardAvoidingView
        style={{ flex:1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ flexGrow:1, justifyContent:'center', padding:28 }}
          keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={{ alignItems:'center', marginBottom:48 }}>
            <LinearGradient
              colors={['#4F8EF7','#8B7FED']}
              style={{ width:64, height:64, borderRadius:18, alignItems:'center', justifyContent:'center', marginBottom:16 }}>
              <Text style={{ fontSize:28, color:'#fff', fontWeight:'800' }}>▲</Text>
            </LinearGradient>
            <Text style={{ fontSize:28, color:C.hi, fontFamily:'DMSans_700Bold', letterSpacing:-0.5 }}>
              Arovy
            </Text>
            <Text style={{ fontSize:13, color:C.low, fontFamily:'DMMono_500Medium', marginTop:4 }}>
              Income Protection · Worker Portal
            </Text>
          </View>

          {/* Card */}
          <Animated.View style={{ transform:[{ translateX:shake }] }}>
            <View style={{
              backgroundColor:C.card, borderRadius:20,
              borderWidth:1, borderColor:C.border, padding:24,
            }}>
              <Text style={{ fontSize:18, color:C.hi, fontFamily:'DMSans_700Bold', marginBottom:4 }}>
                Sign In
              </Text>
              <Text style={{ fontSize:13, color:C.low, fontFamily:'DMSans_400Regular', marginBottom:24 }}>
                Use your Worker ID and the password sent by your store manager.
              </Text>

              {/* Worker ID */}
              <Text style={{ fontSize:11, color:C.mid, fontFamily:'DMMono_500Medium', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>
                Worker ID
              </Text>
              <TextInput
                value={username}
                onChangeText={t => { setUsername(t); setError('') }}
                placeholder="e.g. WK-001"
                placeholderTextColor={C.muted}
                autoCapitalize="characters"
                style={{
                  backgroundColor:'rgba(255,255,255,0.05)',
                  borderWidth:1, borderColor: username ? C.blue+'50' : C.border,
                  borderRadius:12, padding:14, color:C.hi,
                  fontFamily:'DMMono_500Medium', fontSize:15,
                  marginBottom:16,
                }}
              />

              {/* Password */}
              <Text style={{ fontSize:11, color:C.mid, fontFamily:'DMMono_500Medium', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={t => { setPassword(t); setError('') }}
                placeholder="firstname@123"
                placeholderTextColor={C.muted}
                secureTextEntry
                style={{
                  backgroundColor:'rgba(255,255,255,0.05)',
                  borderWidth:1, borderColor: password ? C.blue+'50' : C.border,
                  borderRadius:12, padding:14, color:C.hi,
                  fontFamily:'DMMono_500Medium', fontSize:15,
                  marginBottom: error ? 12 : 24,
                }}
              />

              {/* Error */}
              {!!error && (
                <View style={{
                  backgroundColor:'rgba(245,83,45,0.10)',
                  borderWidth:1, borderColor:'rgba(245,83,45,0.25)',
                  borderRadius:10, padding:10, marginBottom:16,
                }}>
                  <Text style={{ fontSize:13, color:C.red, fontFamily:'DMSans_400Regular' }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
                style={{ borderRadius:14, overflow:'hidden' }}>
                <LinearGradient
                  colors={loading ? ['#2a3a55','#2a3a55'] : ['#4F8EF7','#3b7ef0']}
                  style={{ paddingVertical:16, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:8 }}>
                  {loading
                    ? <ActivityIndicator color="#fff" size="small"/>
                    : <Text style={{ color:'#fff', fontFamily:'DMSans_700Bold', fontSize:15 }}>Sign In</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Hint */}
          <Text style={{ textAlign:'center', fontSize:12, color:C.muted, fontFamily:'DMMono_400Regular', marginTop:24 }}>
            Forgot your password? Contact your store manager.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
