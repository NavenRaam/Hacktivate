const https = require('https')
const KEY_ID         = "rzp_test_SZMDrki2Y0J1zi"
const KEY_SECRET     = "x1p8ff5oGYZqrWBGozacFwXM"
const ACCOUNT_NUMBER = 2323230052034072
const AUTH=Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')

function makeRef(disruptionId,workerId){return`${disruptionId.replace(/-/g,'').slice(0,12)}${workerId.replace(/[^a-zA-Z0-9]/g,'').slice(0,12)}${Date.now().toString(36).slice(-6)}`.slice(0,40)}

function rz(method,path,body=null){return new Promise((res,rej)=>{const p=body?JSON.stringify(body):null,o={hostname:'api.razorpay.com',port:443,path,method,headers:{'Authorization':`Basic ${AUTH}`,'Content-Type':'application/json',...(p&&{'Content-Length':Buffer.byteLength(p)})}},req=https.request(o,r=>{let d='';r.on('data',c=>{d+=c});r.on('end',()=>{try{const j=JSON.parse(d);r.statusCode>=200&&r.statusCode<300?res(j):rej({statusCode:r.statusCode,error:j.error||j})}catch(e){rej({statusCode:r.statusCode,raw:d})}})});req.on('error',rej);if(p)req.write(p);req.end()})}

async function createContact(w){const ref=w.worker_id.replace(/[^a-zA-Z0-9]/g,'').slice(0,40);try{const r=await rz('POST','/v1/contacts',{name:w.name,type:'employee',reference_id:ref,email:`${w.worker_id.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20)}@arovy.in`,contact:'9000000000'});return{success:true,contact_id:r.id}}catch(e){if(e.statusCode===400){try{const l=await rz('GET',`/v1/contacts?reference_id=${ref}`);if(l.items?.length)return{success:true,contact_id:l.items[0].id}}catch{}}return{success:false,error:e.error?.description||'contact_failed'}}}

async function createFA(cid,upi){try{const r=await rz('POST','/v1/fund_accounts',{contact_id:cid,account_type:'vpa',vpa:{address:upi}});return{success:true,fund_account_id:r.id}}catch(e){return{success:false,error:e.error?.description||'fa_failed'}}}

async function createPayout(faid,paise,disId,wid,type){const ref=makeRef(disId,wid);try{const r=await rz('POST','/v1/payouts',{account_number:ACCOUNT,fund_account_id:faid,amount:paise,currency:'INR',mode:'UPI',purpose:'payout',queue_if_low_balance:true,reference_id:ref,narration:`Arovy ${type.replace(/_/g,' ')} payout`.slice(0,30)});return{success:true,payout_id:r.id,status:r.status,utr:r.utr||null}}catch(e){return{success:false,error:e.error?.description||'payout_failed'}}}

async function processWorkerPayout(worker,amtRupees,disId,type){
  const result={worker_id:worker.worker_id,worker_name:worker.name,upi_id:worker.upi_id,amount_rupees:amtRupees,amount_paise:Math.round(amtRupees*100),steps:{contact:{attempted:false,success:false},fund_account:{attempted:false,success:false},payout:{attempted:false,success:false}},final_status:'pending',razorpay_payout_id:null,utr:null,error:null,processed_at:new Date().toISOString()}
  if(amtRupees<=0){result.final_status='skipped_zero_amount';return result}
  if(!worker.upi_id){result.final_status='skipped_no_upi';result.error='No UPI ID';return result}
  result.steps.contact.attempted=true;const c=await createContact(worker);result.steps.contact.success=c.success;result.steps.contact.contact_id=c.contact_id;result.steps.contact.error=c.error||null
  if(!c.success){result.final_status='failed_contact';result.error=`Contact: ${c.error}`;return result}
  result.steps.fund_account.attempted=true;const fa=await createFA(c.contact_id,worker.upi_id);result.steps.fund_account.success=fa.success;result.steps.fund_account.fund_account_id=fa.fund_account_id;result.steps.fund_account.error=fa.error||null
  if(!fa.success){result.final_status='failed_fund_account';result.error=`FA: ${fa.error}`;return result}
  result.steps.payout.attempted=true;const p=await createPayout(fa.fund_account_id,result.amount_paise,disId,worker.worker_id,type);result.steps.payout.success=p.success;result.steps.payout.error=p.error||null
  if(!p.success){result.final_status='failed_payout';result.error=`Payout: ${p.error}`;return result}
  result.final_status='success';result.razorpay_payout_id=p.payout_id;result.utr=p.utr;return result
}

async function processBatchPayouts(eligible,disId,type){
  const results=[];let succeeded=0,failed=0,skipped=0,totalPaid=0
  console.log(`[razorpay] processing ${eligible.length} payouts`)
  for(const item of eligible){
    const r=await processWorkerPayout(item.worker,item.amount,disId,type);results.push(r)
    if(r.final_status==='success'){succeeded++;totalPaid+=item.amount;console.log(`[razorpay] ✓ ${item.worker.name} ₹${item.amount}`)}
    else if(r.final_status.startsWith('skipped'))skipped++
    else{failed++;console.log(`[razorpay] ✗ ${item.worker.name}: ${r.error}`)}
    await new Promise(res=>setTimeout(res,300))
  }
  console.log(`[razorpay] done ✓${succeeded} ✗${failed} ~${skipped} ₹${totalPaid.toFixed(2)}`)
  return{results,summary:{succeeded,failed,skipped,totalPaid:+totalPaid.toFixed(2)}}
}

module.exports={processWorkerPayout,processBatchPayouts}
