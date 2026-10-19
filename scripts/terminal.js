(() => {
  'use strict';
  class CommandHistory {
    constructor(){this.items=[];this.index=0;this.draft='';}
    add(command){this.items.push(command);this.index=this.items.length;this.draft='';}
    previous(current){if(this.index===this.items.length)this.draft=current;this.index=Math.max(0,this.index-1);return this.items[this.index]??current;}
    next(){this.index=Math.min(this.items.length,this.index+1);return this.index===this.items.length?this.draft:this.items[this.index];}
  }
  function parse(command){const [verb='',...args]=command.trim().toLowerCase().split(/\s+/);return {verb,value:args.join(' ')};}
  function complete(text,candidates){
    const matches=[...new Set(candidates)].filter(c=>c.startsWith(text.toLowerCase()));
    let prefix=matches[0]||text;
    for(const candidate of matches)while(!candidate.startsWith(prefix))prefix=prefix.slice(0,-1);
    return {matches,value:prefix};
  }
  // Categories act as folders under ~. Returns the new folder ('' is ~), or null if there is no such folder.
  function resolvePath(cwd,arg,dirs){
    let parts=cwd?[cwd]:[];
    if(/^(~|\/)/.test(arg)){parts=[];arg=arg.replace(/^~?\/?/,'');}
    for(const part of arg.split('/')){
      if(!part||part==='.')continue;
      if(part==='..')parts.pop();
      else if(!parts.length&&dirs.includes(part))parts.push(part);
      else return null;
    }
    return parts[0]||'';
  }
  globalThis.TerminalModel={CommandHistory,parse,complete,resolvePath};
  if(typeof window==='undefined')return;
  const { $, escape: e, projects, categories, about, contact, details, navigate, cursors } = window.Portfolio;
  const themes={mint:{'--mint':'#adf7cf'},amber:{'--mint':'#ffd28c'},hyper:{'--mint':'#f81ce5','--terminal-bg':'#000','--terminal-ink':'#fff'},crt:{'--mint':'#7dff9b'}};
  // Original ASCII art of Spot for neofetch.
  const spot=[' .--.      .--.','/    \\____/    \\','\\__/ o    o \\__/','   |   __   |','   |  (__)  |','    \\  \\/  /','     \'----\''];
  window.createTerminal = function(root, {embedded = false} = {}) {
    root.innerHTML = `${embedded ? '' : '<div class="terminal-top"><a href="?view=website">Lucas van de Weerd</a><a href="?view=choose">Switch experience</a></div>'}<div class="terminal-panel">${embedded ? '' : '<div class="terminal-chrome"><span>guest@lucas: ~</span><span>terminal</span></div>'}<div class="terminal-content"><pre class="terminal-banner">Lucas van de Weerd / projects</pre><p class="terminal-welcome">${projects.length} projects. Type help for commands, or click one below.</p><div class="terminal-suggestions" aria-label="Suggested commands"><button data-command="help">help</button><button data-command="projects">projects</button><button data-command="about">about</button><button data-command="contact">contact</button></div><div class="terminal-log" role="log" aria-label="Command output" aria-live="polite" aria-relevant="additions" tabindex="0"></div><form class="command-line" autocomplete="off"><label class="terminal-prompt">guest@lucas:~$</label><input name="command" aria-label="Terminal command" placeholder="help" autocapitalize="off" spellcheck="false"><button type="submit" aria-label="Run command">↵</button></form><p class="boot-feedback">↑ ↓ history · Tab complete · Ctrl+L clear</p></div></div>`;
    const log = $('.terminal-log',root), input = $('input',root), feedback = $('.boot-feedback',root);
    const history = new CommandHistory(); let completion=null, cwd='', theme='mint';
    const prompt=()=>`guest@lucas:~${cwd?'/'+cwd:''}$`;
    const defaultFeedback='↑ ↓ history · Tab complete · Ctrl+L clear';
    const help = {help:'Show this command guide', about:'A little about Lucas', projects:'Browse the whole collection', 'projects <category>':`Filter: ${categories.join(', ')}`, 'open <project-id>':'Read a project and find its links',contact:'Email and GitHub',github:'Show the GitHub profile link',clear:'Clear command output',history:'List this session’s commands','ls / cd / cat / pwd':'Browse the categories as folders','neofetch':'Show system info, with Spot','theme [mint|amber|hyper|crt]':'Choose a terminal color','cursor [system|vinyl|glass|spot]':'Change the mouse cursor','website / desktop':'Switch experience',exit:'Return to the welcome screen'};
    function projectList(items) {
      return `<div class="terminal-project-list">${items.map(p=>`<div><button data-command="open ${e(p.id)}">${e(p.id)}</button><small>${e(p.title)} · ${e(p.category)} · ${p.status==='public'?'available online':'not published yet'}</small></div>`).join('')}</div>`;
    }
    function run(raw) {
      const command = raw.trim(); if (!command) return;
      history.add(command); completion=null;feedback.textContent=defaultFeedback;const echo=prompt();
      const {verb,value}=parse(command);
      if (['website','desktop','exit'].includes(verb) && !value) { navigate(verb==='exit'?'choose':verb); return; }
      if (verb==='clear' && !value) { log.replaceChildren(); return; }
      let output;
      const noArguments=['help','about','contact','github','clear','history','website','desktop','exit','pwd','neofetch'];
      if(value&&noArguments.includes(verb))output=`<p>Usage: ${e(verb)} (no arguments).</p>`;
      else switch(verb) {
        case 'help': output=`<dl class="terminal-command-help">${Object.entries(help).map(([key,label])=>`<dt>${e(key)}</dt><dd>${e(label)}</dd>`).join('')}</dl>`; break;
        case 'about': output=about.map(p=>`<p>${e(p)}</p>`).join(''); break;
        case 'projects': output=!value?projectList(projects):categories.includes(value)?projectList(projects.filter(p=>p.category===value)):`<p>Unknown category. Try ${categories.map(e).join(', ')}.</p>`; break;
        case 'ls': {
          const dir=resolvePath(cwd,value,categories);
          output=dir===null?`<p>ls: ${e(value)}: No such folder.</p>`:dir?projectList(projects.filter(p=>p.category===dir)):`<p class="terminal-folders">${categories.map(c=>`<button class="inline-command" data-command="cd ${c}">${c}/</button>`).join(' ')}</p>`; break;
        }
        case 'cd': {
          const dir=resolvePath(cwd,value||'~',categories);
          if(dir===null)output=`<p>cd: ${e(value)}: No such folder. Type <button class="inline-command" data-command="ls">ls</button> to see the folders.</p>`;
          else {cwd=dir;$('.terminal-prompt',root).textContent=prompt();output='';}
          break;
        }
        case 'pwd': output=`<p>/home/guest${cwd?'/'+e(cwd):''}</p>`; break;
        case 'neofetch': {
          const info=['guest@lucas','-----------','OS: a portfolio in your browser','Shell: portfolio-sh',`Projects: ${projects.length} (${projects.filter(p=>p.status==='public').length} online)`,`Theme: ${theme}`,`Cursor: ${document.documentElement.dataset.cursor||'system'}`,'Dog: Spot, black labrador'];
          output=`<pre class="terminal-neofetch">${info.map((line,i)=>`<span class="mint">${e((spot[i]||'').padEnd(18))}</span>${e(line)}`).join('\n')}</pre>`; break;
        }
        case 'sudo': output='<p>guest is not in the sudoers file. This incident will be reported to Spot.</p>'; break;
        case 'cursor':
          if(window.Portfolio.setCursor(value))output=`<p>Cursor set to ${e(value)}.${matchMedia('(pointer: fine)').matches?'':' It shows when you use a mouse or trackpad.'}</p>`;
          else output=`<p>Cursors: ${cursors.map(c=>`<button class="inline-command" data-command="cursor ${c}">${c}</button>`).join(' / ')}.</p>`;
          break;
        case 'cat':
        case 'open': {
          const project=projects.find(p=>p.id===value.split('/').pop());
          output=project?details(project,false):`<p>${value?'Project not found.':'Choose a project ID.'} Type <button class="inline-command" data-command="projects">projects</button> to see the list.</p>`; break;
        }
        case 'contact': output=`<p>Say hello: <a href="mailto:${contact.email}">${contact.email}</a></p><p><a href="${contact.github}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></p>`; break;
        case 'github': output=`<p><a href="${contact.github}" target="_blank" rel="noopener noreferrer">github.com/Gitguy268 ↗</a></p>`; break;
        case 'history': output=history.items.map((c,i)=>`<p>${i+1} &nbsp; ${e(c)}</p>`).join(''); break;
        case 'theme':
          if (themes[value]) { theme=value; root.dataset.theme=value; for(const prop of ['--mint','--terminal-bg','--terminal-ink'])root.style.setProperty(prop,themes[value][prop]||''); output=`<p>Theme set to ${e(value)}.</p>`; }
          else output=`<p>Themes: ${Object.keys(themes).map(t=>`<button class="inline-command" data-command="theme ${t}">${t}</button>`).join(' / ')}.</p>`;
          break;
        default: output=`<p>Command not found: ${e(verb)}. Type <button class="inline-command" data-command="help">help</button> to see what you can do.</p>`;
      }
      const entry=document.createElement('div'); entry.className='terminal-entry';
      entry.innerHTML=`<p class="terminal-echo">${e(echo)} ${e(command)}</p><div class="terminal-output">${output}</div>`;
      log.append(entry); log.scrollTop=log.scrollHeight;
    }
    $('form',root).addEventListener('submit', event=>{event.preventDefault(); const command=input.value; input.value='';run(command);});
    root.addEventListener('click',event=>{const button=event.target.closest('[data-command]');if(button){run(button.dataset.command);input.focus({preventScroll:true});}});
    input.addEventListener('input',()=>{completion=null;feedback.textContent=defaultFeedback;});
    input.addEventListener('keydown',event=>{
      if(event.key==='ArrowUp'){event.preventDefault();input.value=history.previous(input.value);completion=null;}
      if(event.key==='ArrowDown'){event.preventDefault();input.value=history.next();completion=null;}
      if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();log.replaceChildren();}
      if(event.key==='Tab'&&!event.shiftKey&&input.value.trim()){
        const candidates=['help','about','projects','open','contact','github','clear','history','theme','website','desktop','exit','ls','cd','cat','pwd','neofetch','cursor','cd ..',...categories.flatMap(c=>['projects '+c,'cd '+c,'ls '+c]),...projects.flatMap(p=>['open '+p.id,'cat '+p.id]),...Object.keys(themes).map(t=>'theme '+t),...cursors.map(c=>'cursor '+c)];
        if(completion&&input.value===completion.last){
          event.preventDefault();completion.index=(completion.index+1)%completion.matches.length;input.value=completion.matches[completion.index];completion.last=input.value;
        }else{
          const result=complete(input.value,candidates);
          if(result.matches.length){event.preventDefault();input.value=result.value;completion={...result,index:-1,last:result.value};feedback.textContent=result.matches.length===1?defaultFeedback:'Tab again to cycle: '+result.matches.join(', ');}
        }
      }
    });
    return {run,focus:()=>input.focus()};
  };
})();
