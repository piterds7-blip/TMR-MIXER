// TMR Mixer — moduł chroniony: Mieszanka treściwa
// Ten plik NIE jest publikowany na stronie. Workflow wgrywa go do Firestore (kolekcja modules),
// a aplikacja pobiera go dopiero po zalogowaniu użytkownika z dostępem do funkcji „mieszanka”.
// Kod korzysta z funkcji i danych rdzenia aplikacji (index.html).

function renderMieszanka(){
  var el=document.getElementById('tab-m');
  el.innerHTML=mListView();
}
function mListView(){
  var h='';
  if(!mDoses.length){
    h+='<div class="em"><div class="em-i" style="color:#85B7EB"><i class="ti ti-blender"></i></div><div class="em-t">Brak mieszanek</div><div class="em-s">Utwórz własną mieszankę z pasz treściwych i dodatków.</div></div>';
  }
  h+='<div class="hn"><i class="ti ti-info-circle"></i><div>Aplikacja policzy białko, skrobię, energię, suchą masę i cenę mieszanki. Gotową mieszankę możesz dodać do bazy surowców i używać w dawkach.</div></div>';
  h+=mDoses.map(function(d){
    var r=mCalc(d.ings,d.prices||{});
    return '<div class="dc"><div class="dch"><div class="dct">'+esc(d.title)+'</div><div class="dcm">'+(d.note?esc(d.note)+' · ':'')+d.ings.length+' surowców · '+r.totalKg.toFixed(0)+' kg · '+r.price.toFixed(0)+' zł/t</div></div>'
      +'<div class="dcs" style="grid-template-columns:repeat(4,1fr)"><div class="dss"><div class="dsv">'+r.protein.toFixed(1)+'%</div><div class="dsl">białko</div></div><div class="dss"><div class="dsv">'+r.starch.toFixed(1)+'%</div><div class="dsl">skrobia</div></div><div class="dss"><div class="dsv" style="color:#B8860B">'+(r.nel>0?r.nel.toFixed(2):'—')+'</div><div class="dsl">MJ NEL</div></div><div class="dss"><div class="dsv" style="color:var(--b)">'+r.sm.toFixed(1)+'%</div><div class="dsl">SM</div></div></div>'
      +'<div class="dca"><button class="dab" style="color:var(--b);font-weight:650" onclick="openM(\''+d.id+'\')"><i class="ti ti-edit"></i> Edytuj</button><button class="dab" onclick="pdfMieszanka(\''+d.id+'\')"><i class="ti ti-file-type-pdf"></i> PDF</button><button class="dab" onclick="exportMieszanka(\''+d.id+'\')"><i class="ti ti-database-import"></i> Do bazy</button></div></div>';
  }).join('');
  h+='<button class="fab" style="background:var(--b)" onclick="newM()"><i class="ti ti-plus"></i> Nowa mieszanka</button>';
  return h;
}
function mCalc(ings,priceMap){
  var totalKg=0,smKg=0,protKg=0,starchKg=0,costSum=0,nelSum=0;
  ings.forEach(function(s){
    var sm=getSM(s.name),pr=getProtein(s.name),st=getStarch(s.name),nel=getNEL(s.name);
    var price=(priceMap&&priceMap[s.name]!==undefined)?priceMap[s.name]:getBasePrice(s.name);
    var dm=s.kg*sm/100;
    totalKg+=s.kg;smKg+=dm;
    protKg+=dm*pr/100;starchKg+=dm*st/100;nelSum+=dm*nel;
    costSum+=s.kg*price;
  });
  return {
    totalKg:totalKg,
    sm:totalKg>0?smKg/totalKg*100:0,
    protein:smKg>0?protKg/smKg*100:0,
    starch:smKg>0?starchKg/smKg*100:0,
    nel:smKg>0?nelSum/smKg:0,
    price:totalKg>0?costSum/totalKg:0
  };
}
var mOrig='';
function mSnapshot(){var t=document.getElementById('m-title'),n=document.getElementById('m-note');return JSON.stringify({t:t?t.value:'',n:n?n.value:'',i:mIngs,p:mPrices})}
function newM(){mId=null;mIngs=[];mPrices={};show('scr-m-edit');renderMEdit('Nowa mieszanka','');mOrig=mSnapshot()}
function openM(id){var d=mDoses.find(function(x){return x.id===id});if(!d)return;mId=id;mIngs=JSON.parse(JSON.stringify(d.ings));mPrices=d.prices?JSON.parse(JSON.stringify(d.prices)):{};show('scr-m-edit');renderMEdit(d.title,d.note||'');mOrig=mSnapshot()}
function backM(){if(mSnapshot()!==mOrig){ask({title:'Niezapisane zmiany',msg:'Masz niezapisane zmiany w tej mieszance.',ok:'Wyjdź bez zapisu',cancel:'Zostań',danger:true,onOk:leaveM});return}leaveM()}
function leaveM(){mOrig='';show('scr-main');showTab('m')}
function renderMEdit(title,note){
  var sc=document.getElementById('scr-m-edit');
  sc.innerHTML='<div class="topbar"><button class="ib" onclick="backM()" aria-label="Wróć"><i class="ti ti-arrow-left"></i></button><div class="topbar-t" id="m-topbar">'+esc(title)+'</div><button class="ib" onclick="pdfMieszankaLive()" title="PDF" aria-label="Eksport PDF"><i class="ti ti-file-type-pdf"></i></button></div>'
    +'<div class="sec-top">Informacje</div><div class="spacer"></div>'
    +'<div class="fl"><div class="fl-l">Nazwa mieszanki</div><input type="text" id="m-title" placeholder="np. Mieszanka produkcyjna 20%" value="'+(title==='Nowa mieszanka'?'':esc(title))+'"></div>'
    +'<div class="fl"><div class="fl-l">Notatka</div><input type="text" id="m-note" placeholder="np. dla krów w szczycie" value="'+esc(note||'')+'"></div>'
    +'<div class="divider"></div><div class="sec-top">Parametry mieszanki</div><div class="spacer"></div>'
    +'<div id="m-stats"></div>'
    +'<div id="m-ing-list"></div>'
    +'<div class="ac"><div class="at2"><i class="ti ti-plus"></i> Dodaj surowiec</div><div class="ar"><button class="pick-btn" onclick="openPicker(\'m\',true)"><span class="pick-name" id="m-pick-label">Wybierz surowiec…</span><i class="ti ti-chevron-down pick-arrow"></i></button><input type="number" id="m-kg" placeholder="kg" min="0" step="1" inputmode="numeric" aria-label="kg"><button class="addb" style="background:var(--b)" onclick="addM()" aria-label="Dodaj"><i class="ti ti-plus"></i></button></div><input type="hidden" id="m-sel-val"></div>'
    +'<div class="br"><button class="btn" onclick="editMixPrices()"><i class="ti ti-coin"></i> Ceny surowców</button><button class="btn" onclick="dupM()"><i class="ti ti-copy"></i> Duplikuj</button></div>'
    +'<div class="br"><button class="btn bp" style="background:var(--b)" id="m-save-btn" onclick="saveM()"><i class="ti ti-device-floppy"></i> Zapisz</button></div>'
    +'<div class="br"><button class="btn" style="border-color:var(--g);color:var(--gd)" onclick="exportMieszankaLive()"><i class="ti ti-database-import"></i> Dodaj do bazy surowców</button></div>'
    +'<button class="btn bdd" id="m-del-btn" style="display:'+(mId?'flex':'none')+';width:calc(100% - 32px);margin:0 16px 10px" onclick="delM()"><i class="ti ti-trash"></i> Usuń mieszankę</button>';
  renderM();
}
function addM(){
  var val=document.getElementById('m-sel-val').value;
  if(!val){toast('Wybierz surowiec',true);return}
  var kg=parseFloat(document.getElementById('m-kg').value);
  if(!kg||kg<=0){toast('Podaj ilość w kg',true);return}
  var p=val.split('|'),nm=p[0];
  if(getSM(nm)<=0){toast('Surowiec „'+nm+'” nie ma suchej masy — uzupełnij go w „Moje surowce”',true);return}
  var ex=mIngs.find(function(x){return x.name===nm});
  if(ex){ex.kg+=kg;toast('Zwiększono ilość: '+nm)}else mIngs.push({name:nm,kg:kg});
  document.getElementById('m-kg').value='';
  document.getElementById('m-sel-val').value='';
  document.getElementById('m-pick-label').textContent='Wybierz surowiec…';
  renderM();
}
function rmM(i){mIngs.splice(i,1);renderM()}
function ukM(i,v){mIngs[i].kg=parseFloat(v)||0;renderM()}
function renderM(){
  var r=mCalc(mIngs,mPrices);
  var st=document.getElementById('m-stats');
  if(st){st.innerHTML='<div class="s2">'
    +sb('var(--b)',r.protein.toFixed(1)+'%','białko (w SM)')
    +sb('#993C1D',r.starch.toFixed(1)+'%','skrobia (w SM)')
    +'</div><div class="s2">'
    +sb('#B8860B',(r.nel>0?r.nel.toFixed(2)+' MJ':'—'),'energia NEL'+(r.nel>0?' · '+nelToVem(r.nel)+' VEM':''))
    +sb('var(--gd)',r.price.toFixed(0)+' zł','cena za tonę')
    +'</div><div class="s2">'
    +sb('var(--tx)',r.totalKg.toFixed(0)+' kg','suma mieszanki')
    +sb('var(--tx)',r.sm.toFixed(1)+'%','sucha masa')
    +'</div>';}
  var el=document.getElementById('m-ing-list');if(!el)return;
  var noPrice=mIngs.filter(function(s){var p=mPrices[s.name]!==undefined?mPrices[s.name]:getBasePrice(s.name);return !(p>0)});
  var warn=noPrice.length?'<div class="hn warn"><i class="ti ti-alert-triangle"></i><div>Bez ceny: '+noPrice.map(function(s){return esc(s.name)}).join(', ')+'. Uzupełnij w „Ceny surowców”, inaczej cena mieszanki będzie zaniżona.</div></div>':'';
  if(!mIngs.length){el.innerHTML='<div class="em"><div class="em-i" style="color:#85B7EB"><i class="ti ti-flask"></i></div><div class="em-t">Brak surowców</div><div class="em-s">Dodaj pasze treściwe lub dodatki poniżej.</div></div>';return}
  el.innerHTML=warn+'<div class="ls">'+mIngs.map(function(s,i){
    var pct=r.totalKg>0?(s.kg/r.totalKg*100):0;
    return '<div class="rw"><div class="rn">'+(i+1)+'</div><div style="flex:1;min-width:0"><div class="rname">'+esc(s.name)+'</div><div class="cp" style="color:var(--b)">'+pct.toFixed(1)+'% składu</div></div><div class="rr"><div class="kw"><input type="number" value="'+s.kg+'" min="0" step="1" inputmode="numeric" onchange="ukM('+i+',this.value)" aria-label="kg"><span>kg</span></div><button class="dl" onclick="rmM('+i+')" aria-label="Usuń"><i class="ti ti-x"></i></button></div></div>';
  }).join('')+'</div>';
}
function saveM(){
  var t=document.getElementById('m-title').value.trim()||'Mieszanka';
  if(!mIngs.length){toast('Dodaj surowce',true);return}
  var dup=findDuplicateTitle(mDoses,t,mId);
  if(dup){var nt=uniqueTitle(mDoses,t,mId);ask({title:'Taka nazwa już istnieje',msg:'Mieszanka „'+t+'” już jest na liście. Zapisać jako „'+nt+'”?',ok:'Zapisz jako „'+nt+'”',onOk:function(){document.getElementById('m-title').value=nt;doSaveM(nt)}});return}
  doSaveM(t);
}
function doSaveM(t){
  var n=document.getElementById('m-note').value.trim();
  if(mId){var d=mDoses.find(function(x){return x.id===mId});if(d){d.title=t;d.note=n;d.ings=JSON.parse(JSON.stringify(mIngs));d.prices=JSON.parse(JSON.stringify(mPrices))}}
  else{mId='md'+Date.now();mDoses.push({id:mId,title:t,note:n,ings:JSON.parse(JSON.stringify(mIngs)),prices:JSON.parse(JSON.stringify(mPrices))});document.getElementById('m-del-btn').style.display='flex'}
  document.getElementById('m-topbar').textContent=t;saveAll();mOrig=mSnapshot();flash('m-save-btn');toast('Zapisano mieszankę');
}
function delM(){
  var d=mDoses.find(function(x){return x.id===mId});if(!d){leaveM();return}
  ask({title:'Usunąć mieszankę?',msg:'„'+d.title+'” zostanie usunięta. Kopia dodana wcześniej do bazy surowców zostaje.',ok:'Usuń',danger:true,onOk:function(){mDoses=mDoses.filter(function(x){return x.id!==mId});saveAll();toast('Mieszanka usunięta');leaveM()}});
}
function dupM(){mId=null;var t=uniqueTitle(mDoses,(document.getElementById('m-title').value||'Mieszanka')+' (kopia)',null);document.getElementById('m-title').value=t;document.getElementById('m-topbar').textContent=t;document.getElementById('m-del-btn').style.display='none';toast('Utworzono kopię — zapisz, aby ją zachować')}
function editMixPrices(){
  if(!mIngs.length){toast('Najpierw dodaj surowce',true);return}
  var rows=mIngs.map(function(s){
    var p=mPrices[s.name]!==undefined?mPrices[s.name]:getBasePrice(s.name);
    var base=getBasePrice(s.name);
    var isOverride=mPrices[s.name]!==undefined;
    return '<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--bd)"><div style="flex:1;font-size:14px;min-width:0">'+esc(s.name)+'<div style="font-size:11px;color:'+(isOverride?'var(--b)':'var(--tx3)')+'">'+(isOverride?'cena własna dla tej mieszanki':'cena z bazy: '+(base||'brak'))+'</div></div><input type="number" value="'+(p>0?p:'')+'" placeholder="'+(base||0)+'" min="0" step="1" inputmode="numeric" style="width:96px;text-align:right" onchange="setMixPrice(\''+jsArg(s.name)+'\',this.value)" aria-label="Cena zł/t"><span style="font-size:12px;color:var(--tx3)">zł/t</span></div>';
  }).join('');
  var ov=document.createElement('div');ov.className='modal-ov';ov.id='mixprice-modal';
  ov.innerHTML='<div class="modal-bx"><div class="modal-t"><i class="ti ti-coin"></i> Ceny surowców (zł/t netto)</div><div class="modal-m">Ceny zapisane tylko dla tej mieszanki. Puste pole = cena z bazy.</div>'+rows+'<div class="modal-btns"><button class="btn bp" style="background:var(--b)" onclick="closeMixPrices()"><i class="ti ti-check"></i> Gotowe</button></div></div>';
  document.body.appendChild(ov);
}
function setMixPrice(name,val){
  var v=val.trim();
  if(v===''){delete mPrices[name]}
  else{mPrices[name]=parseFloat(v)||0}
}
function closeMixPrices(){var m=document.getElementById('mixprice-modal');if(m)m.remove();renderM()}
function exportMieszankaLive(){
  if(!mIngs.length){toast('Dodaj surowce',true);return}
  var t=document.getElementById('m-title').value.trim()||'Mieszanka';
  doExportMieszanka(t,mIngs,mPrices);
}
function exportMieszanka(id){var d=mDoses.find(function(x){return x.id===id});if(!d)return;doExportMieszanka(d.title,d.ings,d.prices||{})}
function doExportMieszanka(title,ings,priceMap){
  var r=mCalc(ings,priceMap);
  var item=[null,'t',Math.round(r.sm*10)/10,Math.round(r.price),Math.round(r.protein*10)/10,Math.round(r.starch*10)/10,Math.round(r.nel*100)/100];
  var grp=BASE.find(function(g){return g.g==='Moje mieszanki'});
  var existing=grp&&grp.items.find(function(it){return it[0]===title});
  function store(name,replace){
    item[0]=name;
    var g=BASE.find(function(x){return x.g==='Moje mieszanki'});if(!g){g={g:'Moje mieszanki',items:[]};BASE.push(g)}
    var i=g.items.findIndex(function(it){return it[0]===name});if(i>=0&&replace)g.items[i]=item.slice();else g.items.push(item.slice());
    var savedMix=[];try{savedMix=JSON.parse(localStorage.getItem('tmr_mixbase')||'[]')}catch(e){}
    var j=savedMix.findIndex(function(x){return x[0]===name});if(j>=0)savedMix[j]=item.slice();else savedMix.push(item.slice());
    try{localStorage.setItem('tmr_mixbase',JSON.stringify(savedMix))}catch(e){}
    toast(replace?'Zaktualizowano „'+name+'” w bazie surowców':'„'+name+'” dodana do bazy surowców');
  }
  function freeName(){var fname=title,n=2;while(nameInBase(fname)){fname=title+' ('+n+')';n++}return fname}
  if(existing){
    actionSheet('„'+title+'” jest już w bazie surowców',[
      {icon:'ti-refresh',label:'Zaktualizuj parametry w bazie',sub:'białko, skrobia, energia, cena',fn:function(){store(title,true)}},
      {icon:'ti-plus',label:'Dodaj jako nową pozycję',fn:function(){store(freeName(),false)}},
      {icon:'ti-x',label:'Anuluj'}
    ]);
    return;
  }
  store(nameInBase(title)?freeName():title,false);
}
function nameInBase(n){var f=false;BASE.forEach(function(g){g.items.forEach(function(it){if(it[0]===n)f=true})});return f||!!customIngs.find(function(c){return c[0]===n})}
function pdfMieszankaLive(){
  if(!mIngs.length){toast('Dodaj surowce',true);return}
  var t=document.getElementById('m-title').value.trim()||'Mieszanka';
  doPdfMieszanka(t,mIngs,mPrices);
}
function pdfMieszanka(id){var d=mDoses.find(function(x){return x.id===id});if(!d)return;doPdfMieszanka(d.title,d.ings,d.prices||{})}
function doPdfMieszanka(title,ings,priceMap){
  var r=mCalc(ings,priceMap);
  // Podgląd HTML
  var prows=ings.map(function(s,i){var pct=r.totalKg>0?(s.kg/r.totalKg*100):0;var pr=(priceMap&&priceMap[s.name]!==undefined)?priceMap[s.name]:getBasePrice(s.name);return '<tr><td style="padding:8px 12px"><strong>'+(i+1)+'. '+esc(s.name)+'</strong></td><td style="padding:8px 12px;text-align:right">'+s.kg+' kg</td><td style="padding:8px 12px;text-align:right;color:#185FA5">'+pct.toFixed(1)+'%</td><td style="padding:8px 12px;text-align:right">'+(pr>0?pr:'—')+'</td></tr>'}).join('');
  var previewHtml='<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Arial,sans-serif;color:#111}.hdr{background:#185FA5;color:#fff;padding:14px 16px}.kpis{display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px}table{width:100%;border-collapse:collapse;font-size:13px}tr{border-bottom:1px solid #eee}th{padding:8px 12px;text-align:left;background:#f0f0f0;font-size:11px}</style></head><body>'
    +'<div class="hdr"><h1 style="font-size:18px">Mieszanka: '+esc(title)+'</h1><div style="font-size:12px;opacity:.8;margin-top:3px">'+ings.length+' surowców · '+r.totalKg.toFixed(0)+' kg · '+new Date().toLocaleDateString('pl')+'</div></div>'
    +'<div class="kpis"><div style="background:#f7f7f9;border-radius:8px;padding:10px;flex:1;min-width:100px"><div style="font-size:20px;font-weight:700;color:#185FA5">'+r.protein.toFixed(1)+'%</div><div style="font-size:11px;color:#666">białko (w SM)</div></div><div style="background:#f7f7f9;border-radius:8px;padding:10px;flex:1;min-width:100px"><div style="font-size:20px;font-weight:700;color:#993C1D">'+r.starch.toFixed(1)+'%</div><div style="font-size:11px;color:#666">skrobia (w SM)</div></div><div style="background:#f7f7f9;border-radius:8px;padding:10px;flex:1;min-width:100px"><div style="font-size:20px;font-weight:700">'+r.totalKg.toFixed(0)+' kg</div><div style="font-size:11px;color:#666">suma · SM '+r.sm.toFixed(1)+'%</div></div><div style="background:#f7f7f9;border-radius:8px;padding:10px;flex:1;min-width:100px"><div style="font-size:20px;font-weight:700;color:#0B6B2C">'+r.price.toFixed(0)+'</div><div style="font-size:11px;color:#666">cena (zł/t)</div></div></div>'
    +'<table><thead><tr><th>Surowiec</th><th style="text-align:right">kg</th><th style="text-align:right">% składu</th><th style="text-align:right">zł/t</th></tr></thead><tbody>'+prows+'</tbody></table></body></html>';
  showPdfPreview(previewHtml,function(){
    closePdfPreview();
    var jsPDF=window.jspdf.jsPDF;var doc=new jsPDF({unit:'mm',format:'a4'});
    var W=210,H=297,M=14;
    doc.setFillColor(24,95,165);doc.rect(0,0,W,22,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);
    doc.text(plchars('Mieszanka: '+title),M,12);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(200,220,245);
    doc.text(plchars(ings.length+' surowcow  |  '+r.totalKg.toFixed(0)+' kg  |  '+new Date().toLocaleDateString('pl')),M,18);
    var kpis=[['bialko (w SM)',r.protein.toFixed(1)+'%',[24,95,165]],['skrobia (w SM)',r.starch.toFixed(1)+'%',[153,60,29]],['suma kg (SM '+r.sm.toFixed(1)+'%)',r.totalKg.toFixed(0)+' kg',[30,30,30]],['cena (zl/t)',r.price.toFixed(0),[15,110,86]]];
    var ky=28,kw=(W-2*M)/2,kh=18;
    kpis.forEach(function(k,i){var col=i%2,row=Math.floor(i/2);var kx=M+col*kw,kyy=ky+row*kh;doc.setFillColor(245,245,247);doc.roundedRect(kx,kyy,kw-3,kh-3,2,2,'F');doc.setTextColor(k[2][0],k[2][1],k[2][2]);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text(k[1],kx+4,kyy+8);doc.setTextColor(110,110,110);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(plchars(k[0]),kx+4,kyy+13.5)});
    var ty=ky+2*kh+4;
    doc.setFillColor(240,240,240);doc.rect(M,ty,W-2*M,7,'F');
    doc.setTextColor(80,80,80);doc.setFont('helvetica','bold');doc.setFontSize(8);
    doc.text('SUROWIEC',M+2,ty+4.7);doc.text('kg',M+105,ty+4.7,{align:'right'});doc.text('% skladu',M+145,ty+4.7,{align:'right'});doc.text('zl/t',W-M-1,ty+4.7,{align:'right'});
    var ry=ty+7,n=ings.length,rowH=Math.min(8,(H-ry-16)/n);if(rowH<5)rowH=5;
    doc.setFont('helvetica','normal');
    ings.forEach(function(s,i){var pct=r.totalKg>0?(s.kg/r.totalKg*100):0;var pr=(priceMap&&priceMap[s.name]!==undefined)?priceMap[s.name]:getBasePrice(s.name);var yy=ry+i*rowH;if(yy>H-18)return;doc.setDrawColor(238,238,238);doc.line(M,yy+rowH,W-M,yy+rowH);doc.setTextColor(25,25,25);doc.setFontSize(Math.min(10,rowH*0.95));doc.text(plchars((i+1)+'. '+s.name).substring(0,40),M+2,yy+rowH*0.65);doc.text(''+s.kg,M+105,yy+rowH*0.65,{align:'right'});doc.setTextColor(24,95,165);doc.text(pct.toFixed(1)+'%',M+145,yy+rowH*0.65,{align:'right'});doc.setTextColor(25,25,25);doc.text(pr>0?''+pr:'-',W-M-1,yy+rowH*0.65,{align:'right'})});
    doc.save(sanitize('Mieszanka_'+title)+'.pdf');
    toast('PDF zapisany w Pobranych');
  });
}

