// engine.js — Explainable validation and payout calculation engine

// ─── Payout calculation with full step trace ─────────────
function runPayoutCalculation(worker, severity, durationHours) {
  const day        = worker.current_session.day_of_week
  const dailyBase  = worker.baseline_income[day]
  const shiftHrs   = 9
  const hourlyRate = +(dailyBase / shiftHrs).toFixed(2)

  const preHrs    = 1.0
  const duringHrs = +Math.min(durationHours, shiftHrs - preHrs).toFixed(2)
  const postHrs   = +Math.max(0, shiftHrs - preHrs - duringHrs).toFixed(2)

  const preIncome    = +(hourlyRate * preHrs).toFixed(2)
  const duringIncome = +(hourlyRate * duringHrs * (1 - severity)).toFixed(2)
  const postIncome   = +(hourlyRate * postHrs).toFixed(2)
  const actualIncome = +(preIncome + duringIncome + postIncome).toFixed(2)
  const actualLoss   = +Math.max(0, dailyBase - actualIncome).toFixed(2)
  const predictedLoss= +(dailyBase * severity).toFixed(2)

  const planCov  = worker.insurance_plan.base_coverage
  const alpha    = worker.insurance_plan.alpha || 0.1
  const rs       = worker.risk_profile.risk_score
  const trust    = worker.trust_profile.trust_score

  const eligMultMap = { not_eligible:0, limited:0.60, partial:0.80, full:1.00 }
  const eligMult    = eligMultMap[worker.eligibility_tier] || 0

  const adjCov       = +(planCov * (1 - alpha * rs) * trust).toFixed(3)
  const effectiveCov = +(adjCov * eligMult).toFixed(3)
  const predictedPay = +(predictedLoss * effectiveCov).toFixed(2)
  const basePayout   = +Math.min(predictedPay, actualLoss).toFixed(2)
  const finalPayout  = +Math.max(0, basePayout * trust).toFixed(2)

  return {
    // Income breakdown
    daily_baseline:      dailyBase,
    hourly_rate:         hourlyRate,
    shift_hours:         shiftHrs,
    disruption_hours:    duringHrs,
    pre_hours:           preHrs,
    during_hours:        duringHrs,
    post_hours:          postHrs,
    pre_income:          preIncome,
    during_income:       duringIncome,
    post_income:         postIncome,
    actual_income:       actualIncome,
    actual_loss:         actualLoss,
    // Loss estimation
    severity,
    predicted_loss:      predictedLoss,
    // Coverage
    plan_coverage:       planCov,
    alpha,
    risk_score:          rs,
    adjusted_coverage:   adjCov,
    eligibility_tier:    worker.eligibility_tier,
    eligibility_mult:    eligMult,
    effective_coverage:  effectiveCov,
    // Payout
    predicted_payout:    predictedPay,
    hybrid_cap:          actualLoss,
    base_payout:         basePayout,
    trust_score:         trust,
    final_payout:        finalPayout,
    // Formula steps for display
    formula_steps: [
      {
        step:    1,
        label:   'Daily Baseline Income',
        formula: `baseline_income[${day}]`,
        value:   dailyBase,
        unit:    '₹',
        note:    `Worker's average ${day} earnings over last 6 weeks`,
      },
      {
        step:    2,
        label:   'Hourly Rate',
        formula: `₹${dailyBase} ÷ ${shiftHrs}hr shift`,
        value:   hourlyRate,
        unit:    '₹/hr',
        note:    null,
      },
      {
        step:    3,
        label:   'Actual Income (Dynamic)',
        formula: `pre(${preHrs}hr×₹${hourlyRate}) + during(${duringHrs}hr×₹${hourlyRate}×${(1-severity).toFixed(1)}) + post(${postHrs}hr×₹${hourlyRate})`,
        value:   actualIncome,
        unit:    '₹',
        note:    `Income reduced by severity during disruption window`,
      },
      {
        step:    4,
        label:   'Actual Loss',
        formula: `₹${dailyBase} − ₹${actualIncome}`,
        value:   actualLoss,
        unit:    '₹',
        note:    'Actual income drop due to disruption',
      },
      {
        step:    5,
        label:   'Predicted Loss',
        formula: `₹${dailyBase} × severity(${severity})`,
        value:   predictedLoss,
        unit:    '₹',
        note:    'Parametric estimate of expected income loss',
      },
      {
        step:    6,
        label:   'Adjusted Coverage',
        formula: `${planCov} × (1 − ${alpha}×${rs}) × trust(${trust})`,
        value:   adjCov,
        unit:    '',
        note:    `Plan coverage modified by risk score and trust`,
      },
      {
        step:    7,
        label:   'Effective Coverage',
        formula: `${adjCov} × eligibility_mult(${eligMult})`,
        value:   effectiveCov,
        unit:    '',
        note:    `Eligibility tier: ${worker.eligibility_tier}`,
      },
      {
        step:    8,
        label:   'Predicted Payout',
        formula: `₹${predictedLoss} × ${effectiveCov}`,
        value:   predictedPay,
        unit:    '₹',
        note:    null,
      },
      {
        step:    9,
        label:   'Hybrid Cap Applied',
        formula: `min(₹${predictedPay}, ₹${actualLoss})`,
        value:   basePayout,
        unit:    '₹',
        note:    'Capped by actual income drop to prevent overcompensation',
      },
      {
        step:    10,
        label:   'Trust Adjustment',
        formula: `₹${basePayout} × trust(${trust})`,
        value:   finalPayout,
        unit:    '₹',
        note:    'Final payout after trust score multiplier',
      },
    ],
  }
}

