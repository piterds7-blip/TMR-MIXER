// TMR Mixer — moduł chroniony: Sita TMR — struktura fizyczna paszy
// Ten plik NIE jest publikowany na stronie. Workflow wgrywa go do Firestore (kolekcja modules),
// a aplikacja pobiera go dopiero po zalogowaniu użytkownika z dostępem do funkcji „sita”.
// Kod korzysta z funkcji i danych rdzenia aplikacji (index.html).

function renderSita(){
  var el = document.getElementById('tab-s');
  if(!sitaType){
    el.innerHTML = renderSitaTypeSelect();
    return;
  }
  el.innerHTML = renderSitaList();
}

function renderSitaTypeSelect(){
  return '<div class="hn"><i class="ti ti-info-circle"></i><div>Wybierz typ sit, których używasz. Ustawienie zostanie zapamiętane — zmienisz je w Ustawieniach.</div></div>'
    +'<div class="em"><div class="em-i" style="color:#C47B0A"><i class="ti ti-stack-2"></i></div><div class="em-t">Wybierz typ sit</div></div>'
    +'<div style="padding:0 16px;display:flex;flex-direction:column;gap:10px">'
    +Object.entries(SITA_TYPES).map(function(e){
      var key=e[0],val=e[1];
      return '<button class="btn" style="padding:14px;font-size:14px;flex-direction:column;align-items:flex-start;text-align:left" onclick="setSitaType(\''+key+'\')"><div style="font-weight:650">'+val.name+'</div><div style="font-size:12px;color:var(--tx2);font-weight:400">'+val.sieves.map(function(x){return x.label}).join(' · ')+'</div></button>';
    }).join('')
    +'</div>';
}

function setSitaType(type){
  sitaType = type;
  localStorage.setItem('tmr_sita_type', type);
  toast('Typ sit zapisany: '+SITA_TYPES[type].name);
  renderSita();
}

function renderSitaList(){
  var st = SITA_TYPES[sitaType];
  var h = '<div class="hn"><i class="ti ti-stack-2" style="color:var(--o)"></i><div style="flex:1">Typ sit: <strong>'+st.name+'</strong></div><button class="btn" style="flex:none;min-height:32px;padding:4px 10px;font-size:12px" onclick="changeSitaType()">Zmień</button></div>';
  if(!sitaClients.length){
    h += '<div class="em"><div class="em-i" style="color:#C47B0A"><i class="ti ti-users"></i></div><div class="em-t">Brak klientów</div><div class="em-s">Dodaj pierwszego klienta aby prowadzić badania sit</div></div>';
  } else {
    h += sitaClients.map(function(c){
      var last = c.tests&&c.tests.length ? c.tests[0] : null;
      var nProb = last ? (last.samples ? last.samples.length : 1) : 0;
      var sub = last ? fmtDate(last.ts)+' · '+nProb+' próbk'+(nProb===1?'a':nProb<5?'i':'') : 'brak badań';
      return '<div class="dc" data-sid="'+c.id+'" onclick="openSitaClient(this.dataset.sid)" style="cursor:pointer">'
        +'<div class="dch" style="display:flex;align-items:center;gap:10px"><i class="ti ti-user" style="color:var(--o);font-size:22px"></i><div style="flex:1;min-width:0"><div class="dct">'+escapeHtml(c.name)+'</div>'
        +'<div class="dcm">'+(last?escapeHtml(last.title||'Badanie')+' · ':'')+sub+'</div></div><i class="ti ti-chevron-right" style="color:var(--tx3)"></i></div></div>';
    }).join('');
  }
  h += '<button class="fab" style="background:#C47B0A" onclick="newSitaClient()"><i class="ti ti-plus"></i> Nowy klient</button>';
  return h;
}

function newSitaClient(){
  inputModal({title:'Nowy klient (Sita)',placeholder:'Nazwa / imię klienta',okLabel:'Utwórz',onOk:function(name){
    if(!name)return;
    var id='sc'+Date.now();
    sitaClients.push({id:id,name:name,tests:[]});
    saveSitaClients();curSitaClientId=id;openSitaClient(id);
  }});
}

function openSitaClient(id){curSitaClientId=id;show('scr-sita-client');renderSitaClient()}

