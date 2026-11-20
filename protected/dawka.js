// TMR Mixer — moduł chroniony: Ustalanie dawki (kg w wozie → kg na sztukę), niedojady, dawki pochodne
// Ten plik NIE jest publikowany na stronie. Workflow wgrywa go do Firestore (kolekcja modules),
// a aplikacja pobiera go dopiero po zalogowaniu użytkownika z dostępem do funkcji „dawka”.
// Kod korzysta z funkcji i danych rdzenia aplikacji (index.html).

// ====== DAWKA (Ustalanie) ======
function resetNiedojady(){document.getElementById('d-niedojady').value='';document.getElementById('d-niedojady-result').innerHTML='';document.getElementById('d-niedojady-pdf-btn').style.display='none'}
function newD(){dId=null;dIngs=[];dParentId=null;dExtraIngs=[];document.getElementById('d-title').value='';document.getElementById('d-note').value='';document.getElementById('d-szt').value='50';document.getElementById('d-topbar').textContent='Nowa dawka';document.getElementById('d-del-btn').style.display='none';resetNiedojady();renderD();dOrig=snapshotD();dIsDirty=false;show('scr-d-edit');setTimeout(function(){document.getElementById('d-title').focus()},50)}
function openD(id){
  var d=dDoses.find(function(x){return x.id===id});if(!d)return;
  dId=id;dParentId=d.parentId||null;
  if(dParentId&&!dDoses.find(function(x){return x.id===dParentId})){dParentId=null;d.parentId=null;d.extraIngs=[];saveAll()}
  dExtraIngs=dParentId?JSON.parse(JSON.stringify(d.extraIngs||[])):[];
  dIngs=dParentId?[]:stripExtra(d.ings);
  document.getElementById('d-title').value=d.title;document.getElementById('d-note').value=d.note||'';document.getElementById('d-szt').value=d.szt;document.getElementById('d-topbar').textContent=d.title;document.getElementById('d-del-btn').style.display='flex';
  resetNiedojady();renderD();dOrig=snapshotD();dIsDirty=false;show('scr-d-edit');
}
function backD(){markDirtyD();if(dIsDirty){ask({title:'Niezapisane zmiany',msg:'Masz niezapisane zmiany w tej dawce.',ok:'Wyjdź bez zapisu',cancel:'Zostań',danger:true,onOk:leaveD});return}leaveD()}
function leaveD(){dIsDirty=false;show('scr-main');showTab('d')}
function saveD(){
  var t=document.getElementById('d-title').value.trim()||'Bez nazwy';
  var dup=findDuplicateTitle(dDoses,t,dId);
  if(dup){var nt=uniqueTitle(dDoses,t,dId);ask({title:'Taka nazwa już istnieje',msg:'Dawka „'+t+'” już jest na liście. Zapisać jako „'+nt+'”?',ok:'Zapisz jako „'+nt+'”',onOk:function(){document.getElementById('d-title').value=nt;doSaveD(nt)}});return}
  doSaveD(t);
}
function doSaveD(t){
  var n=document.getElementById('d-note').value.trim(),s=parseInt(document.getElementById('d-szt').value)||50;
  if(dId){var d=dDoses.find(function(x){return x.id===dId});if(d){d.title=t;d.note=n;d.szt=s;d.updatedAt=Date.now();if(dParentId){d.parentId=dParentId;d.extraIngs=JSON.parse(JSON.stringify(dExtraIngs));d.ings=getDDoseIngs(d,{})}else{d.parentId=null;d.extraIngs=[];d.ings=JSON.parse(JSON.stringify(dIngs))}}}
  else{dId='dd'+Date.now();dDoses.push({id:dId,title:t,note:n,szt:s,parentId:dParentId||null,extraIngs:dParentId?JSON.parse(JSON.stringify(dExtraIngs)):[],ings:JSON.parse(JSON.stringify(dParentId?getResolvedDIngs():dIngs)),createdAt:Date.now()});document.getElementById('d-del-btn').style.display='flex'}
  document.getElementById('d-topbar').textContent=t;syncDerivedDDoses();saveAll();dOrig=snapshotD();dIsDirty=false;flash('d-save-btn');toast('Zapisano dawkę');
}
function delD(){if(!dId){leaveD();return}deleteDose('d',dId,leaveD)}
function dupD(){dId=null;var t=uniqueTitle(dDoses,(document.getElementById('d-title').value||'Dawka')+' (kopia)',null);document.getElementById('d-title').value=t;document.getElementById('d-topbar').textContent=t;document.getElementById('d-del-btn').style.display='none';markDirtyD();dIsDirty=true;toast('Utworzono kopię — zapisz, aby ją zachować')}
function addD(){var v=document.getElementById('d-sel-val').value;if(!v){toast('Wybierz surowiec',true);return}var kg=parseFloat(document.getElementById('d-kg').value);if(!kg||kg<=0){toast('Podaj kg na wóz',true);return}var p=v.split('|'),nm=p[0],ct=p[1],sm=parseFloat(p[2])||88;if(dParentId){dExtraIngs.push({name:nm,cat:ct,sm:sm,kgWoz:kg})}else{dIngs.push({name:nm,cat:ct,sm:sm,kgWoz:kg})}document.getElementById('d-kg').value='';document.getElementById('d-sel-val').value='';document.getElementById('d-pick-label').textContent='Wybierz surowiec\u2026';markDirtyD();renderD()}
function rmD(i){dIngs.splice(i,1);markDirtyD();renderD()}
function mvD(i,d){var j=i+d;if(j<0||j>=dIngs.length)return;var t=dIngs[i];dIngs[i]=dIngs[j];dIngs[j]=t;markDirtyD();renderD()}
function ukD(i,v){dIngs[i].kgWoz=parseFloat(v)||0;markDirtyD();renderD()}
// ===== NIEDOJADY - realne pobranie paszy =====
function calcNiedojady(){
  var el=document.getElementById('d-niedojady-result');
  var pdfBtn=document.getElementById('d-niedojady-pdf-btn');
  var niedojadyVal=parseFloat(document.getElementById('d-niedojady').value);
  var ings=getResolvedDIngs();
  var tw=ings.reduce(function(a,s){return a+s.kgWoz},0);
  var szt=parseInt(document.getElementById('d-szt').value)||0;
  if(!niedojadyVal||niedojadyVal<=0||tw<=0){el.innerHTML='';pdfBtn.style.display='none';return}
  if(niedojadyVal>=tw){el.innerHTML='<div class="hn warn"><i class="ti ti-alert-triangle"></i><div>Niedojady nie mogą być większe niż cała dawka ('+tw.toFixed(0)+' kg).</div></div>';pdfBtn.style.display='none';return}
  var pobranePct=(tw-niedojadyVal)/tw*100;
  var niedopadySzt=szt>0?(niedojadyVal/szt).toFixed(2):'—';
  var zjedzoneTotal=tw-niedojadyVal;
  var zjedzoneNaSzt=szt>0?(zjedzoneTotal/szt).toFixed(2):'—';
  var rows=ings.map(function(s){
    var zjedzone=s.kgWoz*pobranePct/100;
    var zjedzNaSzt=szt>0?(zjedzone/szt).toFixed(2):'—';
    var zadanoNaSzt=szt>0?(s.kgWoz/szt).toFixed(2):'—';
    return '<div class="rw"><div style="flex:1"><div class="rname">'+esc(s.name)+'</div><div class="cp cv">zadano: '+s.kgWoz.toFixed(1)+' kg ('+zadanoNaSzt+' kg/szt)</div></div><div style="text-align:right"><div style="font-size:16px;font-weight:700;color:var(--gd)">'+zjedzone.toFixed(1)+' kg</div><div style="font-size:11px;color:var(--gd);font-weight:600">'+zjedzNaSzt+' kg/szt</div></div></div>';
  }).join('');
  el.innerHTML='<div class="s2">'
    +sb('var(--gd)',pobranePct.toFixed(1)+'%','pobranie dawki')
    +sb('#A32D2D',niedojadyVal.toFixed(1)+' kg','niedojady łącznie')
    +'</div><div class="s2">'
    +sb('var(--gd)',zjedzoneNaSzt+' kg','zjedzone / szt')
    +sb('#A32D2D',niedopadySzt+' kg','niedojady / szt')
    +'</div><div class="ls">'+rows+'</div>';
  pdfBtn.style.display='flex';
}
function pdfNiedojady(){
  var title=document.getElementById('d-title').value.trim()||'Dawka';
  var niedojadyVal=parseFloat(document.getElementById('d-niedojady').value)||0;
  var dIngsAll=getResolvedDIngs();
  var tw=dIngsAll.reduce(function(a,s){return a+s.kgWoz},0);
  var szt=parseInt(document.getElementById('d-szt').value)||0;
  if(tw<=0||niedojadyVal<=0){toast('Wpisz niedojady',true);return}
  var pobranePct=(tw-niedojadyVal)/tw*100;
  var zjedzoneTotal=tw-niedojadyVal;
  var rows=dIngsAll.map(function(s){var zjedzone=s.kgWoz*pobranePct/100;return {name:s.name,zadano:s.kgWoz,zjedzone:zjedzone,zadanoSzt:szt>0?s.kgWoz/szt:0,zjedzSzt:szt>0?zjedzone/szt:0}});
  var rowsHtml=rows.map(function(r,i){return '<tr><td style="padding:8px 12px"><strong>'+(i+1)+'. '+esc(r.name)+'</strong></td><td style="padding:8px 12px;text-align:right">'+r.zadano.toFixed(1)+'</td><td style="padding:8px 12px;text-align:right">'+(szt>0?r.zadanoSzt.toFixed(2):'—')+'</td><td style="padding:8px 12px;text-align:right;color:#0B6B2C;font-weight:700">'+r.zjedzone.toFixed(1)+'</td><td style="padding:8px 12px;text-align:right;color:#0B6B2C;font-weight:700">'+(szt>0?r.zjedzSzt.toFixed(2):'—')+'</td></tr>'}).join('');
  var previewHtml='<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Arial,sans-serif;color:#111}.hdr{background:#3C3489;color:#fff;padding:14px 16px}.kpis{display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px}table{width:100%;border-collapse:collapse;font-size:13px}tr{border-bottom:1px solid #eee}th{padding:8px 12px;text-align:left;background:#f0f0f0;font-size:11px}</style></head><body>'
    +'<div class="hdr"><h1 style="font-size:18px">Raport pobrania — '+escapeHtml(title)+'</h1><div style="font-size:12px;opacity:.8;margin-top:3px">'+szt+' szt · '+new Date().toLocaleDateString('pl')+'</div></div>'
    +'<div class="kpis"><div style="background:#f7f7f9;border-radius:8px;padding:10px;flex:1;min-width:80px"><div style="font-size:20px;font-weight:700;color:#0B6B2C">'+pobranePct.toFixed(1)+'%</div><div style="font-size:11px;color:#666">pobranie</div></div><div style="background:#f7f7f9;border-radius:8px;padding:10px;flex:1;min-width:80px"><div style="font-size:20px;font-weight:700;color:#A32D2D">'+niedojadyVal.toFixed(1)+'</div><div style="font-size:11px;color:#666">niedojady kg</div></div><div style="background:#f7f7f9;border-radius:8px;padding:10px;flex:1;min-width:80px"><div style="font-size:20px;font-weight:700;color:#0B6B2C">'+(szt>0?(zjedzoneTotal/szt).toFixed(2):'—')+'</div><div style="font-size:11px;color:#666">zjedzone/szt</div></div><div style="background:#f7f7f9;border-radius:8px;padding:10px;flex:1;min-width:80px"><div style="font-size:20px;font-weight:700;color:#A32D2D">'+(szt>0?(niedojadyVal/szt).toFixed(2):'—')+'</div><div style="font-size:11px;color:#666">niedojady/szt</div></div></div>'
    +'<table><thead><tr><th>Surowiec</th><th style="text-align:right">zadano kg</th><th style="text-align:right">zadano/szt</th><th style="text-align:right">zjedzone kg</th><th style="text-align:right">zjedzone/szt</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></body></html>';
  showPdfPreview(previewHtml,function(){
    closePdfPreview();
    var jsPDF=window.jspdf.jsPDF;var doc=new jsPDF({unit:'mm',format:'a4'});
    var W=210,H=297,M=14;
    doc.setFillColor(60,52,137);doc.rect(0,0,W,22,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);
    doc.text(plchars('Raport pobrania - '+title),M,12);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(210,210,230);
    doc.text(plchars(new Date().toLocaleDateString('pl')),M,18);
    var kpis=[['pobranie dawki',pobranePct.toFixed(1)+'%',[15,110,86]],['niedojady',niedojadyVal.toFixed(1)+' kg',[163,45,45]],['dawka łącznie',tw.toFixed(1)+' kg',[30,30,30]]];
    var ky=28,kw=(W-2*M)/3,kh=20;
    kpis.forEach(function(k,i){var kx=M+i*kw;doc.setFillColor(245,245,247);doc.roundedRect(kx,ky,kw-3,kh-3,2,2,'F');doc.setTextColor(k[2][0],k[2][1],k[2][2]);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(k[1],kx+4,ky+9);doc.setTextColor(110,110,110);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(plchars(k[0]),kx+4,ky+15)});
    var ty=ky+kh+4;
    doc.setFillColor(240,240,240);doc.rect(M,ty,W-2*M,7,'F');
    doc.setTextColor(80,80,80);doc.setFont('helvetica','bold');doc.setFontSize(8);
    doc.text('SUROWIEC',M+2,ty+4.7);doc.text('ZADANO',M+130,ty+4.7,{align:'right'});doc.text('ZJEDZONE',W-M-1,ty+4.7,{align:'right'});
    var ry=ty+7,n=rows.length,rowH=Math.min(10,(H-ry-20)/n);if(rowH<6)rowH=6;
    rows.forEach(function(r,i){var yy=ry+i*rowH;if(yy>H-22)return;doc.setDrawColor(238,238,238);doc.line(M,yy+rowH,W-M,yy+rowH);doc.setTextColor(25,25,25);doc.setFont('helvetica','bold');doc.setFontSize(Math.min(10,rowH*0.85));doc.text(plchars((i+1)+'. '+r.name).substring(0,40),M+2,yy+rowH*0.65);doc.setFont('helvetica','normal');doc.text(r.zadano.toFixed(1)+' kg',M+130,yy+rowH*0.65,{align:'right'});doc.setFont('helvetica','bold');doc.setTextColor(15,110,86);doc.text(r.zjedzone.toFixed(1)+' kg',W-M-1,yy+rowH*0.65,{align:'right'})});
    doc.save(sanitize('Pobranie_'+title)+'.pdf');
    toast('PDF zapisany w Pobranych');
  });
}
function renderD(){
  var szt=parseInt(document.getElementById('d-szt').value)||0;
  var el=document.getElementById('d-ing-list');
  if(dParentId){
    var parent=dDoses.find(function(x){return x.id===dParentId});
    if(!parent){dIngs=stripExtra(getResolvedDIngs());dParentId=null;dExtraIngs=[];renderD();return}
    var baseIngs=getDDoseIngs(parent,{});
    var extraTotal=dExtraIngs.reduce(function(a,e){return a+(parseFloat(e.kgWoz)||0)},0);
    var tw=baseIngs.reduce(function(a,s){return a+s.kgWoz},0)+extraTotal;
    var ph=szt>0?tw/szt:0;
    document.getElementById('d-ph').textContent=ph.toFixed(2);
    document.getElementById('d-woz').textContent=tw.toFixed(0);
    document.getElementById('d-cnt').textContent=(baseIngs.length+dExtraIngs.length);
    var baseRows=baseIngs.map(function(s){var p=szt>0?(s.kgWoz/szt).toFixed(2):'—';return '<div class="rw" style="opacity:.75"><div class="rn"><i class="ti ti-lock" style="font-size:13px"></i></div><div style="flex:1"><div class="rname">'+esc(s.name)+'</div>'+badge(s.cat)+'<div class="cp cv">'+s.kgWoz.toFixed(1)+' kg/wóz → '+p+' kg/szt</div></div></div>'}).join('');
    var extraRows=dExtraIngs.map(function(e,i){var kw=parseFloat(e.kgWoz)||0;var p=szt>0?(kw/szt).toFixed(2):'—';return '<div class="rw"><div class="rn">+</div><div style="flex:1"><div class="rname">'+esc(e.name)+'</div>'+badge(e.cat)+'<div class="cp cv">→ '+p+' kg/szt</div></div><div class="rr"><div class="kw"><input type="number" value="'+kw+'" min="0" step="1" inputmode="numeric" onchange="ukDExtra('+i+',this.value)" aria-label="kg na wóz"><span>kg/wóz</span></div><button class="dl" onclick="rmDExtra('+i+')" aria-label="Usuń"><i class="ti ti-x"></i></button></div></div>'}).join('');
    var lockHdr='<div class="hn"><i class="ti ti-git-branch"></i><div>Dawka pochodna. Surowce z bazy <strong>'+esc(parent.title)+'</strong> zmieniają się razem z bazą. Poniżej dodaj surowce dorzucane dla tej grupy.</div></div>';
    var extraHdr='<div class="sec-top">Dodatki dla tej grupy (kg na wóz)</div>';
    el.innerHTML=lockHdr+'<div class="ls">'+baseRows+'</div>'+extraHdr+(dExtraIngs.length?'<div class="ls">'+extraRows+'</div>':'<div class="em" style="padding:6px 16px 12px"><div class="em-s">Brak dodatków — dodaj surowiec poniżej (np. dodatkowa śruta).</div></div>');
    return;
  }
  var tw=dIngs.reduce(function(a,s){return a+s.kgWoz},0),ph=szt>0?tw/szt:0;
  document.getElementById('d-ph').textContent=ph.toFixed(2);document.getElementById('d-woz').textContent=tw.toFixed(0);document.getElementById('d-cnt').textContent=dIngs.length;
  if(!dIngs.length){el.innerHTML='<div class="em"><div class="em-i" style="color:var(--pm)"><i class="ti ti-adjustments"></i></div><div class="em-t">Brak surowców</div><div class="em-s">Dodaj surowiec poniżej i wpisz, ile kg trafia do wozu.</div></div>';return}
  var cum=0;
  el.innerHTML='<div class="ls">'+dIngs.map(function(s,i){cum+=s.kgWoz;var p=szt>0?(s.kgWoz/szt).toFixed(2):'—';return '<div class="rw"><div class="rn">'+(i+1)+'</div><div style="flex:1;min-width:0"><div class="rname">'+esc(s.name)+'</div>'+badge(s.cat)+'<div class="cp cv">→ '+p+' kg/szt</div><div class="cp" style="font-weight:400;color:var(--tx3)">w wozie: '+cum.toFixed(0)+' kg</div></div><div class="rr"><div class="ra"><button class="arb" onclick="mvD('+i+',-1)" aria-label="W górę"><i class="ti ti-chevron-up"></i></button><button class="arb" onclick="mvD('+i+',1)" aria-label="W dół"><i class="ti ti-chevron-down"></i></button></div><div class="kw"><input type="number" value="'+s.kgWoz+'" min="0" step="1" inputmode="numeric" onchange="ukD('+i+',this.value)" aria-label="kg na wóz"><span>kg/wóz</span></div><button class="dl" onclick="rmD('+i+')" aria-label="Usuń"><i class="ti ti-x"></i></button></div></div>'}).join('')+'</div>';
}
function migrateD(){
  var ings=getResolvedDIngs();if(!ings.length){toast('Brak surowców do przeniesienia',true);return}
  var szt=parseInt(document.getElementById('d-szt').value)||1,title=document.getElementById('d-title').value.trim()||'Dawka',note=document.getElementById('d-note').value.trim();
  ask({title:'Przenieść do Obliczania wozu?',msg:'Powstanie nowa dawka „'+uniqueTitle(wDoses,title,null)+'” z wartościami w kg na sztukę.',ok:'Przenieś',onOk:function(){toWozDose(title,note,szt,ings)}});
}
function toWozDose(title,note,szt,ings){
  var finalTitle=uniqueTitle(wDoses,title,null);
  var w=ings.map(function(s){return{name:s.name,cat:s.cat,sm:s.sm,kg:szt>0?Math.round(s.kgWoz/szt*100)/100:0}});
  var id='wd'+Date.now();
  wDoses.push({id:id,title:finalTitle,note:(note?note+' | ':'')+'z ustalania dawki',szt:szt,ings:w,createdAt:Date.now()});
  saveAll();toast('Przeniesiono do Obliczania wozu');
  dIsDirty=false;show('scr-main');showTab('w');
}
function migrateFromList(id){
  var d=dDoses.find(function(x){return x.id===id});if(!d)return;
  var ings=getDDoseIngs(d,{});if(!ings.length){toast('Dawka nie ma surowców',true);return}
  ask({title:'Przenieść do Obliczania wozu?',msg:'Powstanie nowa dawka „'+uniqueTitle(wDoses,d.title,null)+'” z wartościami w kg na sztukę.',ok:'Przenieś',onOk:function(){toWozDose(d.title,d.note,d.szt,ings)}});
}
function syncDerivedDDoses(){
  dDoses.forEach(function(d){
    if(d.parentId)d.ings=getDDoseIngs(d,{});
  });
}
function getResolvedDIngs(){
  if(!dParentId)return dIngs;
  var parent=dDoses.find(function(x){return x.id===dParentId});
  if(!parent){var own=dDoses.find(function(x){return x.id===dId});return own?own.ings||[]:dExtraIngs}
  var base=getDDoseIngs(parent,{}); 
  var szt=parseInt(document.getElementById('d-szt').value)||1;
  var extras=dExtraIngs.map(function(e){
    return {name:e.name,cat:e.cat||'t',sm:e.sm||88,kgWoz:parseFloat(e.kgWoz)||0,isExtra:true};
  });
  return base.concat(extras);
}
function newDerivedDDoseModal(parentId){
  var parent=dDoses.find(function(x){return x.id===parentId});if(!parent)return;
  var ov=document.createElement('div');ov.className='modal-ov';ov.id='derived-d-modal';
  ov.innerHTML='<div class="modal-bx"><div class="modal-t"><i class="ti ti-git-branch"></i> Dawka pochodna</div>'
    +'<div class="modal-m" style="margin-bottom:12px">Baza: <strong>'+escapeHtml(parent.title)+'</strong>. Surowce z bazy przejdą automatycznie i będą się aktualizować razem z nią. Dodatki dla tej grupy wpiszesz w kg na wóz.</div>'
    +'<div class="fl"><div class="fl-l">Nazwa nowej dawki</div><input type="text" id="derived-d-title" placeholder="np. Grupa 1" value="'+escapeHtml(parent.title)+' — grupa"></div>'
    +'<div class="fl"><div class="fl-l">Liczba sztuk</div><input type="number" id="derived-d-szt" placeholder="0" min="1" value="'+Math.max(1,Math.round((parent.szt||1)/2))+'"></div>'
    +'<div class="modal-btns"><button class="btn" onclick="document.getElementById(\'derived-d-modal\').remove()">Anuluj</button><button class="btn bp" style="background:var(--p)" onclick="confirmNewDerivedDDose(\''+parentId+'\')"><i class="ti ti-check"></i> Utwórz</button></div></div>';
  document.body.appendChild(ov);
}
function confirmNewDerivedDDose(parentId){
  var title=document.getElementById('derived-d-title').value.trim()||'Nowa dawka';
  var szt=parseInt(document.getElementById('derived-d-szt').value)||1;
  var m=document.getElementById('derived-d-modal');if(m)m.remove();
  var ft=uniqueTitle(dDoses,title,null);
  var id='dd'+Date.now();
  dDoses.push({id:id,title:ft,note:'',szt:szt,parentId:parentId,extraIngs:[],ings:[],createdAt:Date.now()});
  syncDerivedDDoses();saveAll();
  openD(id);
}
function rmDExtra(i){dExtraIngs.splice(i,1);markDirtyD();renderD()}
function ukDExtra(i,val){dExtraIngs[i].kgWoz=parseFloat(val)||0;markDirtyD();renderD()}
function pdfD(){genDosePDF(document.getElementById('d-title').value||'Dawka',document.getElementById('d-note').value,parseInt(document.getElementById('d-szt').value)||0,getResolvedDIngs(),'d')}
function pdfDoseD(id){syncDerivedDDoses();var d=dDoses.find(function(x){return x.id===id});if(d)genDosePDF(d.title,d.note,d.szt,d.ings,'d')}