// ─── Explainable fraud validation ────────────────────────
function runFraudValidation(worker) {
  const sess      = worker.current_session
  const trustType = worker.trust_profile.profile_type
  const ts        = worker.trust_profile.trust_score

  // Each check: label, pass/fail, actual value, threshold, explanation
  const checks = [
    {
      id:          'session_active',
      label:       'Session Active',
      category:    'Eligibility',
      pass:        sess.status === 'active',
      actual:      sess.status,
      threshold:   'active',
      explanation: sess.status === 'active'
        ? 'Worker had an active shift session at the time of disruption'
        : 'Worker session was not active — not working during this disruption',
    },
    {
      id:          'location_in_zone',
      label:       'Location in Affected Zone',
      category:    'Location',
      pass:        sess.location_in_zone === true,
      actual:      sess.location_in_zone ? 'Confirmed in zone' : 'Outside zone',
      threshold:   'Must be within service zone',
      explanation: sess.location_in_zone
        ? `Worker GPS confirmed within ${worker.zone} service zone`
        : 'Worker location was outside the affected service zone',
    },
    {
      id:          'pre_disruption_active',
      label:       'Active Before Disruption',
      category:    'Participation',
      pass:        sess.pre_disruption_confirmed === true,
      actual:      sess.pre_disruption_confirmed ? 'Working before trigger' : 'Not active pre-disruption',
      threshold:   'Must be working before disruption started',
      explanation: sess.pre_disruption_confirmed
        ? 'Worker was already on shift and working before the disruption trigger'
        : 'Worker only logged in after disruption started — opportunistic login detected',
    },
    {
      id:          'gps_clean',
      label:       'GPS Signal Integrity',
      category:    'Location',
      pass:        !sess.gps_anomaly_detected,
      actual:      sess.gps_anomaly_detected ? 'Anomaly detected' : 'Clean signal',
      threshold:   'No GPS spoofing or teleportation',
      explanation: sess.gps_anomaly_detected
        ? 'GPS anomaly detected — possible spoofing, teleportation events, or impossible movement speed'
        : 'GPS signal shows consistent, realistic movement patterns',
    },
    {
      id:          'participation_score',
      label:       'Participation Score',
      category:    'Activity',
      pass:        (sess.participation_score_so_far || 0) >= 0.40,
      actual:      `${((sess.participation_score_so_far || 0) * 100).toFixed(0)}%`,
      threshold:   '≥ 40%',
      explanation: (sess.participation_score_so_far || 0) >= 0.40
        ? `Participation score ${((sess.participation_score_so_far||0)*100).toFixed(0)}% meets the minimum activity threshold`
        : `Participation score ${((sess.participation_score_so_far||0)*100).toFixed(0)}% is below 40% minimum — insufficient work activity`,
    },
    {
      id:          'idle_ratio',
      label:       'Idle Time Ratio',
      category:    'Activity',
      pass:        (sess.idle_ratio_so_far || 0) <= 0.50,
      actual:      `${((sess.idle_ratio_so_far || 0) * 100).toFixed(0)}%`,
      threshold:   '≤ 50%',
      explanation: (sess.idle_ratio_so_far || 0) <= 0.50
        ? `Idle ratio ${((sess.idle_ratio_so_far||0)*100).toFixed(0)}% is within acceptable limits`
        : `Idle ratio ${((sess.idle_ratio_so_far||0)*100).toFixed(0)}% exceeds 50% — worker appears to have been inactive`,
    },
    {
      id:          'eligibility_tier',
      label:       'Eligibility Tier',
      category:    'Coverage',
      pass:        worker.eligibility_tier !== 'not_eligible',
      actual:      worker.eligibility_tier.replace('_', ' '),
      threshold:   'Must be enrolled in coverage',
      explanation: worker.eligibility_tier !== 'not_eligible'
        ? `Worker has ${worker.eligibility_tier.replace('_',' ')} coverage tier based on ${worker.months_of_service} months of service`
        : `Worker has only ${worker.months_of_service} months of service — minimum 1 month required for any coverage`,
    },
    {
      id:          'trust_profile',
      label:       'Trust Profile',
      category:    'Behavioral',
      pass:        trustType !== 'critical',
      actual:      `${trustType} (${(ts * 100).toFixed(0)}%)`,
      threshold:   'Profile must not be critical',
      explanation: trustType !== 'critical'
        ? `Trust profile is ${trustType} with score ${(ts*100).toFixed(0)}% — behavioral history is acceptable`
        : `Trust profile is critical (${(ts*100).toFixed(0)}%) — multiple past anomalies detected, payout blocked`,
    },
  ]

  const passedChecks = checks.filter(c => c.pass)
  const failedChecks = checks.filter(c => !c.pass)
  const flags        = failedChecks.map(c => c.label)

  // Determine verdict from checks
  let verdict
  if (worker.eligibility_tier === 'not_eligible' ||
      !sess.location_in_zone ||
      sess.status !== 'active') {
    verdict = 'ineligible'
  } else if (trustType === 'critical' || sess.gps_anomaly_detected) {
    verdict = 'blocked'
  } else if (trustType === 'low' || failedChecks.length >= 3) {
    verdict = 'suspicious'
  } else if (failedChecks.length >= 1) {
    verdict = 'partial'
  } else {
    verdict = 'clean'
  }

  // Verdict explanation
  const verdictExplanations = {
    clean:      `All ${checks.length} validation checks passed. Worker is fully eligible for the calculated payout.`,
    partial:    `${passedChecks.length}/${checks.length} checks passed. ${failedChecks.length} minor issue(s) detected — payout approved at reduced amount.`,
    suspicious: `${failedChecks.length} significant anomalies detected. Payout heavily reduced via trust score adjustment.`,
    blocked:    `Critical validation failure — ${failedChecks.map(c=>c.label).join(', ')}. Payout blocked to prevent fraudulent claim.`,
    ineligible: `Worker does not meet basic eligibility requirements. No payout issued.`,
  }

  return {
    checks,
    passed_count:       passedChecks.length,
    failed_count:       failedChecks.length,
    total_checks:       checks.length,
    flags,
    verdict,
    verdict_explanation:verdictExplanations[verdict],
    trustScore:         ts,
    categories: {
      eligibility: checks.filter(c => c.category === 'Eligibility'),
      location:    checks.filter(c => c.category === 'Location'),
      participation:checks.filter(c => c.category === 'Participation' || c.category === 'Activity'),
      coverage:    checks.filter(c => c.category === 'Coverage'),
      behavioral:  checks.filter(c => c.category === 'Behavioral'),
    },
  }
}