// Liczba próbek w aktywnym formularzu
var sitaSampleCount = 1;
function renderSitaClient(){
  var c = sitaClients.find(function(x){return x.id===curSitaClientId});
  if(!c)return;
  var st = SITA_TYPES[sitaType];
  var el = document.getElementById('scr-sita-client');
  var h = '<div class="topbar"><button class="ib" onclick="backSita()" aria-label="Wróć"><i class="ti ti-arrow-left"></i></button>'
    +'<div class="topbar-t">'+escapeHtml(c.name)+'</div>'
    +'<button class="ib" onclick="actionSheet(\''+jsArg(c.name)+'\',[{icon:\'ti-edit\',label:\'Zmień nazwę\',fn:renameSitaClient},\'sep\',{icon:\'ti-trash\',label:\'Usuń klienta\',danger:true,fn:delSitaClient}])" aria-label="Więcej"><i class="ti ti-dots-vertical"></i></button></div>';

  sitaSampleCount = sitaSampleCount || 1;

  // Formularz nowego badania
  h += '<div class="ac" style="margin-top:10px"><div class="at2"><i class="ti ti-plus"></i> Nowe badanie</div>';
  // Tytuł badania
  h += '<div class="fl-l" style="margin-bottom:4px">Tytuł badania</div>';
  h += '<input type="text" id="sita-title" placeholder="np. Kontrola ranna, Po zmianie dawki..." style="margin-bottom:10px">';

  // Tabela próbek
  h += buildSitaForm(st, sitaSampleCount);

  // Przycisk dodaj próbkę
  h += '<button class="btn" style="width:100%;margin-bottom:8px;border-color:#C47B0A;color:#C47B0A" onclick="addSitaSample()"><i class="ti ti-plus"></i> Dodaj próbkę</button>';

  // Notatka
  h += '<div class="fl-l" style="margin-bottom:4px">Zalecenia / uwagi</div>';
  h += '<textarea id="sita-note" placeholder="Wpisz zalecenia lub obserwacje..." style="width:100%;min-height:60px;padding:9px;border:1px solid var(--bd);border-radius:var(--rs);background:var(--bg);color:var(--tx);font-size:13px;font-family:inherit;resize:vertical;margin-bottom:8px"></textarea>';
  h += '<div class="br"><button class="btn bp" style="background:#C47B0A;width:100%" onclick="saveSitaTest()"><i class="ti ti-device-floppy"></i> Zapisz badanie</button></div></div>';

  // Historia
  if(c.tests&&c.tests.length){
    h += '<div class="sec-top">Historia badań</div><div class="spacer"></div>';
    h += c.tests.map(function(t,i){
      var nP = t.samples ? t.samples.length : 1;
      var titleStr = escapeHtml(t.title||'Badanie');
      var rows = buildSitaHistoryRows(t, st);
      return '<div class="dc"><div style="padding:11px 12px">'
        +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'
        +'<i class="ti ti-stack-2" style="color:#C47B0A;font-size:13px"></i>'
        +'<div style="flex:1"><div style="font-size:14px;font-weight:600">'+titleStr+'</div>'
        +'<div style="font-size:11px;color:#C47B0A">'+fmtDate(t.ts)+' · '+nP+' próbk'+(nP===1?'a':nP<5?'i':'')+'</div></div>'
        +'<button class="dl" onclick="pdfSitaTest('+i+')" aria-label="Eksport PDF"><i class="ti ti-file-type-pdf"></i></button>'
        +'<button class="dl" onclick="delSitaTest('+i+')" aria-label="Usuń badanie"><i class="ti ti-trash"></i></button>'
        +'</div>'+rows
        +(t.note?'<div style="margin-top:8px;font-size:12px;color:var(--tx2);font-style:italic">'+escapeHtml(t.note)+'</div>':'')
        +'</div></div>';
    }).join('');
  }
  el.innerHTML = h;
}

