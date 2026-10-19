/* Pure game rules, shared by the desktop and the regression tests. */
(() => {
  'use strict';
  class Minesweeper {
    constructor(random = Math.random) {
      this.random = random; this.size = 9; this.mineCount = 10; this.reset();
    }
    reset() {
      this.cells = Array.from({length:81},()=>({mine:false,adjacent:0,revealed:false,flagged:false}));
      this.status = 'ready'; this.flags = 0; this.revealed = 0;
    }
    neighbors(index) {
      const x=index%9,y=Math.floor(index/9), result=[];
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
        const nx=x+dx,ny=y+dy;
        if((dx||dy)&&nx>=0&&nx<9&&ny>=0&&ny<9) result.push(ny*9+nx);
      }
      return result;
    }
    plant(safe) {
      const excluded=new Set([safe,...this.neighbors(safe)]);
      const candidates=this.cells.map((_,i)=>i).filter(i=>!excluded.has(i));
      for(let i=candidates.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
      for(const i of candidates.slice(0,this.mineCount)) this.cells[i].mine=true;
      this.cells.forEach((cell,i)=>cell.adjacent=this.neighbors(i).filter(n=>this.cells[n].mine).length);
      this.status='playing';
    }
    flag(index) {
      const cell=this.cells[index];if(!cell||cell.revealed||['won','lost'].includes(this.status))return;
      if(!cell.flagged&&this.flags>=10)return;
      cell.flagged=!cell.flagged;this.flags+=cell.flagged?1:-1;
    }
    reveal(index) {
      const cell=this.cells[index]; if(!cell||cell.revealed||cell.flagged||['won','lost'].includes(this.status))return;
      if(this.status==='ready')this.plant(index);
      if(cell.mine){cell.revealed=true;this.status='lost';return;}
      const stack=[index];
      while(stack.length){const i=stack.pop(),c=this.cells[i];if(c.revealed||c.flagged||c.mine)continue;c.revealed=true;this.revealed++;if(!c.adjacent)stack.push(...this.neighbors(i));}
      if(this.revealed===71)this.status='won';
    }
  }
  globalThis.Minesweeper = Minesweeper;
})();
