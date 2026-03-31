export function runPayoutCalculation(worker, template) {
  const day        = worker.current_session.day_of_week
  const dailyBase  = worker.baseline_income[day]
  const shiftHrs   = 9
  const hourlyRate = dailyBase / shiftHrs

  const severity   = template.severity
  const durHours   = template.parameters.duration_hours ||
                     (template.parameters.downtime_minutes / 60) || 0

  const preHrs     = 1.0
  const duringHrs  = durHours
  const postHrs    = Math.max(0, shiftHrs - preHrs - duringHrs)

  const preIncome     = hourlyRate * preHrs
  const duringIncome  = hourlyRate * duringHrs * (1 - severity)
  const postIncome    = hourlyRate * postHrs
  const actualIncome  = preIncome + duringIncome + postIncome
  const actualLoss    = Math.max(0, dailyBase - actualIncome)
  const predictedLoss = dailyBase * severity

  const planCov    = worker.insurance_plan.base_coverage
  const alpha      = worker.insurance_plan.alpha
  const rs         = worker.risk_profile.risk_score
  const trust      = worker.trust_profile.trust_score

  const eligMultMap = { not_eligible: 0, limited: 0.60, partial: 0.80, full: 1.00 }
  const eligMult    = eligMultMap[worker.eligibility_tier]

  const adjCov       = planCov * (1 - alpha * rs) * trust
  const effectiveCov = adjCov * eligMult

  const predictedPayout  = predictedLoss * effectiveCov
  let   basePayout       = Math.min(predictedPayout, actualLoss)

  const mcActive   = template.market_crash || false
  const mcFactor   = mcActive ? 0.75 : 1.0
  const hardCap    = mcActive ? 250 : Infinity
  basePayout       = Math.min(basePayout * mcFactor, hardCap)

  const finalPayout = basePayout * trust

  return {
    hourlyRate:          +hourlyRate.toFixed(2),
    preIncome:           +preIncome.toFixed(2),
    duringIncome:        +duringIncome.toFixed(2),
    postIncome:          +postIncome.toFixed(2),
    actualIncome:        +actualIncome.toFixed(2),
    dailyBaseline:       dailyBase,
    actualLoss:          +actualLoss.toFixed(2),
    severity,
    predictedLoss:       +predictedLoss.toFixed(2),
    planCoverage:        planCov,
    adjustedCoverage:    +adjCov.toFixed(3),
    eligibilityMult:     eligMult,
    effectiveCoverage:   +effectiveCov.toFixed(3),
    predictedPayout:     +predictedPayout.toFixed(2),
    hybridCap:           +actualLoss.toFixed(2),
    basePayout:          +basePayout.toFixed(2),
    marketCrashActive:   mcActive,
    marketCrashFactor:   mcFactor,
    trustScore:          trust,
    finalPayout:         +finalPayout.toFixed(2)
  }
}

export function runFraudValidation(worker) {
  const sess      = worker.current_session
  const trustType = worker.trust_profile.profile_type
  const flags     = []

  if (sess.gps_anomaly_detected)          flags.push('GPS anomaly detected')
  if (!sess.location_in_zone)             flags.push('Worker not in zone')
  if (!sess.pre_disruption_confirmed)     flags.push('Inactive before disruption')
  if (sess.status !== 'active')           flags.push('Session inactive')
  if (sess.idle_ratio_so_far > 0.50)      flags.push(`High idle ratio ${sess.idle_ratio_so_far}`)
  if (sess.participation_score_so_far < 0.40) flags.push(`Low participation ${sess.participation_score_so_far}`)

  let verdict
  if (worker.eligibility_tier === 'not_eligible' || sess.status !== 'active' || !sess.location_in_zone) {
    verdict = 'ineligible'
  } else if (trustType === 'critical' || sess.gps_anomaly_detected) {
    verdict = 'blocked'
  } else if (trustType === 'low' || flags.length >= 3) {
    verdict = 'suspicious'
  } else if (flags.length >= 1) {
    verdict = 'partial'
  } else {
    verdict = 'clean'
  }

  return { flags, verdict, trustScore: worker.trust_profile.trust_score }
}

export function buildOutcomeMessage(worker, fraud, payoutCalc, template) {
  const name    = worker.name.split(' ')[0]
  const zone    = worker.zone
  const type    = template.type.replace(/_/g, ' ')
  const amt     = payoutCalc.finalPayout
  const v       = fraud.verdict

  const statusMap = {
    ineligible:       'not_applicable',
    blocked:          'blocked',
    suspicious:       'partial_approved',
    partial:          'partial_approved',
    clean:            'approved'
  }

  const msgMap = {
    ineligible:  `You are not currently eligible for coverage.`,
    blocked:     `Activity signals could not be verified for the ${type} disruption in ${zone}. Payout blocked.`,
    suspicious:  `${type} disruption verified. Reduced payout ₹${amt.toFixed(2)} credited due to activity anomalies.`,
    partial:     `${type} disruption verified. ₹${amt.toFixed(2)} credited. Some signals flagged.`,
    clean:       `${type} disruption in ${zone} verified. ₹${amt.toFixed(2)} has been credited to your UPI.`
  }

  const triggered = !['ineligible', 'blocked'].includes(v)

  return {
    payoutTriggered:     triggered,
    payoutAmount:        triggered ? +amt.toFixed(2) : 0,
    payoutStatus:        statusMap[v],
    notificationMessage: msgMap[v]
  }
}