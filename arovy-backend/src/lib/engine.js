function runPayoutCalculation(worker, severity, durationHours) {
  const day        = worker.current_session.day_of_week
  const dailyBase  = worker.baseline_income[day]
  const shiftHrs   = 9
  const hourlyRate = +(dailyBase / shiftHrs).toFixed(2)
  const preHrs     = 1.0
  const duringHrs  = +Math.min(durationHours, shiftHrs - preHrs).toFixed(2)
  const postHrs    = +Math.max(0, shiftHrs - preHrs - duringHrs).toFixed(2)
  const preIncome  = +(hourlyRate * preHrs).toFixed(2)
  const duringIncome= +(hourlyRate * duringHrs * (1 - severity)).toFixed(2)
  const postIncome = +(hourlyRate * postHrs).toFixed(2)
  const actualIncome= +(preIncome + duringIncome + postIncome).toFixed(2)
  const actualLoss = +Math.max(0, dailyBase - actualIncome).toFixed(2)
  const predictedLoss= +(dailyBase * severity).toFixed(2)
  const planCov    = worker.insurance_plan.base_coverage
  const alpha      = worker.insurance_plan.alpha || 0.1
  const rs         = worker.risk_profile.risk_score
  const trust      = worker.trust_profile.trust_score
  const eligMultMap= { not_eligible:0, limited:0.60, partial:0.80, full:1.00 }
  const eligMult   = eligMultMap[worker.eligibility_tier] || 0
  const adjCov     = +(planCov * (1 - alpha * rs) * trust).toFixed(3)
  const effectiveCov= +(adjCov * eligMult).toFixed(3)
  const predictedPay= +(predictedLoss * effectiveCov).toFixed(2)
  const basePayout = +Math.min(predictedPay, actualLoss).toFixed(2)
  const finalPayout= +Math.max(0, basePayout * trust).toFixed(2)

  return {
    daily_baseline: dailyBase, hourly_rate: hourlyRate,
    pre_income: preIncome, during_income: duringIncome, post_income: postIncome,
    actual_income: actualIncome, actual_loss: actualLoss,
    severity, predicted_loss: predictedLoss,
    plan_coverage: planCov, adjusted_coverage: adjCov,
    eligibility_tier: worker.eligibility_tier, eligibility_mult: eligMult,
    effective_coverage: effectiveCov, predicted_payout: predictedPay,
    hybrid_cap: actualLoss, base_payout: basePayout,
    trust_score: trust, final_payout: finalPayout,
    formula_steps: [
      { step:1, label:'Daily Baseline Income',   formula:`baseline_income[${day}]`,                                value:dailyBase,    unit:'₹', note:`${day} average` },
      { step:2, label:'Hourly Rate',             formula:`₹${dailyBase} ÷ ${shiftHrs}hr`,                          value:hourlyRate,   unit:'₹/hr', note:null },
      { step:3, label:'Actual Income',           formula:`pre+during(×${(1-severity).toFixed(2)})+post`,            value:actualIncome, unit:'₹', note:'Reduced by severity during window' },
      { step:4, label:'Actual Loss',             formula:`₹${dailyBase} − ₹${actualIncome}`,                       value:actualLoss,   unit:'₹', note:'Real income drop' },
      { step:5, label:'Predicted Loss',          formula:`₹${dailyBase} × ${severity}`,                            value:predictedLoss,unit:'₹', note:'Parametric estimate' },
      { step:6, label:'Adjusted Coverage',       formula:`${planCov}×(1−${alpha}×${rs})×trust(${trust})`,          value:adjCov,       unit:'', note:'Risk + trust adjusted' },
      { step:7, label:'Effective Coverage',      formula:`${adjCov} × eligibility_mult(${eligMult})`,              value:effectiveCov, unit:'', note:`Tier: ${worker.eligibility_tier}` },
      { step:8, label:'Predicted Payout',        formula:`₹${predictedLoss} × ${effectiveCov}`,                    value:predictedPay, unit:'₹', note:null },
      { step:9, label:'Hybrid Cap Applied',      formula:`min(₹${predictedPay}, ₹${actualLoss})`,                  value:basePayout,   unit:'₹', note:'Capped by actual loss' },
      { step:10,label:'Final Payout',            formula:`₹${basePayout} × trust(${trust})`,                       value:finalPayout,  unit:'₹', note:'Trust score multiplier' },
    ],
  }
}