function buildSitaForm(st, nSamples){
  // Buduje responsywną tabelę z nSamples kolumnami próbek
  var cols = ['1fr']; // kolumna nazwy sita
  for(var s=0;s<nSamples;s++) cols.push('70px');
  if(nSamples>1) cols.push('65px'); // kolumna różnicy
  var grid = cols.join(' ');

  var h = '<div id="sita-form-table" style="background:var(--bg);border-radius:var(--r);border:0.5px solid var(--bd);overflow-x:auto;margin-bottom:8px"><div style="min-width:'+(160+nSamples*75+(nSamples>1?70:0))+'px">';

  // Nagłówek
  h += '<div style="display:grid;grid-template-columns:'+grid+';background:var(--bg2);padding:7px 10px;font-size:10px;font-weight:600;color:var(--tx2);text-transform:uppercase">';
  h += '<div>Sito (norma %)</div>';
  for(var s=0;s<nSamples;s++) h += '<div style="text-align:right">P'+(s+1)+' g&nbsp;/&nbsp;%</div>';
  if(nSamples>1) h += '<div style="text-align:right;color:#C47B0A">Różnica</div>';
  h += '</div>';

  // Wiersze sit
  st.sieves.forEach(function(sv,i){
    var norm = sv.min===0?'<'+sv.max:sv.min+'-'+sv.max;
    h += '<div style="display:grid;grid-template-columns:'+grid+';align-items:center;padding:8px 10px;border-top:0.5px solid var(--bd)">';
    h += '<div><div style="font-size:13px;font-weight:600">'+sv.label+'</div><div style="font-size:10px;color:var(--tx2)">'+norm+'%</div></div>';
    for(var s=0;s<nSamples;s++){
      h += '<div style="text-align:right">'
        +'<input type="number" id="sw-'+i+'-'+s+'" min="0" step="0.1" placeholder="g" inputmode="decimal" style="width:62px;text-align:right;font-size:13px;padding:5px 4px" oninput="calcSitaLive()">'
        +'<div id="sp-'+i+'-'+s+'" style="font-size:12px;font-weight:600;color:var(--tx2)">—</div>'
        +'</div>';
    }
    if(nSamples>1) h += '<div id="sd-'+i+'" style="text-align:right;font-size:13px;font-weight:700;color:#C47B0A">—</div>';
    h += '</div>';
  });

  // Suma
  h += '<div style="display:grid;grid-template-columns:'+grid+';align-items:center;padding:8px 10px;border-top:2px solid var(--bd);background:var(--bg2)">';
  h += '<div style="font-size:12px;font-weight:600">SUMA</div>';
  for(var s=0;s<nSamples;s++) h += '<div id="ss-'+s+'" style="text-align:right;font-size:12px;font-weight:600">0 g</div>';
  if(nSamples>1) h += '<div></div>';
  h += '</div>';

  h += '</div></div>';
  return h;
}

function buildSitaHistoryRows(t, st){
  // Wyświetl wyniki historycznego badania
  var samples = t.samples || [{results: t.results}]; // obsługa starych testów
  var nP = samples.length;
  var cols = ['1fr'];
  for(var s=0;s<nP;s++) cols.push('60px');
  if(nP>1) cols.push('60px');
  var grid = cols.join(' ');

  var sieves = t.sieves || (st ? st.sieves : []);
  if(!sieves.length && samples[0].results) sieves = samples[0].results.map(function(r){return {label:r.label,min:r.min,max:r.max}});

  var h = '<div style="overflow-x:auto"><div style="min-width:'+(120+nP*65+(nP>1?65:0))+'px">';
  // Header
  h += '<div style="display:grid;grid-template-columns:'+grid+';padding:4px 0;font-size:10px;font-weight:600;color:var(--tx2);text-transform:uppercase;border-bottom:1px solid var(--bd)">';
  h += '<div>Sito</div>';
  for(var s=0;s<nP;s++) h += '<div style="text-align:right">P'+(s+1)+'</div>';
  if(nP>1) h += '<div style="text-align:right;color:#C47B0A">Δ</div>';
  h += '</div>';
  // Rows
  sieves.forEach(function(sv,i){
    var pcts = samples.map(function(sp){
      var r = sp.results ? sp.results[i] : null;
      return r ? r.pct : 0;
    });
    var diff = nP>1 ? (Math.max.apply(null,pcts)-Math.min.apply(null,pcts)) : 0;
    h += '<div style="display:grid;grid-template-columns:'+grid+';padding:5px 0;border-bottom:0.5px solid var(--bd);font-size:12px">';
    h += '<div style="font-weight:600">'+sv.label+'</div>';
    pcts.forEach(function(pct){
      var inN=pct>=sv.min&&pct<=sv.max;
      h += '<div style="text-align:right;color:'+(inN?'#0B6B2C':'#A32D2D')+';font-weight:600">'+pct.toFixed(1)+'%</div>';
    });
    if(nP>1) h += '<div style="text-align:right;color:#C47B0A;font-weight:700">'+diff.toFixed(1)+'pp</div>';
    h += '</div>';
  });
  h += '</div></div>';
  return h;
}