// ─── Build outcome message ────────────────────────────────
function buildOutcome(worker, fraud, calc, disruptionType) {
  const zone = worker.zone
  const type = disruptionType.replace(/_/g, ' ')
  const amt  = calc.final_payout
  const v    = fraud.verdict

  const statusMap = {
    ineligible: 'not_applicable',
    blocked:    'blocked',
    suspicious: 'partial_approved',
    partial:    'partial_approved',
    clean:      'approved',
  }

  const msgMap = {
    ineligible: `Not currently eligible for coverage. Check your plan details.`,
    blocked:    `Activity signals could not be verified for the ${type} disruption in ${zone}. Payout blocked.`,
    suspicious: `${type} disruption in ${zone} verified. Reduced payout ₹${amt.toFixed(2)} credited due to activity anomalies.`,
    partial:    `${type} disruption in ${zone} verified. ₹${amt.toFixed(2)} credited. Some signals flagged.`,
    clean:      `${type} disruption in ${zone} verified. ₹${amt.toFixed(2)} has been credited to your UPI.`,
  }

  const triggered = !['ineligible', 'blocked'].includes(v)

  return {
    payout_triggered:     triggered,
    payout_amount:        triggered ? +amt.toFixed(2) : 0,
    payout_status:        statusMap[v],
    notification_message: msgMap[v],
  }
}

