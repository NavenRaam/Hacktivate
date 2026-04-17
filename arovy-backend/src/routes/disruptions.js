const express=require('express'),router=express.Router(),{v4:uuid}=require('uuid')
const store=require('../lib/store'),sse=require('../lib/sse')
const{runValidationPipeline}=require('../lib/engine')
const{processBatchPayouts}=require('../lib/razorpay')
const{updateDatasetAfterDisruption}=require('../lib/datasetUpdater')
const fs=require('fs'),path=require('path'),DS_PATH=path.join(__dirname,'../../data/dataset.json')

function loadWorkers(){try{const p=require.resolve('../../data/dataset.json');delete require.cache[p];return require('../../data/dataset.json').workers||[]}catch(e){console.warn('[workers]',e.message);return[]}}

router.get('/',(req,res)=>res.json(store.getAllDisruptions().map(d=>({id:d.id,storeId:d.storeId,storeName:d.storeName,zone:d.zone,city:d.city,type:d.type,severity:d.severity,startTime:d.startTime,endTime:d.endTime,durationHours:d.durationHours,affectedTotal:d.affectedTotal,affectedActive:d.affectedActive,status:d.status,createdAt:d.createdAt,activatedAt:d.activatedAt,endedAt:d.endedAt,summary:d.summary||null,razorpay:d.razorpay||null,datasetUpdate:d.datasetUpdate||null,validationResults:d.validationResults||null}))))

router.get('/active',(req,res)=>res.json(store.getActiveDisruption()||null))
router.get('/:id',(req,res)=>{const d=store.getDisruptionById(req.params.id);if(!d)return res.status(404).json({error:'Not found'});res.json(d)})

router.post('/create',(req,res)=>{
  const{storeId,storeName,zone,city,type,params,severity,startTime,endTime,durationHours,startMinutes,endMinutes,affectedWorkerIds,affectedTotal,affectedActive}=req.body
  if(!storeId||!type||severity===undefined)return res.status(400).json({error:'Missing fields'})
  const d=store.createDisruption({id:uuid(),storeId,storeName,zone,city,type,params,severity,startTime,endTime,durationHours,startMinutes,endMinutes,affectedWorkerIds:affectedWorkerIds||[],affectedTotal:affectedTotal||0,affectedActive:affectedActive||0,dayOfWeek:['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]})
  sse.broadcast('disruption:scheduled',d);console.log(`[disruption] scheduled ${d.id}`)
  res.json({success:true,disruption:d})
})

router.post('/:id/activate',(req,res)=>{
  const ex=store.getDisruptionById(req.params.id);if(!ex)return res.status(404).json({error:'Not found'})
  if(['active','validating','paying','completed'].includes(ex.status))return res.json({success:true,disruption:ex,skipped:true})
  const u=store.updateDisruption(req.params.id,{status:'active',activatedAt:new Date().toISOString()})
  sse.broadcast('disruption:active',{id:u.id,storeName:u.storeName,zone:u.zone,city:u.city,type:u.type,severity:u.severity,startTime:u.startTime,endTime:u.endTime,durationHours:u.durationHours,affectedTotal:u.affectedTotal,affectedActive:u.affectedActive,status:'active'})
  console.log(`[disruption] activated ${u.id}`);res.json({success:true,disruption:u})
})

router.post('/:id/end',async(req,res)=>{
  const dis=store.getDisruptionById(req.params.id);if(!dis)return res.status(404).json({error:'Not found'})
  if(dis.status==='completed')return res.json({success:true,skipped:true,summary:dis.summary})
  if(['validating','paying'].includes(dis.status))return res.json({success:true,skipped:true,message:'Processing'})
  store.updateDisruption(dis.id,{status:'validating'});sse.broadcast('disruption:validating',{id:dis.id,zone:dis.zone})
  try{
    const workers=loadWorkers(),affected=workers.filter(w=>dis.affectedWorkerIds.includes(w.worker_id))
    console.log(`[engine] validating ${affected.length} workers`)
    const{results,summary}=runValidationPipeline(affected,dis)
    sse.broadcast('disruption:validated',{id:dis.id,summary,results:results.map(r=>({workerId:r.worker_id,workerName:r.workerName,zone:r.zone,verdict:r.fraud.verdict,verdictExplanation:r.fraud.verdict_explanation,passedChecks:r.fraud.passed_count,failedChecks:r.fraud.failed_count,totalChecks:r.fraud.total_checks,checks:r.fraud.checks,payoutAmount:r.outcome.payout_amount,payoutStatus:r.outcome.payout_status,flags:r.fraud.flags,trustScore:r.fraud.trustScore,notification:r.outcome.notification_message,formulaSteps:r.payoutCalculation.formula_steps,calculation:r.payoutCalculation}))})
    store.updateDisruption(dis.id,{status:'paying',validationResults:results,summary});sse.broadcast('disruption:paying',{id:dis.id})
    const eligible=results.filter(r=>r.outcome.payout_triggered&&r.outcome.payout_amount>0).map(r=>({worker:affected.find(w=>w.worker_id===r.worker_id),amount:r.outcome.payout_amount})).filter(e=>e.worker)
    const{results:rzR,summary:rzS}=await processBatchPayouts(eligible,dis.id,dis.type)
    const rzMap={};rzR.forEach(r=>{rzMap[r.worker_id]=r})
    const enriched=results.map(r=>({...r,razorpay:rzMap[r.worker_id]||null}))
    const du=updateDatasetAfterDisruption(results,dis)
    const completed=store.updateDisruption(dis.id,{status:'completed',endedAt:new Date().toISOString(),validationResults:enriched,summary,razorpay:rzS,datasetUpdate:du})
    sse.broadcast('disruption:completed',{id:dis.id,summary,razorpay:rzS,datasetUpdate:du,results:enriched.map(r=>({workerId:r.worker_id,workerName:r.workerName,zone:r.zone,verdict:r.fraud.verdict,verdictExplanation:r.fraud.verdict_explanation,passedChecks:r.fraud.passed_count,failedChecks:r.fraud.failed_count,checks:r.fraud.checks,payoutAmount:r.outcome.payout_amount,payoutStatus:r.outcome.payout_status,flags:r.fraud.flags,trustScore:r.fraud.trustScore,notification:r.outcome.notification_message,formulaSteps:r.payoutCalculation.formula_steps,razorpay:r.razorpay}))})
    console.log(`[disruption] completed ${dis.id} — ₹${summary.totalDisbursed}`)
    res.json({success:true,summary,razorpay:rzS,datasetUpdate:du})
  }catch(err){
    console.error('[disruption] error:',err);store.updateDisruption(dis.id,{status:'error',error:err.message});sse.broadcast('disruption:error',{id:dis.id,error:err.message});res.status(500).json({error:err.message})
  }
})

module.exports=router
