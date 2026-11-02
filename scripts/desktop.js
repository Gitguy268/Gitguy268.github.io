(() => {
  'use strict';
  globalThis.WindowGeometry = function(box, bounds, full = false) {
    if (full) return {x:0,y:0,w:bounds.width,h:bounds.height};
    const w=Math.min(Math.max(280,box.w),bounds.width), h=Math.min(Math.max(220,box.h),bounds.height);
    return {w,h,x:Math.min(Math.max(0,box.x),Math.max(0,bounds.width-w)),y:Math.min(Math.max(0,box.y),Math.max(0,bounds.height-h))};
  };
  if (typeof window === 'undefined') return;
  const { $, escape:e, projects, categories, categoryLabel, about, contact, details, navigate, loadScript, cursors } = window.Portfolio;
  // Small original SVG icons, drawn on a 24-pixel grid and served inline.
  const art = {
    folder:'<path fill="#685300" d="M1 5h9l2 3h11v13H1z"/><path fill="#ffe393" d="M2 4h8l2 3h10v12H2z"/><path fill="#c49127" d="M2 10h20v10H2z"/><path fill="#ffe393" d="M4 11h20l-3 10H1z"/><path fill="#fff1b7" d="M4 11h20v2H4z"/>',
    computer:'<path fill="#222" d="M2 2h19v15H2zM8 17h7v3h6v3H2v-3h6z"/><path fill="#ddd" d="M1 1h19v15H1zM7 16h7v3h6v3H1v-3h6z"/><path fill="#777" d="M3 3h15v10H3z"/><path fill="#008080" d="M4 4h13v8H4z"/><path fill="#b6eddf" d="M5 5h8v1H5z"/><path fill="#555" d="M3 20h9v1H3z"/>',
    note:'<path fill="#333" d="M5 2h14v21H5z"/><path fill="#fffef6" d="M4 1h14v20H4z"/><path fill="#699cbb" d="M6 5h10v1H6zM6 8h10v1H6zM6 11h10v1H6zM6 14h7v1H6z"/><path fill="#c69d23" d="M18 8h3v14h-3z"/><path fill="#fff0a0" d="M18 8h1v12h-1z"/>',
    mail:'<path fill="#333" d="M2 6h21v15H2z"/><path fill="#fffde9" d="M1 5h21v15H1z"/><path fill="#777" d="M2 6h2v2H2zM4 8h2v2H4zM6 10h2v2H6zM8 12h6v2H8zM14 10h2v2h-2zM16 8h2v2h-2zM18 6h3v2h-3z"/>',
    terminal:'<path fill="#ddd" d="M1 2h22v20H1z"/><path fill="#000080" d="M2 3h20v3H2z"/><path fill="#102b1a" d="M2 7h20v14H2z"/><path fill="#adf7cf" d="M4 9h2v2H4zM6 11h2v2H6zM4 13h2v2H4zM10 14h7v1h-7z"/>',
    mine:'<path fill="#222" d="M10 1h3v22h-3zM1 10h22v3H1zM4 4h3v3H4zM17 17h3v3h-3zM17 4h3v3h-3zM4 17h3v3H4z"/><path fill="#444" d="M7 5h9v2h3v10h-3v3H7v-3H4V7h3z"/><path fill="#111" d="M7 7h10v10H7z"/><path fill="#fff" d="M8 8h3v3H8z"/>',
    person:'<path fill="#262626" d="M8 1h8v2h2v8h-3v3h5v3h2v6H2v-6h2v-3h5v-3H6V3h2z"/><path fill="#ecc8a3" d="M8 4h8v6h-2v3h-4v-3H8z"/><path fill="#9ed3b1" d="M6 15h12v2h2v5H4v-5h2z"/><path fill="#fff" d="M10 14h4v4h-4z"/>',
    mouse:'<path fill="#333" d="M8 7h11v16H8z"/><path fill="#ece8dc" d="M6 6h11v16H6z"/><path fill="#8a8a8a" d="M6 12h11v1H6zM11 6h1v6h-1z"/><path fill="#c9c4b6" d="M15 13h2v9h-2z"/><path fill="#444" d="M11 1h1v5h-1zM12 0h5v1h-5z"/>',
    start:'<path fill="#333" d="M2 2h9v9H2zM13 2h9v9h-9zM2 13h9v9H2zM13 13h9v9h-9z"/><path fill="#e66348" d="M3 3h7v7H3z"/><path fill="#7fb65c" d="M14 3h7v7h-7z"/><path fill="#69a6d3" d="M3 14h7v7H3z"/><path fill="#efd17b" d="M14 14h7v7h-7z"/>',
  };
  function icon(name) { return `<svg class="pixel-icon" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">${art[name]||art.folder}</svg>`; }
  window.createDesktop = function(root) {
    const apps = {
      projects:{name:'My Projects',icon:'folder',width:650,height:460},
      about:{name:'About Lucas',icon:'person',width:520,height:420},
      contact:{name:'Contact',icon:'mail',width:460,height:300},
      terminal:{name:'Terminal',icon:'terminal',width:680,height:530},
      notepad:{name:'Notepad',icon:'note',width:550,height:420},
      mines:{name:'Minesweeper',icon:'mine',width:350,height:540},
      mouse:{name:'Mouse',icon:'mouse',width:440,height:380},
    };
    root.innerHTML = `<div class="desktop-workspace"><div class="desktop-icons">${Object.entries(apps).map(([id,app])=>`<button class="desktop-icon" data-app="${id}">${icon(app.icon)}<span>${app.name}</span></button>`).join('')}</div><div class="desktop-help"><a class="desktop-switch win-button" href="?view=choose">Switch experience</a><p>Double-click an icon to open it.<br>On a phone, tap once.</p></div><div class="windows"></div></div><div class="start-menu" id="desktop-start-menu" hidden><span class="start-brand" aria-hidden="true">Lucas 98</span>${Object.entries(apps).map(([id,app])=>`<button data-app="${id}">${icon(app.icon)}<span>${app.name}</span></button>`).join('')}<hr><button data-switch>${icon('computer')}Switch experience</button></div><div class="desktop-taskbar"><button class="win-button start-button" aria-expanded="false" aria-controls="desktop-start-menu">${icon('start')}Start</button><div class="task-list" aria-label="Open windows"></div><time class="desktop-clock" aria-label="Current time"></time></div>`;
    const workspace=$('.desktop-workspace',root), container=$('.windows',root), taskList=$('.task-list',root);
    const startButton=$('.start-button',root), startMenu=$('.start-menu',root), mobile=matchMedia('(max-width:680px)');
    const windows=new Map(); let z=10,active=true,ticker=null,activeId=null,sessionNote=null,noteStorage=true;
    const bounds=()=>({width:workspace.clientWidth,height:workspace.clientHeight});
    function menu(open) { startMenu.hidden=!open;startButton.setAttribute('aria-expanded',String(open)); }
    function focusWindow(win, takeFocus=false) {
      for(const other of windows.values()) {other.element.classList.remove('active');other.task.setAttribute('aria-pressed','false');}
      win.minimized=false;win.element.hidden=false;win.element.classList.add('active');win.task.setAttribute('aria-pressed','true');win.element.style.zIndex=++z;activeId=win.id;
      if(takeFocus) $('.win-titlebar',win.element).focus({preventScroll:true});
    }
    function position(win) {
      const b=bounds();const full=win.maximized||mobile.matches;
      win.element.classList.toggle('maximized',full);
      const rect=WindowGeometry(win.box,b,full);
      if(!full)win.box={...rect};
      Object.assign(win.element.style,{left:rect.x+'px',top:rect.y+'px',width:rect.w+'px',height:rect.h+'px'});
      const button=$('[data-win="maximize"]',win.element);button.setAttribute('aria-label',win.maximized?'Restore window':'Maximize window');button.textContent=win.maximized?'❐':'□';
    }
    function selectNext() {const next=[...windows.values()].filter(w=>!w.minimized).sort((a,b)=>Number(b.element.style.zIndex)-Number(a.element.style.zIndex))[0];if(next)focusWindow(next,true);else {activeId=null;startButton.focus();}}
    function minimize(win) {win.minimized=true;win.element.hidden=true;win.element.classList.remove('active');win.task.setAttribute('aria-pressed','false');if(activeId===win.id)selectNext();}
    function close(win) {win.cleanup?.();win.element.remove();win.task.remove();windows.delete(win.id);if(activeId===win.id)selectNext();}
    function maximize(win) {win.maximized=!win.maximized;position(win);focusWindow(win);}
    function gesture(win,handle,resize=false) {
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0||event.target.closest('button')&&!resize||win.maximized||mobile.matches)return;
        event.preventDefault();focusWindow(win);const initial={...win.box},x=event.clientX,y=event.clientY;handle.setPointerCapture(event.pointerId);
        const move=ev=>{const dx=ev.clientX-x,dy=ev.clientY-y;
          if(resize){const b=bounds();win.box.w=Math.min(initial.w+dx,b.width-win.box.x);win.box.h=Math.min(initial.h+dy,b.height-win.box.y);}else{win.box.x=initial.x+dx;win.box.y=initial.y+dy;}position(win);
        };
        const end=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);};
        handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
      });
      handle.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||win.maximized||mobile.matches)return;
        event.preventDefault();const amount=event.ctrlKey?1:10;const dx=event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0;const dy=event.key==='ArrowUp'?-amount:event.key==='ArrowDown'?amount:0;
        if(resize||event.shiftKey){win.box.w+=dx;win.box.h+=dy;}else{win.box.x+=dx;win.box.y+=dy;}position(win);
      });
    }
    function createWindow(id,app) {
      if(windows.has(id)){focusWindow(windows.get(id),true);return null;}
      const count=windows.size;const b=bounds();
      const win={id,box:{x:Math.min(140+count*24,Math.max(0,b.width-app.width-20)),y:Math.min(55+count*22,Math.max(0,b.height-app.height-15)),w:app.width,h:app.height},maximized:false,minimized:false};
      win.element=document.createElement('section');win.element.className='win';win.element.dataset.window=id;win.element.setAttribute('role','dialog');win.element.setAttribute('aria-labelledby',`window-${id}-title`);
      win.element.innerHTML=`<div class="win-titlebar" tabindex="0" aria-label="${e(app.name)} window. Arrow keys move, Shift and arrow keys resize.">${icon(app.icon)}<h2 id="window-${id}-title">${e(app.name)}</h2><div class="win-controls"><button class="win-button" data-win="minimize" aria-label="Minimize window">_</button><button class="win-button" data-win="maximize" aria-label="Maximize window">□</button><button class="win-button close-window" data-win="close" aria-label="Close window">×</button></div></div><div class="win-content"></div><div class="win-status"></div><button class="win-resize" aria-label="Resize window with arrow keys"></button>`;
      win.content=$('.win-content',win.element);win.status=$('.win-status',win.element);
      win.task=document.createElement('button');win.task.className='win-button task-button';win.task.setAttribute('aria-pressed','false');win.task.setAttribute('aria-label',`${app.name} window`);win.task.innerHTML=`${icon(app.icon)}<span>${e(app.name)}</span>`;
      win.task.addEventListener('click',()=>{if(activeId===id&&!win.minimized)minimize(win);else focusWindow(win,true);});
      win.element.addEventListener('pointerdown',()=>focusWindow(win));
      win.element.addEventListener('focusin',()=>{if(activeId!==id)focusWindow(win);});
      win.element.addEventListener('click',event=>{const action=event.target.closest('[data-win]')?.dataset.win;if(action==='close')close(win);if(action==='minimize')minimize(win);if(action==='maximize')maximize(win);});
      const titlebar=$('.win-titlebar',win.element);titlebar.addEventListener('dblclick',event=>{if(!event.target.closest('button'))maximize(win);});gesture(win,titlebar);gesture(win,$('.win-resize',win.element),true);
      container.append(win.element);taskList.append(win.task);windows.set(id,win);position(win);focusWindow(win,true);return win;
    }
    function projectWindow(project) {const win=createWindow('project-'+project.id,{name:project.title,icon:'note',width:590,height:500});if(!win)return;win.content.innerHTML=`<article class="desktop-document">${details(project)}</article>`;win.status.textContent=project.status==='public'?'Links open in your browser.':'Not published yet.';}
    function explorer(win,category=null) {
      const list=category?projects.filter(p=>category==='all'||p.category===category):null;
      win.content.innerHTML=`<div class="explorer-toolbar"><button class="win-button" data-back ${category?'':'disabled'}>← Back</button><span class="explorer-address">C:\\My Projects${category?'\\'+e(category==='all'?'All projects':categoryLabel(category)):''}</span></div><div class="explorer-grid">${list?list.map(p=>`<button class="explorer-item" data-project-id="${e(p.id)}">${icon(p.status==='public'?'computer':'note')}<span>${e(p.title)}</span><small>${p.status==='public'?'Available online':'Not published yet'}</small></button>`).join(''):['all',...categories].map(c=>`<button class="explorer-item" data-folder="${c}">${icon('folder')}<span>${c==='all'?'All projects':e(categoryLabel(c))}</span><small>${c==='all'?projects.length:projects.filter(p=>p.category===c).length} projects</small></button>`).join('')}</div>`;
      win.status.textContent=list?`${list.length} projects · Select one to take a look.`:`${projects.length} projects · Open a folder to explore.`;
      $('[data-back]',win.content).addEventListener('click',()=>explorer(win));
      for(const button of win.content.querySelectorAll('[data-folder]'))button.addEventListener('click',()=>explorer(win,button.dataset.folder));
      for(const button of win.content.querySelectorAll('[data-project-id]'))button.addEventListener('click',()=>projectWindow(projects.find(p=>p.id===button.dataset.projectId)));
    }
    function notepad(win) {
      win.content.innerHTML='<div class="notepad"><div class="notepad-tools"><button class="win-button" data-save>Save as .txt</button><span class="note-save-status" role="status"></span></div><textarea aria-label="Notepad text" spellcheck="false" placeholder=""></textarea></div>';
      const input=$('textarea',win.content),status=$('.note-save-status',win.content);let storage=noteStorage;
      if(sessionNote===null){try {sessionNote=localStorage.getItem('lucas98-notepad')||'';}catch{sessionNote='';storage=false;}}
      input.value=sessionNote;noteStorage=storage;
      const update=()=>{win.status.textContent=`${input.value.length} characters · Your notes stay on this device.`;status.textContent=storage?'Saved on this device':'Session only · use Save as .txt';};
      input.addEventListener('input',()=>{sessionNote=input.value;try{localStorage.setItem('lucas98-notepad',input.value);storage=true;}catch{storage=false;}noteStorage=storage;update();});
      $('[data-save]',win.content).addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([input.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='lucas-notepad.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});update();
    }
    function mines(win) {
      const game=new window.Minesweeper();let seconds=0,flagMode=false;
      win.content.innerHTML='<div class="mines-app"><div class="mines-controls"><output class="mine-counter mines-left" aria-label="Mines remaining">010</output><button class="win-button mine-reset" aria-label="Restart Minesweeper">☺</button><output class="mine-counter mine-time" aria-label="Elapsed seconds">000</output></div><div class="mine-board" role="group" aria-label="Minesweeper board"></div><div class="mine-bottom"><button class="win-button flag-mode" aria-pressed="false">⚑ Flag mode</button><p>9 × 9 / 10 mines</p></div><p class="mine-message" role="status">Pick a square. Your first move is safe.</p></div>';
      const board=$('.mine-board',win.content);const cells=[];
      for(let i=0;i<81;i++) {const button=document.createElement('button');button.className='mine-cell';button.dataset.cell=i;button.tabIndex=i===0?0:-1;board.append(button);cells.push(button);}
      function render() {
        game.cells.forEach((cell,i)=>{const button=cells[i],showMine=game.status==='lost'&&cell.mine;button.classList.toggle('revealed',cell.revealed||showMine);button.classList.toggle('mine',showMine);button.dataset.number=cell.adjacent;
          button.textContent=showMine?'✹':cell.flagged?'⚑':cell.revealed&&cell.adjacent?cell.adjacent:'';
          button.setAttribute('aria-label',`Row ${Math.floor(i/9)+1}, column ${i%9+1}: ${showMine?'mine':cell.flagged?'flagged':cell.revealed?cell.adjacent+' adjacent mines':'unopened'}`);
        });
        $('.mines-left',win.content).textContent=String(10-game.flags).padStart(3,'0');
        $('.mine-reset',win.content).textContent=game.status==='won'?'☻':game.status==='lost'?'×':'☺';
        $('.mine-message',win.content).textContent=game.status==='won'?'All 71 safe squares cleared.':game.status==='lost'?'You hit a mine. Press the face to restart.':game.status==='ready'?'Pick a square. Your first move is safe.':'Find the safe squares. Right-click or use flag mode to mark a mine.';
        win.status.textContent=game.status==='won'?'You won!':game.status==='lost'?'Game over':`${game.revealed} / 71 safe squares · Arrow keys move, F flags.`;
      }
      function focusCell(i){cells.forEach((b,n)=>b.tabIndex=n===i?0:-1);cells[i].focus();}
      board.addEventListener('click',event=>{const button=event.target.closest('[data-cell]');if(!button)return;const i=Number(button.dataset.cell);focusCell(i);if(flagMode)game.flag(i);else game.reveal(i);render();});
      board.addEventListener('contextmenu',event=>{const button=event.target.closest('[data-cell]');if(!button)return;event.preventDefault();game.flag(Number(button.dataset.cell));render();});
      board.addEventListener('keydown',event=>{const button=event.target.closest('[data-cell]');if(!button)return;const i=Number(button.dataset.cell),row=Math.floor(i/9),col=i%9;
        const next={ArrowLeft:row*9+Math.max(0,col-1),ArrowRight:row*9+Math.min(8,col+1),ArrowUp:Math.max(0,row-1)*9+col,ArrowDown:Math.min(8,row+1)*9+col}[event.key];
        if(next!==undefined){event.preventDefault();focusCell(next);}if(event.key.toLowerCase()==='f'){event.preventDefault();game.flag(i);render();}
      });
      $('.flag-mode',win.content).addEventListener('click',event=>{flagMode=!flagMode;event.currentTarget.setAttribute('aria-pressed',String(flagMode));});
      $('.mine-reset',win.content).addEventListener('click',()=>{game.reset();seconds=0;flagMode=false;$('.flag-mode',win.content).setAttribute('aria-pressed','false');$('.mine-time',win.content).textContent='000';render();});
      win.tick=()=>{if(game.status==='playing'&&!win.minimized){seconds=Math.min(999,seconds+1);$('.mine-time',win.content).textContent=String(seconds).padStart(3,'0');}};render();
    }
    async function openApp(id) {
      menu(false);const app=apps[id];if(!app)return;const win=createWindow(id,app);if(!win)return;
      if(id==='projects')explorer(win);
      if(id==='about'){win.content.innerHTML=`<article class="desktop-document"><p class="detail-category">README.TXT</p><h2>Hello, I’m Lucas.</h2>${about.map(p=>`<p>${e(p)}</p>`).join('')}<p>Open My Projects to browse all ${projects.length} projects, including the unfinished ones.</p></article>`;win.status.textContent='Lucas van de Weerd · Gitguy268';}
      if(id==='contact'){win.content.innerHTML=`<article class="desktop-document"><p class="detail-category">ADDRESS BOOK</p><h2>Contact</h2><address><a href="mailto:${contact.email}">${contact.email}</a><br><a href="${contact.github}" target="_blank" rel="noopener noreferrer">github.com/Gitguy268 ↗</a></address></article>`;win.status.textContent='Email opens your mail app. GitHub opens in a new tab.';}
      if(id==='notepad')notepad(win);
      if(id==='mouse'){
        const names={system:'Windows Standard',vinyl:'Vinyl',glass:'Liquid glass',spot:'Spot’s fur'},current=document.documentElement.dataset.cursor;
        const preview=c=>c==='system'?'':`<img src="cursors/${c}.svg" alt="" width="32" height="32"><img src="cursors/${c==='spot'?'spot-paw':c+'-hand'}.svg" alt="" width="32" height="32">`;
        win.content.innerHTML=`<article class="desktop-document"><p class="detail-category">MOUSE PROPERTIES</p><h2>Pointers</h2><div class="pointer-schemes" role="group" aria-label="Pointer scheme">${cursors.map(c=>`<button class="win-button pointer-scheme" data-cursor-pick="${c}" aria-pressed="${c===current}">${preview(c)}<span>${names[c]}</span></button>`).join('')}</div><p>The pointer changes on all three views of this site. It shows when you use a mouse or trackpad.</p></article>`;
        win.status.textContent='Your choice is remembered on this device.';
      }
      if(id==='mines'){
        win.status.textContent='Loading Minesweeper…';
        try {await loadScript('scripts/mines.js');if(windows.get(id)===win)mines(win);}
        catch {win.content.textContent='Minesweeper could not load. Close this window and try again.';win.status.textContent='Load failed';}
      }
      if(id==='terminal'){
        win.status.textContent='Loading terminal…';
        try {await loadScript('scripts/terminal.js');if(windows.get(id)!==win)return;window.createTerminal(win.content,{embedded:true});win.status.textContent='help · projects · about · contact';}
        catch {win.content.textContent='Could not load the terminal. Close this window and try again.';win.status.textContent='The rest of your desktop is still available.';}
      }
    }
    root.addEventListener('click',event=>{
      const app=event.target.closest('[data-app]');
      if(app){
        if(!app.classList.contains('desktop-icon')||mobile.matches||event.detail===0)openApp(app.dataset.app);
        else {for(const button of root.querySelectorAll('.desktop-icon'))button.classList.toggle('selected',button===app);}
      }
      if(event.target.closest('[data-switch]'))navigate('choose');
      if(!event.target.closest('.start-menu,.start-button'))menu(false);
    });
    root.addEventListener('dblclick',event=>{const app=event.target.closest('.desktop-icon');if(app&&!mobile.matches)openApp(app.dataset.app);});
    $('.desktop-icons',root).addEventListener('keydown',event=>{
      const icons=[...root.querySelectorAll('.desktop-icon')],i=icons.indexOf(document.activeElement);
      const delta={ArrowDown:1,ArrowUp:-1,ArrowRight:mobile.matches?3:6,ArrowLeft:mobile.matches?-3:-6}[event.key];
      if(i>=0&&delta!==undefined){event.preventDefault();icons[(i+delta+icons.length)%icons.length].focus();}
    });
    startButton.addEventListener('click',()=>{const open=startMenu.hidden;menu(open);if(open)$('button',startMenu).focus();});
    startMenu.addEventListener('keydown',event=>{const items=[...startMenu.querySelectorAll('button')],i=items.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();items[(i+(event.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();}});
    root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!startMenu.hidden){menu(false);startButton.focus();}});
    const observer=new ResizeObserver(()=>{if(active)for(const win of windows.values())position(win);});observer.observe(workspace);
    function tick(){const now=new Date();$('.desktop-clock',root).textContent=now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});$('.desktop-clock',root).dateTime=now.toISOString();for(const win of windows.values())win.tick?.();}
    function setActive(value){active=value;clearInterval(ticker);ticker=null;if(value){for(const win of windows.values())position(win);const now=new Date();$('.desktop-clock',root).textContent=now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});ticker=setInterval(tick,1000);}else menu(false);}
    return {setActive};
  };
})();
