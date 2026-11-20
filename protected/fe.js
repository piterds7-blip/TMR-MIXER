// TMR Mixer — moduł chroniony: Konwerter FE — laboratorium → FeedExpert
// Ten plik NIE jest publikowany na stronie. Workflow wgrywa go do Firestore (kolekcja modules),
// a aplikacja pobiera go dopiero po zalogowaniu użytkownika z dostępem do funkcji „fe”.
// Kod korzysta z funkcji i danych rdzenia aplikacji (index.html).

function renderFEKonwerter(){
  var el=document.getElementById('tab-fe');
  el.innerHTML='<div class="hn"><i class="ti ti-transform"></i><div>Wczytaj sprawozdanie z laboratorium (.xls / .xlsx). Aplikacja przeliczy wartości do wpisania w FeedExpert. Plik jest czytany tylko na tym urządzeniu.</div></div>'
    +'<div id="fe-drop" role="button" tabindex="0" onclick="document.getElementById(\'fe-file-input\').click()">'
    +'<div style="font-size:34px;margin-bottom:8px;color:var(--fe)"><i class="ti ti-file-spreadsheet"></i></div>'
    +'<div style="font-size:16px;font-weight:650;margin-bottom:6px">Wybierz sprawozdanie</div>'
    +'<div style="font-size:13px;color:var(--tx2);line-height:1.5">Dotknij, aby wybrać plik, albo przeciągnij go tutaj.<br>Biofeed, LODR, OHZ — trawa, lucerna, kukurydza</div>'
    +'<input type="file" id="fe-file-input" accept=".xls,.xlsx" style="display:none" onchange="feHandleFile(this.files[0])">'
    +'</div>'
    +'<div id="fe-loading" style="display:none;text-align:center;padding:30px;color:var(--tx2);font-size:15px">Wczytuję i przeliczam…</div>'
    +'<div id="fe-error" style="display:none"></div>'
    +'<div id="fe-result" style="display:none;margin-top:4px"></div>';
  var dropEl=document.getElementById('fe-drop');
  dropEl.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();dropEl.click()}});
  dropEl.addEventListener('dragover',function(e){e.preventDefault();dropEl.style.borderColor='var(--g)'});
  dropEl.addEventListener('dragleave',function(){dropEl.style.borderColor=''});
  dropEl.addEventListener('drop',function(e){e.preventDefault();dropEl.style.borderColor='';if(e.dataTransfer.files[0])feHandleFile(e.dataTransfer.files[0])});
}

