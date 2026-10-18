const ITEMS=[
["Lençol de solteiro com elástico","Lençóis"],["Lençol de solteiro sem elástico","Lençóis"],["Lençol de casal com elástico","Lençóis"],["Lençol de casal sem elástico","Lençóis"],["Fronha","Roupa de cama"],
["Toalha de banho","Toalhas"],["Toalha de mãos","Toalhas"],["Edredom de solteiro","Edredons"],["Edredom de casal","Edredons"],["Travesseiro","Outros"],["Cortina de cama","Outros"],["Cobertor de solteiro","Cobertores"],["Cobertor de casal","Cobertores"]
];
const DEFAULT={
version:1, createdAt:new Date().toISOString(),
config:{roomsCouple:16,sharedRooms:1,singleBedsShared:4,workDays:5,startTime:"08:00",endTime:"17:00",breakMinutes:60,targetBuffer:25,occupancy:"",linenChanges:3,washer1:13,washer2:18,dryer1:11,dryer2:11,washCycle:60,dryCycle:60,curtainInterval:30},
records:[], qualityRecords:[], stock:null, stockHistory:[], notes:""
};
let db=loadDB();
function loadDB(){try{const x=JSON.parse(localStorage.getItem("hostelLaundry_v1"));if(x&&x.version===1){const loaded={...structuredClone(DEFAULT),...x,config:{...DEFAULT.config,...x.config}};loaded.records=(loaded.records||[]).map(r=>r.item==="Cobertor fino de casal"?{...r,item:"Cobertor de casal"}:r);loaded.qualityRecords=Array.isArray(loaded.qualityRecords)?loaded.qualityRecords:[];if(loaded.stock?.items?.["Cobertor fino de casal"]){const old=loaded.stock.items["Cobertor fino de casal"];loaded.stock.items["Cobertor de casal"]=loaded.stock.items["Cobertor de casal"]||{};for(const k of ["clean","inUse","dirty","unusable"]){if(old[k]!==undefined)loaded.stock.items["Cobertor de casal"][k]=num(loaded.stock.items["Cobertor de casal"][k])+num(old[k]);}delete loaded.stock.items["Cobertor fino de casal"];}return loaded;}}catch(e){}return structuredClone(DEFAULT)}
function persist(){try{localStorage.setItem("hostelLaundry_v1",JSON.stringify(db));document.getElementById("saveState").textContent="● Salvo neste aparelho";}catch(e){document.getElementById("saveState").textContent="⚠ Falha ao salvar";alert("Não foi possível salvar no navegador. Exporte um backup e verifique o espaço disponível.");}}
function today(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function num(v){return Number.isFinite(Number(v))?Number(v):0}
function fmt(n){return Math.round(n).toLocaleString("pt-BR")}
function dateFmt(s){if(!s)return "—";const [y,m,d]=s.split("-");return `${d}/${m}/${y}`}
function switchTab(id){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));if(id==="painel")renderDashboard();if(id==="registro")renderRecords();if(id==="estoque")renderStock();if(id==="qualidade")renderQuality();if(id==="previsao")renderForecast();if(id==="config")renderConfig();if(id==="dados")renderDataStats();window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
function populateItemSelect(){const el=document.getElementById("batchItems");if(!el)return;el.innerHTML=ITEMS.map(([n],i)=>`<label class="batch-row" for="batch-${i}"><span>${esc(n)}</span><input type="number" id="batch-${i}" data-batch-item="${esc(n)}" min="0" step="1" value="0" inputmode="numeric" aria-label="Quantidade de ${esc(n)}"></label>`).join("");el.querySelectorAll("input").forEach(input=>input.addEventListener("input",updateBatchTotal));updateBatchTotal()}
function updateBatchTotal(){const total=[...document.querySelectorAll("[data-batch-item]")].reduce((sum,input)=>sum+Math.max(0,Math.floor(num(input.value))),0);const label=document.getElementById("batchTotal");if(label)label.textContent=`${fmt(total)} ${total===1?"peça":"peças"}`}
function initFields(){
for(const id of ["roomsCouple","sharedRooms","singleBedsShared","workDays","startTime","endTime","breakMinutes","targetBuffer","occupancy","linenChanges","washer1","washer2","dryer1","dryer2","washCycle","dryCycle","curtainInterval"])if(document.getElementById(id))document.getElementById(id).value=db.config[id]??"";
document.getElementById("pDate").value=today();document.getElementById("stockDate").value=today();
}
function configFromForm(){const ids=["roomsCouple","sharedRooms","singleBedsShared","workDays","startTime","endTime","breakMinutes","targetBuffer","occupancy","linenChanges"];ids.forEach(id=>db.config[id]=document.getElementById(id).value===""?"":(["startTime","endTime"].includes(id)?document.getElementById(id).value:num(document.getElementById(id).value)));persist();renderAll();alert("Configurações salvas.");}
document.getElementById("configForm").addEventListener("submit",e=>{e.preventDefault();configFromForm()});
document.getElementById("machineForm").addEventListener("submit",e=>{e.preventDefault();["washer1","washer2","dryer1","dryer2","washCycle","dryCycle"].forEach(id=>db.config[id]=num(document.getElementById(id).value));persist();renderAll();alert("Equipamentos salvos.")});
function saveOtherConfig(){db.config.curtainInterval=Math.max(1,num(document.getElementById("curtainInterval").value)||30);persist();alert("Frequência salva.");}
document.getElementById("productionForm").addEventListener("submit",e=>{
e.preventDefault();const date=document.getElementById("pDate").value,worker=document.getElementById("pWorker").value,stage=document.getElementById("pStage").value,mins=Math.max(0,num(document.getElementById("pMinutes").value)),start=document.getElementById("pStart").value,end=document.getElementById("pEnd").value,notes=document.getElementById("pNotes").value.trim();
const entries=[...document.querySelectorAll("[data-batch-item]")].map(input=>({item:input.dataset.batchItem,qty:Math.max(0,Math.floor(num(input.value)))})).filter(row=>row.qty>0);
if(!entries.length){alert("Informe a quantidade de pelo menos um tipo de peça antes de salvar.");return;}
const now=new Date().toISOString(),batchId=crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random();entries.forEach((row,index)=>db.records.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),date,worker,item:row.item,qty:row.qty,stage,minutes:index===0?mins:0,start,end,notes,createdAt:now,batchId}));
persist();e.target.reset();document.getElementById("pDate").value=today();document.getElementById("pMinutes").value=0;document.querySelectorAll("[data-batch-item]").forEach(input=>input.value=0);updateBatchTotal();renderAll();renderRecords();alert(`Lote salvo: ${fmt(entries.length)} tipo(s) de peça, totalizando ${fmt(entries.reduce((sum,row)=>sum+row.qty,0))} peça(s).`);
});
document.getElementById("productionForm").addEventListener("reset",()=>setTimeout(()=>{document.getElementById("pDate").value=today();document.getElementById("pMinutes").value=0;updateBatchTotal()},0));
function clearFilters(){document.getElementById("filterFrom").value="";document.getElementById("filterTo").value="";renderRecords()}
function filteredRecords(){let a=document.getElementById("filterFrom")?.value||"",b=document.getElementById("filterTo")?.value||"";return db.records.filter(r=>(!a||r.date>=a)&&(!b||r.date<=b)).sort((x,y)=>y.date.localeCompare(x.date)||y.createdAt.localeCompare(x.createdAt))}
function renderRecords(){const rs=filteredRecords();const el=document.getElementById("recordTable");if(!rs.length){el.innerHTML='<div class="empty">Ainda não há registros para este período.</div>';return}
const groups=new Map();rs.forEach(r=>{const key=r.batchId||r.id;if(!groups.has(key))groups.set(key,{...r,rows:[],total:0,minutes:Math.max(0,num(r.minutes))});const g=groups.get(key);g.rows.push(r);g.total+=num(r.qty);g.minutes=Math.max(g.minutes,Math.max(0,num(r.minutes)));});
const batches=[...groups.values()];el.innerHTML=`<div class="tablewrap"><table><thead><tr><th>Data</th><th>Peças / etapa</th><th>Total</th><th>Tempo do lote</th><th>Responsável</th><th></th></tr></thead><tbody>${batches.map(g=>`<tr><td>${dateFmt(g.date)}</td><td>${g.rows.map(r=>`<b>${esc(r.item)}</b>: ${fmt(r.qty)}`).join("<br>")}<br><span class="muted">${esc(g.stage)}</span>${g.notes?`<br><span class="muted">${esc(g.notes)}</span>`:""}</td><td>${fmt(g.total)} peças</td><td>${g.minutes?fmt(g.minutes)+" min":"—"}</td><td>${esc(g.worker)}</td><td><button class="btn danger sm" onclick="deleteRecord('${g.id}')">Excluir lote</button></td></tr>`).join("")}</tbody></table></div>`}
function deleteRecord(id){const rec=db.records.find(r=>r.id===id);if(!confirm(rec?.batchId?"Excluir todo este lote de produção?":"Excluir este registro?"))return;db.records=db.records.filter(r=>rec?.batchId?r.batchId!==rec.batchId:r.id!==id);persist();renderAll();renderRecords()}
function buildStockForm(){
const el=document.getElementById("stockForm");
el.innerHTML=`<div class="itemrow" style="font-weight:800;color:var(--muted)"><div>Categoria</div><div>Limpa</div><div>Em uso</div><div class="optional">Suja/process.</div><div class="optional">Inservível</div></div>`+ITEMS.map(([name,group])=>{let s=db.stock?.items?.[name]||{};return `<div class="itemrow"><div class="name">${esc(name)}</div><input type="number" min="0" step="1" aria-label="${esc(name)} limpa" data-stock="${esc(name)}" data-state="clean" value="${s.clean??""}" placeholder="—"><input type="number" min="0" step="1" aria-label="${esc(name)} em uso" data-stock="${esc(name)}" data-state="inUse" value="${s.inUse??""}" placeholder="—"><input class="optional" type="number" min="0" step="1" aria-label="${esc(name)} suja" data-stock="${esc(name)}" data-state="dirty" value="${s.dirty??""}" placeholder="—"><input class="optional" type="number" min="0" step="1" aria-label="${esc(name)} inservível" data-stock="${esc(name)}" data-state="unusable" value="${s.unusable??""}" placeholder="—"></div>`}).join("");
document.getElementById("stockDate").value=db.stock?.date||today();document.getElementById("stockNotes").value=db.stock?.notes||"";
}
function saveStock(){const items={};document.querySelectorAll("[data-stock]").forEach(inp=>{const name=inp.dataset.stock,state=inp.dataset.state;if(!items[name])items[name]={};if(inp.value!=="")items[name][state]=Math.max(0,Math.floor(num(inp.value)))});
db.stock={date:document.getElementById("stockDate").value,notes:document.getElementById("stockNotes").value,items,updatedAt:new Date().toISOString()};db.stockHistory.push(JSON.parse(JSON.stringify(db.stock)));persist();renderAll();alert("Inventário salvo. Campos em branco continuam como não contados.");}
function clearStockForm(){if(!confirm("Limpar os campos do formulário? Isso não apaga o inventário já salvo."))return;document.querySelectorAll("[data-stock]").forEach(i=>i.value="");document.getElementById("stockNotes").value=""}
function stockTotals(){let counted=0,clean=0,dirty=0,inUse=0,unusable=0,knownItems=0;const items=db.stock?.items||{};for(const [name] of ITEMS){let s=items[name];if(!s)continue;const vals=["clean","dirty","inUse","unusable"].filter(k=>s[k]!==undefined);if(vals.length)knownItems++;for(const k of vals){counted+=num(s[k]);if(k==="clean")clean+=num(s[k]);if(k==="dirty")dirty+=num(s[k]);if(k==="inUse")inUse+=num(s[k]);if(k==="unusable")unusable+=num(s[k]);}}return {counted,clean,dirty,inUse,unusable,knownItems}}
function renderStock(){buildStockForm();const t=stockTotals();document.getElementById("stockSummary").innerHTML=db.stock?`<p class="small muted">Última contagem: ${dateFmt(db.stock.date)} · ${t.knownItems} de ${ITEMS.length} categorias com dados.</p><div class="grid"><div><div class="metric">${fmt(t.clean)}</div><div class="small muted">Limpa</div></div><div><div class="metric">${fmt(t.inUse)}</div><div class="small muted">Em uso</div></div><div><div class="metric">${fmt(t.dirty)}</div><div class="small muted">Suja/processamento</div></div><div><div class="metric">${fmt(t.unusable)}</div><div class="small muted">Inservível</div></div></div><p class="small muted">${esc(db.stock.notes||"Sem observações.")}</p>`:'<div class="empty">Nenhum inventário salvo ainda.</div>'}
function stageSum(date,stage){return db.records.filter(r=>r.date===date&&r.stage===stage).reduce((s,r)=>s+num(r.qty),0)}
function minsSum(date){const seen=new Set();return db.records.filter(r=>r.date===date).reduce((sum,r)=>{const key=r.batchId||r.id;if(seen.has(key))return sum;seen.add(key);return sum+num(r.minutes)},0)}
function dayRecords(date){return db.records.filter(r=>r.date===date)}
function hoursAvailable(){let [sh,sm]=(db.config.startTime||"08:00").split(":").map(Number),[eh,em]=(db.config.endTime||"17:00").split(":").map(Number);return Math.max(0,((eh*60+em)-(sh*60+sm)-num(db.config.breakMinutes))/60)}
function mean(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0}
function recentDays(n=28){let dates=[...new Set(db.records.filter(r=>r.stage==="Recebidas").map(r=>r.date))].sort().slice(-n);return dates}
function receiveByDate(date){return db.records.filter(r=>r.date===date&&r.stage==="Recebidas").reduce((s,r)=>s+num(r.qty),0)}
function finalByDate(date){return db.records.filter(r=>r.date===date&&r.stage==="Passadas/finalizadas").reduce((s,r)=>s+num(r.qty),0)}
function estimateDemandPerDay(){const dates=recentDays(28);return dates.length?mean(dates.map(receiveByDate)):null}
function forecastWeekdays(){const by=[[],[],[],[],[],[],[]];const dates=recentDays(56);dates.forEach(d=>{const dow=(new Date(d+"T12:00:00")).getDay();by[dow].push(receiveByDate(d))});return by.map(a=>a.length?mean(a):null)}
function productionRate(){const rs=db.records.filter(r=>r.stage==="Passadas/finalizadas"),groups=new Map();rs.forEach(r=>{const key=r.batchId||r.id;if(!groups.has(key))groups.set(key,{qty:0,minutes:0});groups.get(key).qty+=num(r.qty);groups.get(key).minutes=Math.max(groups.get(key).minutes,num(r.minutes))});const measured=[...groups.values()].filter(r=>r.minutes>0),q=measured.reduce((s,r)=>s+r.qty,0),m=measured.reduce((s,r)=>s+r.minutes,0);return m>0?q/(m/60):null}
function pendingLatest(){const latest=[...new Set(db.records.map(r=>r.date))].sort().pop();if(!latest)return 0;const a=stageSum(latest,"Pendentes ao fim do dia");return a}
function renderDashboard(){
const d=today(),todayRecords=dayRecords(d);document.getElementById("todayLabel").textContent=dateFmt(d);
document.getElementById("mDone").textContent=fmt(finalByDate(d));document.getElementById("mPending").textContent=fmt(pendingLatest());document.getElementById("mHours").textContent=(minsSum(d)/60).toLocaleString("pt-BR",{maximumFractionDigits:1})+"h";
const st=stockTotals();document.getElementById("mStock").textContent=db.stock?fmt(st.clean):"—";
const received=estimateDemandPerDay(),rate=productionRate(),hours=hoursAvailable(),capacity=rate?rate*hours:null;
let insights=[];
if(!db.records.length)insights.push(["neutral","Comece registrando as peças recebidas, as etapas concluídas e o tempo gasto. Ainda não há histórico para prever demanda ou capacidade."]);
else {
if(received!==null)insights.push(["neutral",`A média recente é de ${fmt(received)} peças recebidas por dia com registro, calculada sobre os últimos ${recentDays(28).length} dias registrados.`]);
if(rate!==null)insights.push(["neutral",`A produtividade observada na finalização é de ${rate.toLocaleString("pt-BR",{maximumFractionDigits:1})} peças por hora registrada. É uma média histórica, não uma meta obrigatória.`]);
if(received!==null&&capacity!==null){if(received>capacity)insights.push(["danger",`A demanda média recebida (${fmt(received)}/dia) supera a capacidade estimada a partir dos tempos registrados (${fmt(capacity)}/dia). Revise o fluxo, o estoque e os recursos antes de assumir horas extras.`]);else insights.push(["ok",`Com base nos registros disponíveis, a demanda média está abaixo da capacidade estimada. Continue monitorando os picos e a fila pendente.`])}
if(db.stock&&st.knownItems<ITEMS.length)insights.push(["warn",`O inventário cobre ${st.knownItems} de ${ITEMS.length} categorias. Complete a contagem para evitar decisões baseadas em estoque parcial.`]);
if(!db.stock)insights.push(["warn","O inventário inicial ainda não foi feito. O sistema não presume que o estoque seja zero."]);
}
document.getElementById("insights").innerHTML=insights.map(([kind,txt])=>`<div class="notice ${kind==="danger"?"danger":kind==="warn"?"warn":kind==="ok"?"":"neutral"}">${esc(txt)}</div>`).join("");
document.getElementById("capacitySummary").innerHTML=`<p><b>Jornada configurada:</b> ${hours.toLocaleString("pt-BR",{maximumFractionDigits:1})} horas úteis por dia, de segunda a sexta (configurável).</p><p><b>Capacidade observada:</b> ${rate===null?"aguardando registros de peças finalizadas com tempo":fmt(capacity)+" peças/dia (estimativa histórica)"}</p><p class="small muted">A capacidade só será confiável quando os tempos forem registrados de forma consistente para cada etapa e categoria.</p>`;
const last=[...db.records].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).slice(0,5);
document.getElementById("recentRecords").innerHTML=last.length?`<div class="tablewrap"><table><thead><tr><th>Data</th><th>Categoria</th><th>Etapa</th><th>Qtd.</th></tr></thead><tbody>${last.map(r=>`<tr><td>${dateFmt(r.date)}</td><td>${esc(r.item)}</td><td>${esc(r.stage)}</td><td>${fmt(r.qty)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">Os registros recentes aparecerão aqui.</div>';
}
function renderForecast(){
const dates=recentDays(28),daily=estimateDemandPerDay(),rate=productionRate(),hours=hoursAvailable(),capacity=rate?rate*hours:null;
document.getElementById("fDaily").textContent=daily===null?"—":fmt(daily);
document.getElementById("fWeek").textContent=daily===null?"—":fmt(daily*5);
document.getElementById("fMonth").textContent=daily===null?"—":fmt(daily*30);
document.getElementById("fRate").textContent=rate===null?"—":rate.toLocaleString("pt-BR",{maximumFractionDigits:1});
document.getElementById("weekdayForecast").innerHTML=dates.length?weekdayBars():'<div class="empty">Registre peças recebidas em alguns dias para começar a identificar padrões por dia da semana.</div>';
document.getElementById("capacityForecast").innerHTML=daily===null?'<div class="empty">Sem histórico de recebimento suficiente.</div>':`<p>Demanda média diária registrada: <b>${fmt(daily)} peças</b>.</p><p>Capacidade diária estimada: <b>${capacity===null?"ainda não calculada":fmt(capacity)+" peças"}</b>.</p>${capacity===null?'<div class="notice warn">Registre tempo e quantidade na etapa “Passadas/finalizadas” para calcular peças por hora.</div>':`<div class="bar"><span style="width:${Math.min(100,capacity?daily/capacity*100:0)}%"></span></div><p class="small muted">A demanda equivale a ${capacity?Math.round(daily/capacity*100):"—"}% da capacidade estimada. A comparação é indicativa e não considera diferenças de complexidade entre peças.</p>`}`;
const per={};ITEMS.forEach(([name])=>{const ds=[...new Set(db.records.filter(r=>r.item===name&&r.stage==="Recebidas").map(r=>r.date))].sort().slice(-28);if(ds.length)per[name]=mean(ds.map(d=>db.records.filter(r=>r.date===d&&r.item===name&&r.stage==="Recebidas").reduce((s,r)=>s+r.qty,0)))});
document.getElementById("itemForecast").innerHTML=Object.keys(per).length?`<div class="tablewrap"><table><thead><tr><th>Peça</th><th>Média por dia registrado</th><th>Previsão 5 dias úteis</th><th>Previsão 30 dias corridos</th></tr></thead><tbody>${Object.entries(per).map(([n,v])=>`<tr><td>${esc(n)}</td><td>${fmt(v)}</td><td>${fmt(v*5)}</td><td>${fmt(v*30)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">Ainda não há registros de recebimento por categoria para gerar previsão por peça.</div>';
}
function weekdayBars(){const by=forecastWeekdays(),names=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"],known=by.filter(x=>x!==null);const max=Math.max(1,...known);return by.map((v,i)=>v===null?"":`<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${names[i]}</span><b>${fmt(v)} peças</b></div><div class="bar"><span style="width:${v/max*100}%"></span></div></div>`).join("")||'<div class="empty">Ainda não há dados por dia da semana.</div>'}
function renderConfig(){
for(const id of ["roomsCouple","sharedRooms","singleBedsShared","workDays","startTime","endTime","breakMinutes","targetBuffer","occupancy","linenChanges","washer1","washer2","dryer1","dryer2","washCycle","dryCycle","curtainInterval"])document.getElementById(id).value=db.config[id]??"";
const kit=[["Quarto de casal","1 lençol casal com elástico; 1 sem elástico; 2 fronhas; 2 toalhas de banho; 1 edredom casal; 1 cobertor fino casal"],["Quarto compartilhado","4 lençóis solteiro com elástico; 4 sem elástico; 4 fronhas; 4 toalhas de banho; 1 toalha de mãos"],["Cortina de cama","Troca aproximada mensal ou quando necessário"],["Longa permanência","3 trocas semanais conforme informação inicial"]];
document.getElementById("kitTable").innerHTML=`<div class="tablewrap"><table><thead><tr><th>Regra</th><th>Composição / frequência registrada</th></tr></thead><tbody>${kit.map(a=>`<tr><td><b>${esc(a[0])}</b></td><td>${esc(a[1])}</td></tr>`).join("")}</tbody></table></div>`;
}
function renderDataStats(){document.getElementById("dataStats").innerHTML=`<p><b>Registros de produção:</b> ${db.records.length}</p><p><b>Ocorrências de qualidade:</b> ${(db.qualityRecords||[]).length}</p><p><b>Inventários guardados no histórico:</b> ${db.stockHistory.length}</p><p><b>Último inventário:</b> ${db.stock?dateFmt(db.stock.date):"não realizado"}</p><p><b>Último backup exportado:</b> não rastreado pelo aplicativo</p>`}

function initQuality(){
  const opts=ITEMS.map(([name])=>`<option>${esc(name)}</option>`).join("");
  document.getElementById("qItem").innerHTML=opts;
  document.getElementById("qFilterItem").innerHTML='<option value="">Todas as peças</option>'+opts;
  document.getElementById("qDate").value=today();
  document.getElementById("qualityForm").addEventListener("submit",e=>{
    e.preventDefault();
    const rec={id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),date:document.getElementById("qDate").value,item:document.getElementById("qItem").value,qty:Math.max(1,Math.floor(num(document.getElementById("qQty").value))),defect:document.getElementById("qDefect").value,stage:document.getElementById("qStage").value,action:document.getElementById("qAction").value,status:document.getElementById("qStatus").value,responsible:document.getElementById("qResponsible").value.trim(),notes:document.getElementById("qNotes").value.trim(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    db.qualityRecords.unshift(rec);persist();renderQuality();renderDataStats();e.target.reset();document.getElementById("qDate").value=today();document.getElementById("qQty").value=1;alert("Ocorrência registrada.");
  });
  document.getElementById("qFilterStatus").addEventListener("change",renderQuality);
  document.getElementById("qFilterItem").addEventListener("change",renderQuality);
}
function updateQualityStatus(id,status){
 const rec=db.qualityRecords.find(r=>r.id===id);if(!rec)return;
 rec.status=status;rec.updatedAt=new Date().toISOString();
 if(status==="Descartada")rec.action="Descartar";
 if(status==="Recuperada"&&["Descartar","Separar para avaliação"].includes(rec.action))rec.action="Devolver para uso";
 persist();renderQuality();renderDataStats();
}
function deleteQualityRecord(id){if(!confirm("Excluir esta ocorrência do histórico?"))return;db.qualityRecords=db.qualityRecords.filter(r=>r.id!==id);persist();renderQuality();renderDataStats();}
function renderQuality(){
 if(!document.getElementById("qualityTable"))return;
 const list=db.qualityRecords||[];
 const status=document.getElementById("qFilterStatus")?.value||"",item=document.getElementById("qFilterItem")?.value||"";
 const filtered=list.filter(r=>(!status||r.status===status)&&(!item||r.item===item));
 const sum=(arr,st)=>arr.filter(r=>!st||r.status===st).reduce((a,r)=>a+num(r.qty),0);
 document.getElementById("qOpen").textContent=fmt(list.filter(r=>!["Recuperada","Descartada"].includes(r.status)).length);
 document.getElementById("qWaiting").textContent=fmt(list.filter(r=>["Aberta","Aguardando avaliação","Em tratamento"].includes(r.status)).reduce((a,r)=>a+num(r.qty),0));
 document.getElementById("qRecovered").textContent=fmt(sum(list,"Recuperada"));
 document.getElementById("qDiscarded").textContent=fmt(sum(list,"Descartada"));
 const counts={};list.filter(r=>!["Recuperada","Descartada"].includes(r.status)).forEach(r=>counts[r.item]=(counts[r.item]||0)+num(r.qty));
 const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
 document.getElementById("qualityByItem").innerHTML=top.length?'<h3>Peças aguardando solução</h3>'+top.map(([n,q])=>`<div class="quality-line"><span>${esc(n)}</span><b>${fmt(q)} peça(s)</b></div>`).join(""):'<p class="muted small">Nenhuma ocorrência pendente registrada.</p>';
 if(!filtered.length){document.getElementById("qualityTable").innerHTML='<p class="muted small">Nenhuma ocorrência para os filtros selecionados.</p>';return;}
 document.getElementById("qualityTable").innerHTML=`<div class="tablewrap"><table><thead><tr><th>Data</th><th>Peça / quantidade</th><th>Defeito</th><th>Etapa</th><th>Providência</th><th>Situação</th><th>Responsável / observações</th><th>Ações</th></tr></thead><tbody>${filtered.map(r=>`<tr><td>${dateFmt(r.date)}</td><td>${esc(r.item)}<br><b>${fmt(r.qty)} un.</b></td><td>${esc(r.defect)}</td><td>${esc(r.stage)}</td><td>${esc(r.action)}</td><td><span class="pill ${r.status==="Descartada"?"bad":r.status==="Recuperada"?"good":"warn"}">${esc(r.status)}</span></td><td>${esc(r.responsible||"—")}<br><span class="small muted">${esc(r.notes||"")}</span></td><td><div class="quality-actions"><select aria-label="Atualizar situação" onchange="updateQualityStatus('${esc(r.id)}',this.value)">${["Aberta","Aguardando avaliação","Em tratamento","Recuperada","Descartada"].map(s=>`<option ${r.status===s?"selected":""}>${s}</option>`).join("")}</select><button class="btn danger smallbtn" onclick="deleteQualityRecord('${esc(r.id)}')">Excluir</button></div></td></tr>`).join("")}</tbody></table></div>`;
}
function exportQualityCSV(){const header=["data","peca","quantidade","defeito","etapa_identificacao","providencia","situacao","responsavel","observacoes"];const rows=(db.qualityRecords||[]).map(r=>[r.date,r.item,r.qty,r.defect,r.stage,r.action,r.status,r.responsible,r.notes]);download(`qualidade-lavanderia-${today()}.csv`,"\ufeff"+[header,...rows].map(r=>r.map(csvEscape).join(";")).join("\r\n"),"text/csv;charset=utf-8")}

function renderAll(){renderDashboard();renderRecords();renderStock();renderQuality();renderForecast();renderConfig();renderDataStats()}
function download(filename,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function exportJSON(){const payload={...db,exportedAt:new Date().toISOString(),app:"Lavanderia do Hostel",developer:"Thiago Fonseca"};download(`backup-lavanderia-${today()}.json`,JSON.stringify(payload,null,2),"application/json")}
document.getElementById("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const x=JSON.parse(await file.text());if(!x||x.version!==1||!Array.isArray(x.records)||!x.config)throw new Error("Estrutura de backup não reconhecida.");if(!confirm("A importação substituirá os dados atuais deste aparelho. Faça backup antes, se necessário. Continuar?"))return;db={...structuredClone(DEFAULT),...x,config:{...DEFAULT.config,...x.config},records:x.records,stock:x.stock||null,stockHistory:x.stockHistory||[]};persist();initFields();renderAll();alert("Backup importado com sucesso.");}catch(err){alert("Não foi possível importar o arquivo: "+err.message)}finally{e.target.value=""}});
function csvEscape(v){return '"'+String(v??"").replace(/"/g,'""')+'"'}
function exportCSV(){const header=["data","responsavel_etapa","peca","quantidade","etapa","tempo_minutos","inicio","fim","observacoes"];const rows=db.records.map(r=>[r.date,r.worker,r.item,r.qty,r.stage,r.minutes,r.start,r.end,r.notes]);download(`producao-lavanderia-${today()}.csv`,"\ufeff"+[header,...rows].map(r=>r.map(csvEscape).join(";")).join("\r\n"),"text/csv;charset=utf-8")}
function exportStockCSV(){const rows=[["peca","limpa","em_uso","suja_processamento","inservivel"]];ITEMS.forEach(([name])=>{const s=db.stock?.items?.[name]||{};rows.push([name,s.clean??"",s.inUse??"",s.dirty??"",s.unusable??""])});download(`inventario-lavanderia-${today()}.csv`,"\ufeff"+rows.map(r=>r.map(csvEscape).join(";")).join("\r\n"),"text/csv;charset=utf-8")}
function exportAnalysis(){const daily={};[...new Set(db.records.map(r=>r.date))].sort().forEach(d=>{daily[d]={received:stageSum(d,"Recebidas"),washed:stageSum(d,"Lavadas"),dried:stageSum(d,"Secas"),finished:stageSum(d,"Passadas/finalizadas"),pending:stageSum(d,"Pendentes ao fim do dia"),minutes:minsSum(d)}});const payload={app:"Lavanderia do Hostel",developer:"Thiago Fonseca",generatedAt:new Date().toISOString(),config:db.config,stock:db.stock,records:db.records,qualityRecords:db.qualityRecords||[],dailySummary:daily,derived:{averageReceivedPerRecordedDay:estimateDemandPerDay(),finishingPiecesPerHour:productionRate(),configuredAvailableHoursPerDay:hoursAvailable(),stockTotals:stockTotals()},notes:"Previsões simples com base nos registros disponíveis; valores ausentes não devem ser interpretados como zero."};download(`analise-lavanderia-${today()}.json`,JSON.stringify(payload,null,2),"application/json")}
function resetData(){if(!confirm("Tem certeza? Isso apagará todos os dados locais deste navegador. Exporte um backup antes. Esta ação não pode ser desfeita."))return;if(!confirm("Confirme novamente para apagar o histórico, o inventário e as configurações."))return;localStorage.removeItem("hostelLaundry_v1");db=structuredClone(DEFAULT);initFields();populateItemSelect();renderAll();alert("Dados locais apagados.")}

async function exportExcel(){
  // Geração XLSX local: XML + ZIP STORE, sem bibliotecas ou serviços externos.
  const escXml = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
  const colName = n => {let s="";while(n){let r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26)}return s};
  const serialDate = d => {const t = new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor((t-new Date(1899,11,30))/86400000)};
  function xmlCell(value, ref, style=0){
    if(value===null||value===undefined||value==="") return `<c r="${ref}" s="${style}"/>`;
    if(value instanceof Date) return `<c r="${ref}" s="${style}" t="n"><v>${serialDate(value)}</v></c>`;
    if(typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}" s="${style}" t="n"><v>${value}</v></c>`;
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escXml(value)}</t></is></c>`;
  }
  function buildSheet(def, idx){
    const rows=[]; const colCount=def.headers.length, lastCol=colName(colCount);
    const addRow=(r, cells, height)=>rows.push(`<row r="${r}"${height?` ht="${height}" customHeight="1"`:""}>${cells}</row>`);
    addRow(1,xmlCell(def.title,`A1`,1)+`<c r="${lastCol}1" s="1"/>`,30);
    addRow(2,xmlCell(def.subtitle,`A2`,2)+`<c r="${lastCol}2" s="2"/>`,23);
    addRow(3,xmlCell(`Gerado em ${new Date().toLocaleString("pt-BR")} · Desenvolvido por Thiago Fonseca`,`A3`,3)+`<c r="${lastCol}3" s="3"/>`,20);
    addRow(4,def.headers.map((v,i)=>xmlCell(v,`${colName(i+1)}4`,4)).join(""),30);
    def.rows.forEach((row,ri)=>addRow(ri+5,row.map((v,ci)=>xmlCell(v,`${colName(ci+1)}${ri+5}`,ri%2?6:5)).join(""),22));
    const cols=`<cols>${def.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.max(10,Math.min(60,w))}" customWidth="1"/>`).join("")}</cols>`;
    const merges=`<mergeCells count="3"><mergeCell ref="A1:${lastCol}1"/><mergeCell ref="A2:${lastCol}2"/><mergeCell ref="A3:${lastCol}3"/></mergeCells>`;
    const auto=def.rows.length?`<autoFilter ref="A4:${lastCol}${4+def.rows.length}"/>`:"";
    const colsXml=cols;
    const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/>${colsXml}<sheetData>${rows.join("")}</sheetData>${merges}${auto}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`;
    return xml;
  }
  const prodRows=[...db.records].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(r=>[
    r.date?dateFmt(r.date):"",r.worker||"",r.item||"",num(r.qty),r.stage||"",r.minutes==null?"":num(r.minutes),r.start||"",r.end||"",r.notes||""
  ]);
  const stockRows=ITEMS.map(([name])=>{const s=db.stock?.items?.[name]||{};const vals=["clean","inUse","dirty","unusable"].map(k=>s[k]===undefined?"":num(s[k]));const total=vals.every(v=>v==="")?"":vals.reduce((a,v)=>a+(v===""?0:v),0);return [name,...vals,total,db.stock?.date?dateFmt(db.stock.date):"",db.stock?.notes||""];});
  const byStage={};db.records.forEach(r=>{const k=r.stage||"Sem etapa";byStage[k]=(byStage[k]||0)+num(r.qty)});
  const receivedDates=[...new Set(db.records.filter(r=>r.stage==="Recebidas").map(r=>r.date))].sort();
  const stock=stockTotals();
  const metricRows=[
    ["Unidade","São Roque"],["Quartos de casal configurados",num(db.config.roomsCouple)],["Quartos compartilhados configurados",num(db.config.sharedRooms)],["Camas de solteiro no compartilhado",num(db.config.singleBedsShared)],["Dias de trabalho por semana",num(db.config.workDays)],["Jornada diária líquida (horas)",Number(hoursAvailable().toFixed(2))],["Margem de segurança configurada (%)",num(db.config.targetBuffer)],["Trocas semanais configuradas para longa permanência",num(db.config.linenChanges)],["Dias com registros de recebimento",receivedDates.length],["Média de peças recebidas por dia registrado",estimateDemandPerDay()==null?"":Number(estimateDemandPerDay().toFixed(2))],["Taxa observada de finalização (peças/h)",productionRate()==null?"":Number(productionRate().toFixed(2))],["Capacidade diária estimada (peças)",productionRate()==null?"":Math.round(productionRate()*hoursAvailable())],["Total inventário contado (peças)",stock.counted],["Peças limpas contadas",stock.clean],["Peças em uso contadas",stock.inUse],["Peças sujas / processamento contadas",stock.dirty],["Peças inservíveis contadas",stock.unusable],["Aviso metodológico","Indicadores preliminares, dependentes de registros consistentes. Capacidade nominal de máquinas não equivale à capacidade observada."]
  ];
  const configRows=Object.entries(db.config).map(([k,v])=>[k,typeof v==="number"?v:String(v??"")]);
  const defs=[
    {name:"Produção",title:"PRODUÇÃO DA LAVANDERIA",subtitle:"Unidade São Roque · Registros por peça, etapa e dia",headers:["Data","Responsável / etapa","Peça","Quantidade (un.)","Etapa","Tempo (min)","Início","Fim","Observações"],rows:prodRows,widths:[15,24,34,18,25,15,13,13,42]},
    {name:"Inventário",title:"INVENTÁRIO FÍSICO",subtitle:"Campos sem contagem permanecem vazios; não representam estoque zero",headers:["Peça / categoria","Limpa","Em uso","Suja / processamento","Inservível","Total contado","Última contagem","Observações"],rows:stockRows,widths:[36,14,14,24,15,17,18,42]},
    {name:"Indicadores",title:"INDICADORES E CONFIGURAÇÕES",subtitle:"Métricas derivadas dos registros disponíveis · Unidade São Roque",headers:["Indicador","Valor"],rows:metricRows,widths:[50,92]},
    {name:"Resumo por etapa",title:"RESUMO POR ETAPA",subtitle:"Total de quantidades registradas; não representa necessariamente saldo físico",headers:["Etapa","Quantidade total registrada (peças)"],rows:Object.entries(byStage).sort((a,b)=>a[0].localeCompare(b[0])),widths:[34,42]},
    {name:"Qualidade",title:"QUALIDADE E OCORRÊNCIAS",subtitle:"Histórico de peças manchadas, rasgadas, recuperadas ou descartadas",headers:["Data","Peça","Quantidade","Defeito","Etapa","Providência","Situação","Responsável","Observações"],rows:(db.qualityRecords||[]).map(r=>[r.date?new Date(r.date+"T12:00:00"):"",r.item,r.qty,r.defect,r.stage,r.action,r.status,r.responsible,r.notes]),widths:[15,34,14,22,25,30,24,22,42]},
    {name:"Configuração",title:"CONFIGURAÇÃO DO SISTEMA",subtitle:"Unidade São Roque · Valores definidos no aplicativo",headers:["Campo","Valor"],rows:configRows,widths:[42,42]}
  ];
  const sheetXml=defs.map((d,i)=>buildSheet(d,i+1));
  const files={
    "[Content_Types].xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${defs.map((d,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    "_rels/.rels":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${defs.map((d,i)=>`<sheet name="${escXml(d.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets><calcPr calcId="191029"/></workbook>`,
    "xl/_rels/workbook.xml.rels":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${defs.map((d,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${defs.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><i/><sz val="10"/><color rgb="FF52647C"/><name val="Aptos"/></font><font><sz val="9"/><color rgb="FF64748B"/><name val="Aptos"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF172F4F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF0FA"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2459A6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD6E1F0"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="4" fillId="4" borderId="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  };
  sheetXml.forEach((xml,i)=>files[`xl/worksheets/sheet${i+1}.xml`]=xml);
  function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++){c^=bytes[i];for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1)}return (c^0xffffffff)>>>0}
  const enc=new TextEncoder();const chunks=[];let offset=0;const central=[];
  const u16=n=>[n&255,(n>>>8)&255];const u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  for(const [name,content] of Object.entries(files)){
    const nb=enc.encode(name), data=enc.encode(content), crc=crc32(data);
    const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...nb,...data]);
    chunks.push(local);
    const cen=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...nb]);
    central.push(cen);offset+=local.length;
  }
  const centralOffset=offset, centralSize=central.reduce((n,c)=>n+c.length,0);
  const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(central.length),...u16(central.length),...u32(centralSize),...u32(centralOffset),...u16(0)]);
  const all=[...chunks,...central,end];const blob=new Blob(all,{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`lavanderia-sao-roque-${today()}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

populateItemSelect();initFields();initQuality();document.getElementById("todayLabel").textContent=dateFmt(today());renderAll();
