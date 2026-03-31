'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import SystemClock from '@/components/SystemClock'
import DisruptionForm from '@/components/DisruptionForm'
import ActiveDisruptionPanel from '@/components/ActiveDisruptionPanel'
import ValidationQueuedPanel from '@/components/ValidationQueuedPanel'
import { parseTime, formatTime } from '@/lib/data'
import { Zap } from 'lucide-react'

const StoreMap = dynamic(() => import('@/components/StoreMap'), { ssr: false })

const BACKEND = 'http://localhost:3002'

export default function DisruptionPage() {
  const [selectedStore,   setSelectedStore]   = useState(null)
  const [panelMode,       setPanelMode]       = useState('idle')
  const [scheduledEvent,  setScheduledEvent]  = useState(null)
  const [activeEvent,     setActiveEvent]     = useState(null)
  const [endedEvent,      setEndedEvent]      = useState(null)
  const [systemMinutes,   setSystemMinutes]   = useState(parseTime('08:00'))
  const [triggered,       setTriggered]       = useState(false)
  const [ending,          setEnding]          = useState(false)

  const handleStoreClick = (store) => {
    if (activeEvent && activeEvent.store.store_id === store.store_id) return
    setSelectedStore(store)
    setPanelMode('form')
  }

  const handleSchedule = async ({ type, params, startTime, endTime, durationHours, severity }) => {
    if (!selectedStore) return
    try {
      // 1. get affected workers from dataset API
      const simRes = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStore.store_id, type, params, startTime, durationHours }),
      })
      const simData = await simRes.json()
      if (!simData.success) return

      const startMins = parseTime(startTime)
      const endMins   = startMins + durationHours * 60

      // 2. register disruption in backend
      const backendRes = await fetch(`${BACKEND}/api/disruptions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId:           selectedStore.store_id,
          storeName:         selectedStore.name,
          zone:              selectedStore.zone,
          city:              selectedStore.city,
          type, params, severity,
          startTime, endTime, durationHours,
          startMinutes:      startMins,
          endMinutes:        endMins,
          affectedWorkerIds: simData.event.affected_worker_ids || [],
          affectedTotal:     simData.affected.total,
          affectedActive:    simData.affected.active,
        }),
      })
      const backendData = await backendRes.json()

      const event = {
        backendId: backendData.disruption?.id,
        store:     selectedStore,
        type, params, severity,
        startTime, endTime, durationHours,
        startMinutes: startMins,
        endMinutes:   endMins,
        affected:     simData.affected,
        status:       'scheduled',
      }

      setScheduledEvent(event)
      setPanelMode('scheduled')
      setTriggered(false)
    } catch (err) {
      console.error('Schedule failed:', err)
    }
  }

  // Watch clock — auto-activate and auto-end
  const handleTick = useCallback(async (mins) => {
    setSystemMinutes(mins)

    // Auto-activate
    if (scheduledEvent && panelMode === 'scheduled' && !triggered) {
      if (mins >= scheduledEvent.startMinutes) {
        setTriggered(true)
        try {
          await fetch(`${BACKEND}/api/disruptions/${scheduledEvent.backendId}/activate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
          })
        } catch {}
        setActiveEvent({ ...scheduledEvent, status: 'active' })
        setPanelMode('active')
        setScheduledEvent(null)
      }
    }

    // Auto-end
    if (activeEvent && panelMode === 'active' && !ending) {
      if (mins >= activeEvent.endMinutes) {
        setEnding(true)
        handleDisruptionEnd(activeEvent)
      }
    }
  }, [scheduledEvent, panelMode, triggered, activeEvent, ending])

  const handleDisruptionEnd = async (event) => {
    try {
      await fetch(`${BACKEND}/api/disruptions/${event.backendId}/end`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      })
    } catch {}
    setEndedEvent(event)
    setActiveEvent(null)
    setPanelMode('ended')
    setEnding(false)
  }

  const handleClose = () => {
    setSelectedStore(null)
    setPanelMode('idle')
  }

  const handleNewDisruption = () => {
    setEndedEvent(null)
    setSelectedStore(null)
    setPanelMode('idle')
    setTriggered(false)
    setEnding(false)
  }

  const isDisruptionActive = panelMode === 'active'
  const sideOpen = panelMode !== 'idle'

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#080A0F]">

      {/* Top bar */}
      <header className="shrink-0 h-12 flex items-center justify-between px-5
                         border-b border-white/6 bg-[#0D1117]/80 backdrop-blur-sm z-50">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L11 6L6 11L1 6L6 1Z" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="font-display font-bold text-white text-sm tracking-tight">Arovy</span>
          <span className="text-white/20 text-sm">·</span>
          <span className="text-white/40 text-xs font-mono">Disruption Panel</span>
        </div>

        <div className="flex items-center gap-4">
          {isDisruptionActive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                            bg-red-500/10 border border-red-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>
              <span className="text-[11px] font-mono text-red-400">
                {activeEvent?.store?.zone} disruption active
              </span>
            </div>
          )}
          <span className="text-[11px] font-mono text-white/25">
            {formatTime(systemMinutes)}
          </span>
          <a href="http://localhost:3001" target="_blank"
            className="text-[11px] font-mono text-blue-400/60 hover:text-blue-400 transition-colors">
            Admin Dashboard →
          </a>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Map */}
        <div className={`relative transition-all duration-500 ${sideOpen ? 'flex-1' : 'w-full'}`}>
          <StoreMap
            onStoreClick={handleStoreClick}
            activeEvent={activeEvent}
            scheduledStoreId={scheduledEvent?.store?.store_id}
          />

          {/* Clock overlay */}
          <div className="absolute bottom-5 left-5 z-[1000] w-64">
            <SystemClock
              onTick={handleTick}
              scheduledStart={scheduledEvent?.startTime || activeEvent?.startTime}
              scheduledEnd={scheduledEvent?.endTime || activeEvent?.endTime}
              disruptionActive={isDisruptionActive}
            />
          </div>

          {/* Legend */}
          <div className="absolute bottom-5 right-5 z-[1000] bg-[#0D1117]/90
                          border border-white/8 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-2">Cities</p>
            {[
              { name:'Chennai',   color:'#3B82F6' },
              { name:'Bangalore', color:'#10B981' },
              { name:'Hyderabad', color:'#F59E0B' },
            ].map(c => (
              <div key={c.name} className="flex items-center gap-2 mb-1 last:mb-0">
                <div className="w-2 h-2 rounded-full" style={{ background:c.color }}/>
                <span className="text-[11px] text-white/45">{c.name}</span>
              </div>
            ))}
            <div className="border-t border-white/6 mt-2 pt-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
              <span className="text-[11px] text-white/45">Active disruption</span>
            </div>
          </div>

          {panelMode === 'idle' && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1000]
                            bg-[#0D1117]/80 border border-white/10 backdrop-blur-sm
                            rounded-full px-4 py-2 pointer-events-none">
              <p className="text-xs text-white/40 font-mono">
                Click a store pin to configure a disruption
              </p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className={`shrink-0 transition-all duration-500 overflow-hidden
                         border-l border-white/6 bg-[#0D1117]
                         ${sideOpen ? 'w-80' : 'w-0'}`}>
          {sideOpen && (
            <div className="w-80 h-full flex flex-col">

              {panelMode === 'form' && selectedStore && (
                <DisruptionForm
                  store={selectedStore}
                  onSchedule={handleSchedule}
                  onClose={handleClose}
                />
              )}

              {panelMode === 'scheduled' && scheduledEvent && (
                <div className="flex flex-col h-full">
                  <div className="p-5 border-b border-white/6 flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">
                      Scheduled
                    </span>
                    <button onClick={handleClose}
                      className="text-white/25 hover:text-white/60 text-xs transition-colors">✕</button>
                  </div>
                  <div className="flex-1 p-5">
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-950/10 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"/>
                        <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">
                          Awaiting Trigger Time
                        </span>
                      </div>
                      <p className="font-display font-semibold text-white mb-1">
                        {scheduledEvent.store.name}
                      </p>
                      <p className="text-xs text-white/40 mb-4">{scheduledEvent.store.zone}</p>
                      <div className="space-y-2 text-xs font-mono">
                        {[
                          ['Type',     scheduledEvent.type.replace(/_/g,' ')],
                          ['Severity', scheduledEvent.severity],
                          ['Start',    scheduledEvent.startTime],
                          ['End',      scheduledEvent.endTime],
                          ['Workers',  scheduledEvent.affected.total],
                        ].map(([k,v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-white/35">{k}</span>
                            <span className={k === 'Start' ? 'text-amber-400' : 'text-white/70'}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-amber-400/50 font-mono mt-4 text-center">
                        Auto-triggers at {scheduledEvent.startTime} · visible in Admin Dashboard
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {panelMode === 'active' && activeEvent && (
                <div className="flex flex-col h-full">
                  <div className="p-5 border-b border-white/6">
                    <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase">Live</span>
                  </div>
                  <div className="flex-1 p-5">
                    <ActiveDisruptionPanel
                      event={activeEvent}
                      systemMinutes={systemMinutes}
                      onEnd={() => handleDisruptionEnd(activeEvent)}
                    />
                  </div>
                </div>
              )}

              {panelMode === 'ended' && endedEvent && (
                <div className="flex flex-col h-full">
                  <div className="p-5 border-b border-white/6">
                    <span className="text-[10px] font-mono tracking-widest text-green-400 uppercase">
                      Completed
                    </span>
                  </div>
                  <div className="flex-1 p-5">
                    <ValidationQueuedPanel event={endedEvent}/>
                  </div>
                  <div className="p-5 border-t border-white/6">
                    <button onClick={handleNewDisruption}
                      className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/8
                                 text-white/60 hover:text-white text-sm font-medium
                                 border border-white/8 transition-all">
                      Configure New Disruption
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