// ─── Full validation pipeline ─────────────────────────────
function runValidationPipeline(workers, disruption) {
  const results     = []
  let   totalPayout = 0

  for (const worker of workers) {
    const fraud = runFraudValidation(worker)
    const calc  = runPayoutCalculation(worker, disruption.severity, disruption.durationHours)
    const out   = buildOutcome(worker, fraud, calc, disruption.type)

    if (['blocked', 'ineligible'].includes(fraud.verdict)) {
      calc.final_payout       = 0
      out.payout_amount       = 0
      out.payout_triggered    = false
    }

    totalPayout += out.payout_amount

    results.push({
      worker_id:          worker.worker_id,
      workerName:         worker.name,
      zone:               worker.zone,
      storeId:            worker.primary_store_id,
      eligibilityTier:    worker.eligibility_tier,
      trustType:          worker.trust_profile.profile_type,
      upi_id:             worker.upi_id,
      validation: {
        sessionActive:           worker.current_session.status === 'active',
        locationInZone:          worker.current_session.location_in_zone,
        preDisruptionConfirmed:  worker.current_session.pre_disruption_confirmed,
        gpsAnomaly:              worker.current_session.gps_anomaly_detected,
        participationScore:      worker.current_session.participation_score_so_far,
      },
      fraud,
      payoutCalculation:  calc,
      outcome:            out,
    })
  }

  const clusterRisk = results.filter(r =>
    ['suspicious','blocked'].includes(r.fraud.verdict)
  ).length / Math.max(results.length, 1)

  const summary = {
    totalWorkers:   results.length,
    approved:       results.filter(r => r.outcome.payout_status === 'approved').length,
    partial:        results.filter(r => r.outcome.payout_status === 'partial_approved').length,
    blocked:        results.filter(r => r.outcome.payout_status === 'blocked').length,
    ineligible:     results.filter(r => r.outcome.payout_status === 'not_applicable').length,
    totalDisbursed: +totalPayout.toFixed(2),
    clusterRisk:    +clusterRisk.toFixed(2),
    marketCrash:    clusterRisk > 0.5,
  }

  return { results, summary }
}

module.exports = {
  runValidationPipeline,
  runPayoutCalculation,
  runFraudValidation,
}