function addSitaSample(){
  // Zachowaj wpisane wartości PRZED zmianą liczby
  var saved = saveSitaFormValues();
  sitaSampleCount++;
  var st = SITA_TYPES[sitaType];
  // Zastąp tabelę przez id
  var formDiv = document.getElementById('sita-form-table');
  if(formDiv){
    var newDiv = document.createElement('div');
    newDiv.innerHTML = buildSitaForm(st, sitaSampleCount);
    formDiv.parentNode.replaceChild(newDiv.firstChild, formDiv);
  }
  // Przywróć wartości i przelicz
  restoreSitaFormValues(saved);
  calcSitaLive();
}

function saveSitaFormValues(){
  var st=SITA_TYPES[sitaType]; var saved={};
  st.sieves.forEach(function(sv,i){
    for(var s=0;s<sitaSampleCount;s++){
      var el=document.getElementById('sw-'+i+'-'+s);
      if(el) saved['sw-'+i+'-'+s]=el.value;
    }
  });
  return saved;
}

function restoreSitaFormValues(saved){
  Object.keys(saved).forEach(function(k){
    var el=document.getElementById(k);
    if(el)el.value=saved[k];
  });
}

function calcSitaLive(){
  var st=SITA_TYPES[sitaType];
  for(var s=0;s<sitaSampleCount;s++){
    var vals=st.sieves.map(function(sv,i){return parseFloat(document.getElementById('sw-'+i+'-'+s)&&document.getElementById('sw-'+i+'-'+s).value)||0});
    var total=vals.reduce(function(a,b){return a+b},0);
    var sumEl=document.getElementById('ss-'+s);
    if(sumEl)sumEl.textContent=total.toFixed(1)+' g';
    st.sieves.forEach(function(sv,i){
      var pct=total>0?vals[i]/total*100:0;
      var pEl=document.getElementById('sp-'+i+'-'+s);
      if(pEl){pEl.textContent=total>0?pct.toFixed(1)+'%':'—';pEl.style.color=total>0?(pct>=sv.min&&pct<=sv.max?'#0B6B2C':'#A32D2D'):'var(--tx2)'}
    });
  }
  // Różnice
  if(sitaSampleCount>1){
    st.sieves.forEach(function(sv,i){
      var pcts=[];
      for(var s=0;s<sitaSampleCount;s++){
        var vals=st.sieves.map(function(sv2,j){return parseFloat(document.getElementById('sw-'+j+'-'+s)&&document.getElementById('sw-'+j+'-'+s).value)||0});
        var total=vals.reduce(function(a,b){return a+b},0);
        pcts.push(total>0?vals[i]/total*100:0);
      }
      var diff=Math.max.apply(null,pcts)-Math.min.apply(null,pcts);
      var dEl=document.getElementById('sd-'+i);
      if(dEl)dEl.textContent=diff.toFixed(1)+' pp';
    });
  }
}

function saveSitaTest(){
  var c=sitaClients.find(function(x){return x.id===curSitaClientId});if(!c)return;
  var st=SITA_TYPES[sitaType];
  var title=document.getElementById('sita-title').value.trim()||'Badanie';
  var samples=[];
  for(var s=0;s<sitaSampleCount;s++){
    var vals=st.sieves.map(function(sv,i){return parseFloat(document.getElementById('sw-'+i+'-'+s)&&document.getElementById('sw-'+i+'-'+s).value)||0});
    var total=vals.reduce(function(a,b){return a+b},0);
    if(total>0){
      samples.push({
        total:total,
        results:st.sieves.map(function(sv,i){return {label:sv.label,weight:vals[i],pct:Math.round(vals[i]/total*1000)/10,min:sv.min,max:sv.max}})
      });
    }
  }
  if(!samples.length){toast('Wpisz wagi przynajmniej jednej próbki',true);return}
  var note=document.getElementById('sita-note').value.trim();
  c.tests.unshift({ts:Date.now(),title:title,samples:samples,sieves:st.sieves.map(function(sv){return {label:sv.label,min:sv.min,max:sv.max}}),note:note,sitaType:sitaType});
  sitaSampleCount=1;
  saveSitaClients();toast('Badanie zapisane');renderSitaClient();
}

