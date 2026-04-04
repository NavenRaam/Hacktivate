'use client'
import { useState } from 'react'
import {
  CheckCircle2, XCircle, AlertCircle, MinusCircle,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import TrustRing from '@/components/shared/TrustRing'

// ─── Verdict icon ────────────────────────────────────────
function VerdictIcon({ verdict, size = 14 }) {
  const map = {
    clean:      <CheckCircle2 size={size} color="#23D18B"/>,
    partial:    <AlertCircle  size={size} color="#F5A623"/>,
    suspicious: <AlertCircle  size={size} color="#F97316"/>,
    blocked:    <XCircle      size={size} color="#F5532D"/>,
    ineligible: <MinusCircle  size={size} color="#6B7280"/>,
  }
  return map[verdict] || map.ineligible
}

// ─── Check row ───────────────────────────────────────────
function CheckRow({ check }) {
  const passColor = check.pass ? '#23D18B' : '#F5532D'
  const passBg    = check.pass ? 'rgba(35,209,139,0.06)' : 'rgba(245,83,45,0.06)'
  const passBorder= check.pass ? 'rgba(35,209,139,0.15)' : 'rgba(245,83,45,0.15)'

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'20px 1fr 140px',
      alignItems:'start',
      gap:'10px',
      padding:'8px 12px',
      borderRadius:'8px',
      background: passBg,
      border:`1px solid ${passBorder}`,
      marginBottom:'4px',
    }}>
      {/* Pass/fail icon */}
      <div style={{ paddingTop:'1px' }}>
        {check.pass
          ? <CheckCircle2 size={13} color="#23D18B"/>
          : <XCircle      size={13} color="#F5532D"/>}
      </div>

      {/* Label + explanation */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px' }}>
          <span style={{ fontSize:'12px', color:'rgba(238,242,255,0.9)', fontWeight:'500' }}>
            {check.label}
          </span>
          <span style={{
            fontSize:'10px', color:'rgba(238,242,255,0.35)',
            fontFamily:'IBM Plex Mono', textTransform:'uppercase', letterSpacing:'0.5px',
          }}>
            {check.category}
          </span>
        </div>
        <span style={{ fontSize:'11px', color:'rgba(238,242,255,0.5)', lineHeight:'1.4' }}>
          {check.explanation}
        </span>
      </div>

      {/* Actual value */}
      <div style={{ textAlign:'right' }}>
        <span style={{
          fontSize:'11px', color:passColor,
          fontFamily:'IBM Plex Mono', fontWeight:'500',
        }}>
          {check.actual}
        </span>
        <div style={{ fontSize:'10px', color:'rgba(238,242,255,0.3)', marginTop:'1px' }}>
          {check.threshold}
        </div>
      </div>
    </div>
  )
}