function runFraudValidation(worker) {
  const sess      = worker.current_session
  const trustType = worker.trust_profile.profile_type
  const ts        = worker.trust_profile.trust_score

  const checks = [
    { id:'session_active',      label:'Session Active',           category:'Eligibility',   pass:sess.status==='active',               actual:sess.status,               threshold:'active',        explanation:sess.status==='active'?'Active shift at disruption time':'Session not active — not working during disruption' },
    { id:'location_in_zone',    label:'Location in Affected Zone',category:'Location',      pass:sess.location_in_zone===true,         actual:sess.location_in_zone?'In zone':'Outside zone', threshold:'Must be within zone', explanation:sess.location_in_zone?`GPS confirmed within ${worker.zone}`:'Worker location outside affected zone' },
    { id:'pre_disruption',      label:'Active Before Disruption', category:'Participation', pass:sess.pre_disruption_confirmed===true, actual:sess.pre_disruption_confirmed?'Confirmed':'Not active', threshold:'Working before trigger', explanation:sess.pre_disruption_confirmed?'Was working before disruption started':'Only logged in after disruption — opportunistic login' },
    { id:'gps_clean',           label:'GPS Signal Integrity',     category:'Location',      pass:!sess.gps_anomaly_detected,           actual:sess.gps_anomaly_detected?'Anomaly':'Clean', threshold:'No spoofing', explanation:sess.gps_anomaly_detected?'GPS anomaly detected — possible spoofing':'Consistent realistic movement' },
    { id:'participation',       label:'Participation Score',      category:'Activity',      pass:(sess.participation_score_so_far||0)>=0.40, actual:`${((sess.participation_score_so_far||0)*100).toFixed(0)}%`, threshold:'≥40%', explanation:(sess.participation_score_so_far||0)>=0.40?`Score ${((sess.participation_score_so_far||0)*100).toFixed(0)}% meets threshold`:'Score below 40% minimum' },
    { id:'idle_ratio',          label:'Idle Time Ratio',          category:'Activity',      pass:(sess.idle_ratio_so_far||0)<=0.50,    actual:`${((sess.idle_ratio_so_far||0)*100).toFixed(0)}%`, threshold:'≤50%', explanation:(sess.idle_ratio_so_far||0)<=0.50?'Idle ratio within limits':'Too much idle time during shift' },
    { id:'eligibility',         label:'Eligibility Tier',         category:'Coverage',      pass:worker.eligibility_tier!=='not_eligible', actual:worker.eligibility_tier.replace('_',' '), threshold:'Must be enrolled', explanation:worker.eligibility_tier!=='not_eligible'?`${worker.eligibility_tier} coverage after ${worker.months_of_service}mo`:`Only ${worker.months_of_service} months — minimum 1 month required` },
    { id:'trust_profile',       label:'Trust Profile',            category:'Behavioral',    pass:trustType!=='critical', actual:`${trustType} (${(ts*100).toFixed(0)}%)`, threshold:'Not critical', explanation:trustType!=='critical'?`Trust ${trustType} — history acceptable`:'Critical trust — multiple anomalies' },
  ]

  const failed  = checks.filter(c => !c.pass)
  const flags   = failed.map(c => c.label)
  let verdict
  if (worker.eligibility_tier==='not_eligible' || !sess.location_in_zone || sess.status!=='active') verdict='ineligible'
  else if (trustType==='critical' || sess.gps_anomaly_detected) verdict='blocked'
  else if (trustType==='low' || failed.length>=3) verdict='suspicious'
  else if (failed.length>=1) verdict='partial'
  else verdict='clean'

  const explanations = {
    clean:      `All ${checks.length} checks passed. Worker is fully eligible.`,
    partial:    `${checks.length-failed.length}/${checks.length} checks passed. Minor issues — payout approved at reduced amount.`,
    suspicious: `${failed.length} anomalies detected. Payout reduced via trust adjustment.`,
    blocked:    `Critical failure — ${failed.map(c=>c.label).join(', ')}. Payout blocked.`,
    ineligible: `Worker does not meet basic eligibility. No payout.`,
  }

  return { checks, passed_count:checks.length-failed.length, failed_count:failed.length, total_checks:checks.length, flags, verdict, verdict_explanation:explanations[verdict], trustScore:ts }
}