function delSitaTest(i){
  var c=sitaClients.find(function(x){return x.id===curSitaClientId});if(!c)return;
  ask({title:'Usunąć badanie?',msg:'Badanie „'+(c.tests[i].title||'Badanie')+'” z '+fmtDate(c.tests[i].ts)+' zostanie usunięte.',ok:'Usuń',danger:true,onOk:function(){
    c.tests.splice(i,1);saveSitaClients();toast('Badanie usunięte');renderSitaClient();
  }});
}

function renameSitaClient(){
  var c=sitaClients.find(function(x){return x.id===curSitaClientId});if(!c)return;
  inputModal({title:'Nazwa klienta',value:c.name,okLabel:'Zapisz',onOk:function(nv){
    if(!nv)return;c.name=nv;saveSitaClients();renderSitaClient();
  }});
}

function delSitaClient(){
  var c=sitaClients.find(function(x){return x.id===curSitaClientId});if(!c)return;
  ask({title:'Usunąć klienta?',msg:'„'+c.name+'” zostanie usunięty razem ze wszystkimi badaniami sit ('+(c.tests?c.tests.length:0)+').',ok:'Usuń',danger:true,onOk:function(){
    sitaClients=sitaClients.filter(function(x){return x.id!==curSitaClientId});
    saveSitaClients();toast('Klient usunięty');backSita();
  }});
}

function backSita(){sitaSampleCount=1;show('scr-main');showTab('s')}