function feHandleFile(file){
  if(!file)return;
  if(!/\.xlsx?$/i.test(file.name)){feShowErr('To nie jest plik Excel (.xls / .xlsx).');return}
  document.getElementById('fe-loading').style.display='block';document.getElementById('fe-drop').style.display='none';document.getElementById('fe-error').style.display='none';document.getElementById('fe-result').style.display='none';
  var ready=window.XLSX?Promise.resolve():loadScript('vendor/xlsx.full.min.js');
  ready.then(function(){
    var r=new FileReader();
    r.onload=function(e){
      document.getElementById('fe-loading').style.display='none';
      try{
        var wb=XLSX.read(e.target.result,{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
        render(convert(parse(rows)),file.name);
      }catch(err){feShowErr('Nie udało się odczytać pliku. Sprawdź, czy to sprawozdanie z laboratorium w formacie Excel.')}
    };
    r.onerror=function(){document.getElementById('fe-loading').style.display='none';feShowErr('Nie udało się odczytać pliku.')};
    r.readAsArrayBuffer(file);
  }).catch(function(){
    document.getElementById('fe-loading').style.display='none';
    feShowErr('Nie udało się wczytać modułu Excel. Sprawdź połączenie z internetem i spróbuj ponownie.');
  });
}
function num(v){
  if(v==null||v==='')return null;
  const n=parseFloat(String(v).replace(',','.'));
  return isNaN(n)?null:n;
}

function parse(rows){
  let bC=null,sC=null;
  for(const row of rows){
    for(let c=0;c<row.length;c++){
      const t=String(row[c]||'').toLowerCase();
      if(t.includes('brutto'))bC=c;
      if(t.includes('s.m'))sC=c;
    }
    if(bC!==null&&sC!==null)break;
  }

  let desc='';
  for(let i=0;i<Math.min(15,rows.length);i++){
    const line=rows[i].filter(v=>v!=null).map(v=>String(v)).join(' ');
    if(/kiszonk|lucern|kukurydz|trawa|koniczyn/i.test(line)&&line.length>5){desc=line.substring(0,100);break}
  }

  const MAP=[
    [['sm','sucha masa'],'SM'],
    [['adf'],'ADF'],[['adl'],'ADL'],
    [['białko','białko surowe','cp'],'CP'],
    [['ndf'],'NDF'],[['ph'],'pH'],
    [['popiół','popiół surowy','ash'],'ASH'],
    [['tłuszcz surowy','crude fat','ee'],'EE'],
    [['n-nh3','nh3'],'NH3'],
    [['włókno surowe','crude fibre','cf'],'CF'],
    [['skrobia','starch'],'SKR'],
    [['nel mj/kg','nel'],'NEL'],
    [['udp g/kg','udp'],'UDP'],
    [['nxp g/kg','nxp'],'nXP'],
    [['rnb g/kg','rnb'],'RNB'],
  ];

  const D={_desc:desc};

  for(const row of rows){
    let name=null;
    for(let c=0;c<Math.min(6,row.length);c++){
      const t=String(row[c]||'').trim();
      if(t&&isNaN(parseFloat(t))&&t.length>1&&!/^\[/.test(t)){name=t;break}
    }
    if(!name)continue;
    const low=name.toLowerCase().trim();

    for(const[pats,key]of MAP){
      if(!pats.some(p=>low===p||low.startsWith(p+' ')||low.startsWith(p+'\n')))continue;
      if(D[key])break;

      let bv=null;
      if(bC!==null){
        for(let d=Math.max(1,bC-2);d<=Math.min(row.length-1,bC+2);d++){
          const x=num(row[d]);if(x!==null){bv=x;break}
        }
      }
      let sv=null;
      if(sC!==null){
        for(let d=Math.max(1,sC-1);d<=Math.min(row.length-1,sC+2);d++){
          const x=num(row[d]);if(x!==null&&x!==bv){sv=x;break}
        }
      }
      if(bv===null){for(let d=1;d<row.length;d++){const x=num(row[d]);if(x!==null){bv=x;break}}}
      if(sv===null){
        let found=false;
        for(let d=1;d<row.length;d++){const x=num(row[d]);if(x!==null){if(!found)found=true;else{sv=x;break}}}
      }
      D[key]={b:bv,s:sv};
      break;
    }
  }
  return D;
}

function convert(D){
  const smPct=D.SM?D.SM.b:null;
  if(!smPct)return{error:'Nie znaleziono SM% w pliku.'};

  const warns=[];
  const sections=[];

  /*
   * REGUŁY v8 — zweryfikowane na 17 realnych sprawozdaniach:
   *
   * WPISYWANE RĘCZNIE DO FeedExpert (konwerter podaje):
   *   SM       = brutto% × 10  →  /kg
   *   VEM      = NEL_SM ÷ 0,00697
   *   BO cał.  = Białko %SM × 10  →  g/kg SM
   *   NH3      = N-NH3 SM_col wprost  →  %
   *   WS       = Włókno %SM × 10  →  g/kg SM
   *   Popiół   = Popiół %SM × 10  →  g/kg SM
   *   NDF      = NDF %SM × 10  →  g/kg SM
   *   ADF      = ADF %SM × 10  →  g/kg SM
   *   ADL      = ADL %SM × 10  →  g/kg SM
   *   Tłuszcz  = Tłuszcz %SM × 10  →  g/kg SM
   *   Skrobia  = Skrobia %SM × 10  →  g/kg SM (jeśli badana)
   *   pH       = brutto wprost
   *
   * FEEDEXPERT LICZY SAM (nie podajemy):
   *   DVE, OEB  — z formuł CVB (współczynniki tabelaryczne per typ paszy)
   *   BO        — BO_cał × (1 − NH3/100)
   *   VOS, FOS, VCOS, StV — z formuł CVB
   *
   * INFORMACYJNIE (nie do wpisywania):
   *   nXP, RNB  — system niemiecki GfE, ≠ DVE/OEB
   */

  function sm(key){
    if(!D[key])return null;
    if(D[key].s!==null)return D[key].s;
    if(D[key].b!==null&&smPct)return D[key].b/(smPct/100);
    return null;
  }
  function anal(key){const v=sm(key);return v!==null?Math.round(v*10):null}
  function analPct(key){return sm(key)}
  function calc(key){return sm(key)}

  // ── Baza — lewa kolumna (wpisywane ręcznie)
  const sL={title:'Wpisz w FeedExpert — lewa kolumna',rows:[]};
  sL.rows.push({name:'SM',val:Math.round(smPct*10),unit:'/kg',calc:smPct+'% × 10'});

  const nelSM=calc('NEL');
  if(nelSM!==null){
    sL.rows.push({name:'VEM',val:Math.round(nelSM/0.00697),unit:'/kg SM',calc:'NEL '+nelSM.toFixed(3)+' MJ ÷ 0,00697'});
  }else warns.push('Brak NEL — VEM nie wyliczono. Zostaw z wzorca.');

  const cpPct=analPct('CP');
  let boCal=null;
  if(cpPct!==null){boCal=Math.round(cpPct*10);sL.rows.push({name:'BO cał.',val:boCal,unit:'g/kg SM',calc:cpPct.toFixed(2)+'% SM × 10'})}

  // NH3
  let nh3=null;
  if(D.NH3&&D.NH3.s!==null){
    nh3=Math.floor(D.NH3.s*10)/10;
    sL.rows.push({name:'NH3',val:nh3.toFixed(1),unit:'%',calc:'N-NH3 SM_col wprost'});
  }else warns.push('Brak N-NH3 — wpisz NH3 = 0 lub zostaw z wzorca.');

  // BO — informacyjnie (FeedExpert liczy sam)
  if(boCal!==null&&nh3!==null){
    const bo=Math.round(boCal*(1-nh3/100));
    sL.rows.push({name:'BO',val:bo,unit:'g/kg SM',calc:'FeedExpert liczy: '+boCal+'×(1−'+nh3+'/100)', auto:true});
  }

  const cfPct=analPct('CF');
  if(cfPct!==null)sL.rows.push({name:'WS',val:Math.round(cfPct*10),unit:'g/kg SM',calc:cfPct.toFixed(2)+'% SM × 10'});
  const ashPct=analPct('ASH');
  if(ashPct!==null)sL.rows.push({name:'Popiół',val:Math.round(ashPct*10),unit:'g/kg SM',calc:ashPct.toFixed(2)+'% SM × 10'});
  sections.push(sL);

  // ── Baza — prawa kolumna
  const sR={title:'Wpisz w FeedExpert — prawa kolumna',rows:[]};
  const ndfPct=analPct('NDF');
  if(ndfPct!==null)sR.rows.push({name:'NDF',val:Math.round(ndfPct*10),unit:'g/kg SM',calc:ndfPct.toFixed(2)+'% SM × 10'});
  const adfPct=analPct('ADF');
  if(adfPct!==null)sR.rows.push({name:'ADF',val:Math.round(adfPct*10),unit:'g/kg SM',calc:adfPct.toFixed(2)+'% SM × 10'});
  const adlPct=analPct('ADL');
  if(adlPct!==null)sR.rows.push({name:'ADL',val:Math.round(adlPct*10),unit:'g/kg SM',calc:adlPct.toFixed(2)+'% SM × 10'});
  const eePct=analPct('EE');
  if(eePct!==null)sR.rows.push({name:'Tłuszcz sur.',val:Math.round(eePct*10),unit:'g/kg SM',calc:eePct.toFixed(2)+'% SM × 10'});
  sections.push(sR);

  // ── Inne
  const sX={title:'Wpisz w FeedExpert — inne pola',rows:[]};
  const skrPct=analPct('SKR');
  if(skrPct!==null)sX.rows.push({name:'Skrobia',val:Math.round(skrPct*10),unit:'g/kg SM',calc:skrPct.toFixed(2)+'% SM × 10'});
  const phVal=D.pH?D.pH.b:null;
  if(phVal!==null)sX.rows.push({name:'pH',val:phVal.toFixed(1),unit:'',calc:'bezpośrednio'});
  if(sX.rows.length)sections.push(sX);

  // ── Referencja GfE (nie do wpisywania)
  const sRef={title:'Referencja — system niemiecki GfE (nie wpisuj do FeedExpert)',rows:[]};
  const nxpSM=calc('nXP');
  if(nxpSM!==null)sRef.rows.push({name:'nXP',val:Math.round(nxpSM),unit:'g/kg SM',calc:'≠ DVE! System GfE',ref:true});
  const rnbSM=calc('RNB');
  if(rnbSM!==null)sRef.rows.push({name:'RNB',val:Math.round(rnbSM),unit:'g/kg SM',calc:'≠ OEB! System GfE',ref:true});
  const udpSM=calc('UDP');
  if(udpSM!==null)sRef.rows.push({name:'UDP',val:Math.round(udpSM),unit:'g/kg SM',calc:'bypass protein GfE',ref:true});
  if(sRef.rows.length)sections.push(sRef);

  return{smPct,sections,warns,desc:D._desc};
}

function render(result,fname){
  const rw=document.getElementById('fe-result');
  if(result.error){feShowErr(result.error==='Nie znaleziono SM% w pliku.'?'Nie znaleziono suchej masy (SM) w pliku — to chyba nie jest sprawozdanie z analizy kiszonki.':result.error);return}
  const{sections,warns,desc,smPct}=result;
  window._rows=sections.flatMap(s=>s.rows.filter(r=>!r.ref&&!r.auto));
  window._fname=fname;

  let tbl='<table class="params">';
  for(const sec of sections){
    if(!sec.rows.length)continue;
    const isRef=sec.rows[0]&&sec.rows[0].ref;
    tbl+='<tr class="sr"><td colspan="4">'+sec.title+'</td></tr>';
    for(const r of sec.rows){
      const vs=typeof r.val==='number'?String(Math.round(r.val)):r.val;
      const style=r.ref?' style="opacity:0.5;font-style:italic"':(r.auto?' style="opacity:0.7"':'');
      const valStyle=r.ref?' style="font-size:14px;font-weight:500;color:var(--tx2)"':'';
      tbl+='<tr class="pr"'+style+'><td class="cn">'+escapeHtml(r.name)+'</td><td class="cv"'+valStyle+'>'+escapeHtml(vs)+'</td><td class="cu">'+escapeHtml(r.unit)+'</td><td class="cc">'+escapeHtml(r.calc)+'</td></tr>';
    }
  }
  tbl+='</table>';

  let notes='';
  if(warns.length)notes+='<div class="note w">⚠ '+warns.join('<br>⚠ ')+'</div>';
  notes+='<div class="note i"><strong>DVE, OEB, VOS, FOS, VCOS, StV</strong> — FeedExpert liczy automatycznie z formuł CVB po wpisaniu powyższych parametrów. Nie wpisuj nXP jako DVE ani RNB jako OEB — to inne systemy!</div>';
  notes+='<div class="note i">VOS, FOS, VCOS, minerały (Na, K, Mg, Ca, P), Cukier — zostaw z wybranego wzorca kiszonki.</div>';

  rw.innerHTML='<div class="rc"><div class="ch"><div class="ch-l"><h3>Wartości do wpisania w FeedExpert</h3><p>'+escapeHtml(desc||fname)+' · SM = '+smPct+'%</p></div><div class="ca"><button class="btn" id="fe-copy-btn" onclick="copyAll()"><i class="ti ti-copy"></i> Kopiuj</button><button class="btn" onclick="window.print()" aria-label="Drukuj"><i class="ti ti-printer"></i></button></div></div>'+tbl+'<div class="notes">'+notes+'</div></div><div class="nfr"><button class="nfb" onclick="newFile()"><i class="ti ti-file-spreadsheet"></i> Wczytaj kolejny plik</button></div>';
  rw.style.display='block';
  document.getElementById('fe-drop').style.display='none';
  rw.scrollIntoView({behavior:'smooth',block:'start'});
}

function copyAll(){
  const rows=window._rows;if(!rows)return;
  const lines=['=== FeedExpert — '+(window._fname||'')+' ===',''];
  for(const r of rows){
    const vs=typeof r.val==='number'?String(Math.round(r.val)):r.val;
    lines.push(r.name+': '+vs+(r.unit?' '+r.unit:''));
  }
  lines.push('','DVE, OEB → FeedExpert liczy sam (formuły CVB)');
  const text=lines.join('\n');
  const btn=document.getElementById('fe-copy-btn');

  function ok(){ toast('Skopiowano wartości do schowka'); if(btn){btn.innerHTML='<i class="ti ti-check"></i> Skopiowano';setTimeout(()=>{btn.innerHTML='<i class="ti ti-copy"></i> Kopiuj'},1800);} }
  function fail(){ showCopyFallback(text); }

  // Try modern Clipboard API (requires https:// or localhost)
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(ok).catch(()=>legacyCopy(text,ok,fail));
  } else {
    legacyCopy(text,ok,fail);
  }
}

function legacyCopy(text,ok,fail){
  // Fallback for file:// or non-secure context: hidden textarea + execCommand
  try{
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.style.position='fixed';
    ta.style.left='-9999px';
    ta.style.top='0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const success=document.execCommand('copy');
    document.body.removeChild(ta);
    if(success) ok(); else fail();
  }catch(e){ fail(); }
}

function showCopyFallback(text){
  // Last resort: show a selectable textarea in a modal so user can copy manually (Ctrl+C)
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick=e=>{ if(e.target===overlay) overlay.remove(); };
  const box=document.createElement('div');
  box.style.cssText='background:#fff;border-radius:10px;padding:20px;max-width:480px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.3)';
  box.innerHTML='<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#192e1d">Kopiowanie automatyczne niedostępne (plik otwarty lokalnie)</div>'+
    '<div style="font-size:12px;color:#6a8a72;margin-bottom:10px">Zaznacz poniższy tekst i skopiuj ręcznie (Ctrl+C / Cmd+C):</div>';
  const ta=document.createElement('textarea');
  ta.value=text;
  ta.style.cssText='width:100%;height:220px;font-family:Consolas,monospace;font-size:12px;padding:10px;border:1px solid #c5deca;border-radius:6px;resize:vertical';
  box.appendChild(ta);
  const closeBtn=document.createElement('button');
  closeBtn.textContent='Zamknij';
  closeBtn.style.cssText='margin-top:10px;font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid #c5deca;background:#eaf4ed;color:#2a7a42;cursor:pointer';
  closeBtn.onclick=()=>overlay.remove();
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  ta.focus();
  ta.select();
}
function newFile(){
  document.getElementById('fe-result').style.display='none';
  document.getElementById('fe-error').style.display='none';
  document.getElementById('fe-drop').style.display='block';
  var fi=document.getElementById('fe-file-input');if(fi)fi.value='';
  window.scrollTo({top:0,behavior:'smooth'});
}
function feShowErr(msg){
  var el=document.getElementById('fe-error');if(!el){toast(msg,true);return}
  el.innerHTML='<i class="ti ti-alert-circle"></i> '+escapeHtml(msg);el.style.display='block';
  document.getElementById('fe-drop').style.display='block';
  var fi=document.getElementById('fe-file-input');if(fi)fi.value='';
}