function buildOutcome(worker, fraud, calc, type) {
  const zone = worker.zone
  const amt  = calc.final_payout
  const v    = fraud.verdict
  const statusMap = { ineligible:'not_applicable', blocked:'blocked', suspicious:'partial_approved', partial:'partial_approved', clean:'approved' }
  const msgMap = {
    ineligible:`Not eligible for coverage. Check your plan details.`,
    blocked:   `Activity could not be verified for the ${type.replace(/_/g,' ')} disruption in ${zone}. Payout blocked.`,
    suspicious:`${type.replace(/_/g,' ')} disruption in ${zone} verified. Reduced payout ₹${amt.toFixed(2)} credited.`,
    partial:   `${type.replace(/_/g,' ')} disruption in ${zone} verified. ₹${amt.toFixed(2)} credited. Some signals flagged.`,
    clean:     `${type.replace(/_/g,' ')} disruption in ${zone} verified. ₹${amt.toFixed(2)} credited to your UPI.`,
  }
  const triggered = !['ineligible','blocked'].includes(v)
  return { payout_triggered:triggered, payout_amount:triggered?+amt.toFixed(2):0, payout_status:statusMap[v], notification_message:msgMap[v] }
}

function runValidationPipeline(workers, disruption) {
  const results = []
  let totalPayout = 0
  for (const worker of workers) {
    const fraud = runFraudValidation(worker)
    const calc  = runPayoutCalculation(worker, disruption.severity, disruption.durationHours)
    const out   = buildOutcome(worker, fraud, calc, disruption.type)
    if (['blocked','ineligible'].includes(fraud.verdict)) { calc.final_payout=0; out.payout_amount=0; out.payout_triggered=false }
    totalPayout += out.payout_amount
    results.push({ worker_id:worker.worker_id, workerName:worker.name, zone:worker.zone, storeId:worker.primary_store_id, eligibilityTier:worker.eligibility_tier, trustType:worker.trust_profile.profile_type, upi_id:worker.upi_id, validation:{ sessionActive:worker.current_session.status==='active', locationInZone:worker.current_session.location_in_zone, preDisruptionConfirmed:worker.current_session.pre_disruption_confirmed, gpsAnomaly:worker.current_session.gps_anomaly_detected, participationScore:worker.current_session.participation_score_so_far }, fraud, payoutCalculation:calc, outcome:out })
  }
  const clusterRisk = results.filter(r=>['suspicious','blocked'].includes(r.fraud.verdict)).length/Math.max(results.length,1)
  return { results, summary:{ totalWorkers:results.length, approved:results.filter(r=>r.outcome.payout_status==='approved').length, partial:results.filter(r=>r.outcome.payout_status==='partial_approved').length, blocked:results.filter(r=>r.outcome.payout_status==='blocked').length, ineligible:results.filter(r=>r.outcome.payout_status==='not_applicable').length, totalDisbursed:+totalPayout.toFixed(2), clusterRisk:+clusterRisk.toFixed(2), marketCrash:clusterRisk>0.5 } }
}

module.exports = { runValidationPipeline, runPayoutCalculation, runFraudValidation }