// ─── Formula step row ────────────────────────────────────
function FormulaRow({ step, isLast }) {
  const isFinal = step.step === 10
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'24px 1fr auto',
      alignItems:'start',
      gap:'10px',
      padding:'7px 0',
      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Step number */}
      <div style={{
        width:'20px', height:'20px', borderRadius:'50%',
        background: isFinal ? 'rgba(35,209,139,0.2)' : 'rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0, marginTop:'1px',
      }}>
        <span style={{
          fontSize:'9px', fontFamily:'IBM Plex Mono', fontWeight:'600',
          color: isFinal ? '#23D18B' : 'rgba(238,242,255,0.4)',
        }}>
          {step.step}
        </span>
      </div>

      {/* Label + formula */}
      <div>
        <div style={{
          fontSize:'12px',
          color: isFinal ? '#23D18B' : 'rgba(238,242,255,0.8)',
          fontWeight: isFinal ? '600' : '500',
          marginBottom:'2px',
        }}>
          {step.label}
        </div>
        <div style={{
          fontSize:'11px', color:'rgba(238,242,255,0.4)',
          fontFamily:'IBM Plex Mono', wordBreak:'break-all',
        }}>
          {step.formula}
        </div>
        {step.note && (
          <div style={{ fontSize:'10px', color:'rgba(238,242,255,0.3)', marginTop:'2px' }}>
            {step.note}
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <span style={{
          fontSize: isFinal ? '14px' : '13px',
          color: isFinal ? '#23D18B' : 'rgba(238,242,255,0.8)',
          fontFamily:'IBM Plex Mono',
          fontWeight: isFinal ? '700' : '500',
        }}>
          {step.unit === '₹' ? `₹${step.value}` : step.unit ? `${step.value}${step.unit}` : step.value}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────
export default function WorkerValidationRow({ result, index }) {
  const [expanded, setExpanded] = useState(false)

  const fraud   = result.fraud        || result.fraud_signals  || {}
  const calc    = result.payoutCalculation || result.payout_calculation || {}
  const outcome = result.outcome       || {}
  const razorpay= result.razorpay      || null

  const verdict     = fraud.verdict    || 'unknown'
  const checks      = fraud.checks     || []
  const formulaSteps= result.formulaSteps || calc.formula_steps || []
  const payout      = outcome.payout_amount || result.payoutAmount || 0
  const status      = outcome.payout_status || result.payoutStatus || 'unknown'
  const workerId    = result.worker_id || result.workerId
  const workerName  = result.workerName || result.worker_name || workerId

  const statusCls = {
    approved:        'badge-green',
    partial_approved:'badge-amber',
    blocked:         'badge-red',
    not_applicable:  'badge-gray',
  }[status] || 'badge-gray'

  const verdictExpl = fraud.verdict_explanation || fraud.verdictExplanation || ''
  const passedCount = fraud.passed_count ?? fraud.passedChecks ?? 0
  const totalCount  = fraud.total_checks ?? fraud.totalChecks ?? checks.length

  // Razorpay status styling
  const rzStatus = razorpay?.final_status
  const rzColor  = rzStatus === 'success'       ? '#23D18B'
                 : rzStatus?.startsWith('failed')? '#F5532D'
                 : rzStatus?.startsWith('skipped')? '#6B7280'
                 : '#F5A623'

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
    }}>
      {/* Collapsed row — clickable */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display:'grid',
          gridTemplateColumns:'1fr 60px 80px 80px 100px 90px 36px',
          alignItems:'center',
          gap:'8px',
          padding:'10px 16px',
          cursor:'pointer',
          transition:'background 0.15s',
        }}
        className="table-row"
      >
        {/* Worker name + verdict icon */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', minWidth:0 }}>
          <VerdictIcon verdict={verdict}/>
          <div style={{ minWidth:0 }}>
            <p style={{
              fontSize:'13px', color:'rgba(238,242,255,0.9)',
              fontWeight:'500', overflow:'hidden',
              textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>
              {workerName}
            </p>
            <p style={{ fontSize:'11px', color:'rgba(238,242,255,0.35)', fontFamily:'IBM Plex Mono', marginTop:'1px' }}>
              {result.zone} · {result.eligibilityTier || result.eligibility_tier}
              {checks.length > 0 && ` · ${passedCount}/${totalCount} checks`}
            </p>
          </div>
        </div>

        {/* Trust ring */}
        <div style={{ display:'flex', justifyContent:'center' }}>
          <TrustRing score={fraud.trustScore || fraud.trust_score || 0} size={36}/>
        </div>

        {/* Verdict badge */}
        <div style={{ display:'flex', justifyContent:'center' }}>
          <span className={`badge badge-${
            verdict === 'clean' ? 'green'
            : verdict === 'partial' ? 'blue'
            : verdict === 'suspicious' ? 'amber'
            : verdict === 'blocked' ? 'red'
            : 'gray'
          } capitalize`}>
            {verdict}
          </span>
        </div>

        {/* Payout */}
        <div style={{ textAlign:'center' }}>
          {payout > 0
            ? <span style={{ fontFamily:'IBM Plex Mono', fontSize:'13px', color:'#23D18B', fontWeight:'600' }}>
                ₹{payout.toFixed(0)}
              </span>
            : <span style={{ fontFamily:'IBM Plex Mono', fontSize:'13px', color:'rgba(238,242,255,0.2)' }}>—</span>
          }
        </div>

        {/* Status badge */}
        <div style={{ display:'flex', justifyContent:'center' }}>
          <span className={`badge ${statusCls}`}>{status.replace('_',' ')}</span>
        </div>

        {/* Razorpay status */}
        <div style={{ textAlign:'right' }}>
          {razorpay ? (
            <span style={{
              fontSize:'10px', fontFamily:'IBM Plex Mono',
              color: rzColor, fontWeight:'500',
            }}>
              {rzStatus === 'success' ? `✓ ${razorpay.razorpay_payout_id?.slice(0,12)}…`
               : rzStatus?.startsWith('skipped') ? '~ skipped'
               : `✗ ${rzStatus?.replace('failed_','')}`}
            </span>
          ) : (
            <span style={{ fontSize:'10px', color:'rgba(238,242,255,0.2)' }}>—</span>
          )}
        </div>

        {/* Expand toggle */}
        <div style={{ display:'flex', justifyContent:'center' }}>
          {expanded
            ? <ChevronUp  size={14} style={{ color:'rgba(238,242,255,0.4)' }}/>
            : <ChevronDown size={14} style={{ color:'rgba(238,242,255,0.2)' }}/>}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding:'0 16px 16px' }}>

          {/* Verdict explanation */}
          {verdictExpl && (
            <div style={{
              padding:'10px 12px', borderRadius:'8px', marginBottom:'12px',
              background: verdict === 'clean'      ? 'rgba(35,209,139,0.06)'
                        : verdict === 'blocked'    ? 'rgba(245,83,45,0.06)'
                        : 'rgba(245,166,35,0.06)',
              border: `1px solid ${
                verdict === 'clean'   ? 'rgba(35,209,139,0.2)'
                : verdict === 'blocked' ? 'rgba(245,83,45,0.2)'
                : 'rgba(245,166,35,0.2)'
              }`,
            }}>
              <p style={{ fontSize:'12px', color:'rgba(238,242,255,0.7)', lineHeight:'1.5' }}>
                {verdictExpl}
              </p>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>

            {/* Left: Validation checks */}
            <div>
              <p style={{
                fontSize:'10px', color:'rgba(238,242,255,0.3)',
                fontFamily:'IBM Plex Mono', textTransform:'uppercase',
                letterSpacing:'1px', marginBottom:'8px',
              }}>
                Validation Checks · {passedCount}/{totalCount} passed
              </p>
              {checks.length > 0 ? (
                <div>
                  {checks.map(c => <CheckRow key={c.id} check={c}/>)}
                </div>
              ) : (
                <p style={{ fontSize:'12px', color:'rgba(238,242,255,0.3)' }}>
                  No check data available
                </p>
              )}
            </div>

            {/* Right: Formula steps */}
            <div>
              <p style={{
                fontSize:'10px', color:'rgba(238,242,255,0.3)',
                fontFamily:'IBM Plex Mono', textTransform:'uppercase',
                letterSpacing:'1px', marginBottom:'8px',
              }}>
                Payout Calculation · {formulaSteps.length} steps
              </p>
              {formulaSteps.length > 0 ? (
                <div style={{
                  background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:'10px', padding:'8px 12px',
                }}>
                  {formulaSteps.map((step, i) => (
                    <FormulaRow
                      key={step.step}
                      step={step}
                      isLast={i === formulaSteps.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ fontSize:'12px', color:'rgba(238,242,255,0.3)' }}>
                  No calculation data available
                </p>
              )}

              {/* Razorpay detail */}
              {razorpay && (
                <div style={{
                  marginTop:'10px',
                  background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:'10px', padding:'10px 12px',
                }}>
                  <p style={{
                    fontSize:'10px', color:'rgba(238,242,255,0.3)',
                    fontFamily:'IBM Plex Mono', textTransform:'uppercase',
                    letterSpacing:'1px', marginBottom:'8px',
                  }}>
                    Razorpay Transfer
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                    {[
                      ['Status',       razorpay.final_status, rzColor],
                      ['Amount',       `₹${razorpay.amount_rupees}`, '#23D18B'],
                      ['Contact',      razorpay.steps?.contact?.success ? '✓ Created' : '✗ Failed', razorpay.steps?.contact?.success ? '#23D18B' : '#F5532D'],
                      ['Fund Account', razorpay.steps?.fund_account?.success ? '✓ Created' : '✗ Failed', razorpay.steps?.fund_account?.success ? '#23D18B' : '#F5532D'],
                      ...(razorpay.razorpay_payout_id ? [['Payout ID', razorpay.razorpay_payout_id?.slice(0,20)+'…', '#4F8EF7']] : []),
                      ...(razorpay.utr ? [['UTR', razorpay.utr, '#4F8EF7']] : []),
                      ...(razorpay.error ? [['Error', razorpay.error, '#F5532D']] : []),
                    ].map(([k,v,c]) => (
                      <div key={k}>
                        <p style={{ fontSize:'10px', color:'rgba(238,242,255,0.3)', fontFamily:'IBM Plex Mono' }}>{k}</p>
                        <p style={{ fontSize:'11px', color:c||'rgba(238,242,255,0.7)', fontFamily:'IBM Plex Mono', fontWeight:'500', marginTop:'1px', wordBreak:'break-all' }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Link to worker profile */}
          <div style={{ marginTop:'10px', display:'flex', justifyContent:'flex-end' }}>
            <Link href={`/workers/${workerId}`}
              style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'rgba(79,142,247,0.7)', textDecoration:'none' }}>
              View full worker profile <ExternalLink size={11}/>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
