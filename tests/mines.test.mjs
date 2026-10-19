import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../scripts/mines.js';
const Game = globalThis.Minesweeper;
function seeded(seed) { return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/2**32; }; }
test('all 81 possible first moves are safe; every board has exactly 10 mines and correct neighbor counts', () => {
  for(let first=0;first<81;first++) {
    const game=new Game(seeded(first+10));game.reveal(first);
    assert.equal(game.cells.filter(c=>c.mine).length,10);
    assert.equal(game.cells[first].revealed,true);assert.equal(game.cells[first].mine,false);
    assert.equal(game.cells[first].adjacent,0);assert.notEqual(game.status,'lost');
    game.cells.forEach((cell,i)=>{
      const x=i%9,y=Math.floor(i/9);
      const expected=game.cells.filter((other,j)=>other.mine&&j!==i&&Math.abs(j%9-x)<=1&&Math.abs(Math.floor(j/9)-y)<=1).length;
      assert.equal(cell.adjacent,expected);
      assert.ok(!(cell.revealed&&cell.mine));
    });
  }
});
test('flags prevent revealing, cap at ten, and can be removed', () => {
  const game=new Game(seeded(7));for(let i=0;i<11;i++)game.flag(i);
  assert.equal(game.flags,10);assert.equal(game.cells[10].flagged,false);
  game.reveal(0);assert.equal(game.status,'ready');
  game.flag(0);game.reveal(0);assert.equal(game.cells[0].revealed,true);
  game.flag(0);assert.equal(game.cells[0].flagged,false);
});
test('revealing all safe squares wins and freezes the board', () => {
  const game=new Game(seeded(1));game.reveal(40);
  game.cells.forEach((cell,i)=>{if(!cell.mine)game.reveal(i);});
  assert.equal(game.revealed,71);assert.equal(game.status,'won');
  const before=JSON.stringify(game.cells);game.flag(0);game.reveal(game.cells.findIndex(c=>c.mine));assert.equal(JSON.stringify(game.cells),before);
});
test('revealing a mine loses; reset creates a fresh ready game', () => {
  const game=new Game(seeded(21));game.reveal(0);game.reveal(game.cells.findIndex(c=>c.mine));
  assert.equal(game.status,'lost');const count=game.revealed;game.reveal(80);assert.equal(game.revealed,count);
  game.reset();assert.equal(game.status,'ready');assert.equal(game.revealed,0);assert.equal(game.flags,0);assert.ok(game.cells.every(c=>!c.mine&&!c.revealed&&!c.flagged));
});