function pdfSitaTest(idx){
  var c=sitaClients.find(function(x){return x.id===curSitaClientId});if(!c)return;
  var t=c.tests[idx];if(!t)return;
  var stType=t.sitaType||sitaType;
  var st=SITA_TYPES[stType];
  var samples=t.samples||[{results:t.results}];
  var nP=samples.length;
  var sieves=t.sieves||(st?st.sieves.map(function(sv){return {label:sv.label,min:sv.min,max:sv.max}}):[]);

  // Build preview HTML
  var thCols='<th>Sito (norma %)</th>';
  for(var s=0;s<nP;s++) thCols+='<th style="text-align:right">Próbka '+(s+1)+'</th>';
  if(nP>1) thCols+='<th style="text-align:right;color:#C47B0A">Różnica</th>';

  var rows=sieves.map(function(sv,i){
    var pcts=samples.map(function(sp){return sp.results&&sp.results[i]?sp.results[i].pct:0});
    var diff=nP>1?Math.max.apply(null,pcts)-Math.min.apply(null,pcts):0;
    var tds=pcts.map(function(pct){
      var inN=pct>=sv.min&&pct<=sv.max;
      return '<td style="text-align:right;color:'+(inN?'#0B6B2C':'#A32D2D')+';font-weight:700">'+pct.toFixed(1)+'%</td>';
    }).join('');
    return '<tr><td><strong>'+sv.label+'</strong><br><small style="color:#888">'+sv.min+'-'+sv.max+'%</small></td>'+tds+(nP>1?'<td style="text-align:right;color:#C47B0A;font-weight:700">'+diff.toFixed(1)+' pp</td>':'')+'</tr>';
  }).join('');

  var previewHtml='<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Arial,sans-serif;color:#111}'
    +'.hdr{background:#C47B0A;color:#fff;padding:14px 16px}.meta{padding:10px 16px;background:#FFF8E1;font-size:13px}'
    +'table{width:100%;border-collapse:collapse;font-size:13px}tr{border-bottom:1px solid #eee}th{padding:8px 12px;background:#f5f5f5;font-size:11px;text-transform:uppercase}'
    +'td{padding:8px 12px}.foot{padding:12px 16px;background:#f5f5f5;font-size:12px;color:#666}</style></head><body>'
    +'<div class="hdr"><h1 style="font-size:18px">'+escapeHtml(t.title||'Badanie')+'</h1><div style="font-size:12px;opacity:.8;margin-top:2px">'+st.name+'</div></div>'
    +'<div class="meta"><strong>'+escapeHtml(c.name)+'</strong> &nbsp;·&nbsp; '+fmtDate(t.ts)+'&nbsp;·&nbsp;'+nP+' próbki</div>'
    +'<table><thead><tr>'+thCols+'</tr></thead><tbody>'+rows+'</tbody></table>'
    +(t.note?'<div class="foot"><strong>Zalecenia:</strong> '+escapeHtml(t.note)+'</div>':'')
    +'<div style="padding:16px;font-size:12px;color:#888">Konsultant: ________________________________ &nbsp; Data: ________</div>'
    +'</body></html>';

  showPdfPreview(previewHtml,function(){
    closePdfPreview();
    var jsPDF=window.jspdf.jsPDF;var doc=new jsPDF({unit:'mm',format:'a4'});
    var W=210,M=12,y=0;
    // Header
    doc.setFillColor(196,123,10);doc.rect(0,0,W,22,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(15);
    doc.text(plchars(t.title||'Badanie'),M,12);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(255,235,180);
    doc.text(plchars(st.name),M,18);y=24;
    // Meta
    doc.setFillColor(255,248,225);doc.rect(0,y,W,10,'F');
    doc.setTextColor(80,60,0);doc.setFontSize(9);
    doc.text(plchars(c.name+' · '+fmtDate(t.ts)+' · '+nP+' probk'+(nP===1?'a':nP<5?'i':'')),M,y+6.5);y+=14;
    // Column widths
    var nameW=40,sampW=nP>1?Math.min(30,(W-2*M-nameW-22)/nP):Math.min(35,(W-2*M-nameW)/nP),diffW=nP>1?22:0;
    // Table header
    doc.setFillColor(240,240,240);doc.rect(M,y,W-2*M,8,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(80,80,80);
    doc.text('SITO',M+2,y+5.5);
    for(var s=0;s<nP;s++) doc.text('P'+(s+1),M+nameW+s*sampW+sampW-2,y+5.5,{align:'right'});
    if(nP>1) doc.text('DELTA',W-M-2,y+5.5,{align:'right'});
    y+=8;
    // Data rows
    sieves.forEach(function(sv,i){
      var pcts=samples.map(function(sp){return sp.results&&sp.results[i]?sp.results[i].pct:0});
      var diff2=nP>1?Math.max.apply(null,pcts)-Math.min.apply(null,pcts):0;
      doc.setDrawColor(230,230,230);doc.line(M,y+9,W-M,y+9);
      doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(20,20,20);
      doc.text(plchars(sv.label),M+2,y+5.5);
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(150,150,150);
      doc.text(sv.min+'-'+sv.max+'%',M+2,y+8.5);
      pcts.forEach(function(pct,s){
        var inN=pct>=sv.min&&pct<=sv.max;
        doc.setFont('helvetica','bold');doc.setFontSize(11);
        doc.setTextColor(inN?15:163,inN?110:45,inN?86:45);
        doc.text(pct.toFixed(1)+'%',M+nameW+s*sampW+sampW-2,y+6.5,{align:'right'});
      });
      if(nP>1){
        doc.setTextColor(196,123,10);doc.setFont('helvetica','bold');doc.setFontSize(10);
        doc.text(diff2.toFixed(1)+'pp',W-M-2,y+6.5,{align:'right'});
      }
      y+=9;if(y>270){doc.addPage();y=14;}
    });
    y+=6;
    if(t.note){doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(80,80,80);doc.text(plchars('Zalecenia: '+t.note),M,y,{maxWidth:W-2*M});y+=14;}
    doc.setTextColor(160,160,160);doc.setFontSize(9);
    doc.text('Konsultant: ________________________________',M,y+6);
    doc.save(sanitize('Sita_'+c.name+'_'+(t.title||'badanie')+'_'+new Date(t.ts).toLocaleDateString('pl').replace(/\./g,'-'))+'.pdf');
    toast('PDF zapisany w Pobranych');
  });
}

