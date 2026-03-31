// Payout and fraud calculation engine
// Runs server-side when a disruption ends

function runPayoutCalculation(worker, severity, durationHours) {
  const day        = worker.current_session.day_of_week
  const dailyBase  = worker.baseline_income[day]
  const shiftHrs   = 9
  const hourlyRate = dailyBase / shiftHrs

  const preHrs    = 1.0
  const duringHrs = Math.min(durationHours, shiftHrs - preHrs)
  const postHrs   = Math.max(0, shiftHrs - preHrs - duringHrs)

  const preIncome    = hourlyRate * preHrs
  const duringIncome = hourlyRate * duringHrs * (1 - severity)
  const postIncome   = hourlyRate * postHrs
  const actualIncome = +(preIncome + duringIncome + postIncome).toFixed(2)
  const actualLoss   = +Math.max(0, dailyBase - actualIncome).toFixed(2)
  const predictedLoss= +(dailyBase * severity).toFixed(2)

  const planCov  = worker.insurance_plan.base_coverage
  const alpha    = worker.insurance_plan.alpha
  const rs       = worker.risk_profile.risk_score
  const trust    = worker.trust_profile.trust_score

  const eligMultMap = { not_eligible:0, limited:0.60, partial:0.80, full:1.00 }
  const eligMult    = eligMultMap[worker.eligibility_tier] || 0

  const adjCov       = planCov * (1 - alpha * rs) * trust
  const effectiveCov = +(adjCov * eligMult).toFixed(3)

  const predictedPayout = +(predictedLoss * effectiveCov).toFixed(2)
  let   basePayout      = +Math.min(predictedPayout, actualLoss).toFixed(2)

  return {
    hourlyRate:       +hourlyRate.toFixed(2),
    preIncome:        +preIncome.toFixed(2),
    duringIncome:     +duringIncome.toFixed(2),
    postIncome:       +postIncome.toFixed(2),
    actualIncome,
    dailyBaseline:    dailyBase,
    actualLoss,
    severity,
    predictedLoss,
    planCoverage:     planCov,
    adjustedCoverage: +adjCov.toFixed(3),
    eligibilityMult:  eligMult,
    effectiveCoverage:effectiveCov,
    predictedPayout,
    hybridCap:        actualLoss,
    basePayout,
    trustScore:       trust,
    finalPayout:      +Math.max(0, basePayout * trust).toFixed(2),
  }
}

function runFraudValidation(worker) {
  const sess      = worker.current_session
  const trustType = worker.trust_profile.profile_type
  const flags     = []

  if (sess.gps_anomaly_detected)            flags.push('GPS anomaly detected')
  if (!sess.location_in_zone)               flags.push('Worker not in zone')
  if (!sess.pre_disruption_confirmed)       flags.push('Inactive before disruption')
  if (sess.status !== 'active')             flags.push('Session inactive')
  if (sess.idle_ratio_so_far > 0.50)        flags.push(`High idle ratio ${sess.idle_ratio_so_far}`)
  if (sess.participation_score_so_far < 0.4)flags.push(`Low participation ${sess.participation_score_so_far}`)

  let verdict
  if (worker.eligibility_tier === 'not_eligible' ||
      sess.status !== 'active' ||
      !sess.location_in_zone) {
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

function buildOutcome(worker, fraud, calc, disruptionType) {
  const name = worker.name.split(' ')[0]
  const zone = worker.zone
  const type = disruptionType.replace(/_/g, ' ')
  const amt  = calc.finalPayout
  const v    = fraud.verdict

  const statusMap = {
    ineligible: 'not_applicable',
    blocked:    'blocked',
    suspicious: 'partial_approved',
    partial:    'partial_approved',
    clean:      'approved',
  }

  const msgMap = {
    ineligible: `Not currently eligible for coverage.`,
    blocked:    `Activity could not be verified for the ${type} disruption in ${zone}.`,
    suspicious: `${type} disruption in ${zone} verified. Reduced payout ₹${amt.toFixed(2)} due to anomalies.`,
    partial:    `${type} disruption in ${zone} verified. ₹${amt.toFixed(2)} credited. Some signals flagged.`,
    clean:      `${type} disruption in ${zone} verified. ₹${amt.toFixed(2)} credited to your UPI.`,
  }

  const triggered = !['ineligible', 'blocked'].includes(v)
  return {
    payoutTriggered:     triggered,
    payoutAmount:        triggered ? +amt.toFixed(2) : 0,
    payoutStatus:        statusMap[v],
    notificationMessage: msgMap[v],
  }
}

function runValidationPipeline(workers, disruption) {
  const results     = []
  let   totalPayout = 0

  for (const worker of workers) {
    const fraud = runFraudValidation(worker)
    const calc  = runPayoutCalculation(worker, disruption.severity, disruption.durationHours)
    const out   = buildOutcome(worker, fraud, calc, disruption.type)

    if (['blocked','ineligible'].includes(fraud.verdict)) {
      calc.finalPayout   = 0
      out.payoutAmount   = 0
      out.payoutTriggered= false
    }

    totalPayout += out.payoutAmount

    results.push({
      workerId:        worker.worker_id,
      workerName:      worker.name,
      zone:            worker.zone,
      storeId:         worker.primary_store_id,
      eligibilityTier: worker.eligibility_tier,
      trustType:       worker.trust_profile.profile_type,
      validation: {
        sessionActive:          worker.current_session.status === 'active',
        locationInZone:         worker.current_session.location_in_zone,
        preDisruptionConfirmed: worker.current_session.pre_disruption_confirmed,
        gpsAnomaly:             worker.current_session.gps_anomaly_detected,
        participationScore:     worker.current_session.participation_score_so_far,
      },
      fraud,
      payoutCalculation: calc,
      outcome:           out,
    })
  }

  const clusterRisk = results.filter(r =>
    ['suspicious','blocked'].includes(r.fraud.verdict)
  ).length / Math.max(results.length, 1)

  const summary = {
    totalWorkers:  results.length,
    approved:      results.filter(r => r.outcome.payoutStatus === 'approved').length,
    partial:       results.filter(r => r.outcome.payoutStatus === 'partial_approved').length,
    blocked:       results.filter(r => r.outcome.payoutStatus === 'blocked').length,
    ineligible:    results.filter(r => r.outcome.payoutStatus === 'not_applicable').length,
    totalDisbursed:+totalPayout.toFixed(2),
    clusterRisk:   +clusterRisk.toFixed(2),
    marketCrash:   clusterRisk > 0.5,
  }

  return { results, summary }
}

module.exports = { runValidationPipeline, runPayoutCalculation, runFraudValidation }
