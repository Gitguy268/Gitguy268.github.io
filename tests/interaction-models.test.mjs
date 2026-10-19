import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../scripts/terminal.js';
import '../scripts/desktop.js';
const { CommandHistory, parse, complete, resolvePath } = globalThis.TerminalModel;

test('history preserves a half-written command while browsing older entries', () => {
  const history=new CommandHistory();
  history.add('projects');history.add('open htmltopng');
  assert.equal(history.previous('theme am'),'open htmltopng');
  assert.equal(history.previous('open htmltopng'),'projects');
  assert.equal(history.previous('projects'),'projects');
  assert.equal(history.next(),'open htmltopng');
  assert.equal(history.next(),'theme am');
  assert.equal(history.next(),'theme am');
});
test('empty history leaves the current draft alone', () => {
  const history=new CommandHistory();
  assert.equal(history.previous('about'),'about');
  assert.equal(history.next(),'about');
});
test('command parsing is case insensitive and preserves invalid input as plain data', () => {
  assert.deepEqual(parse('  PROJECTS   Tools '),{verb:'projects',value:'tools'});
  assert.deepEqual(parse('OPEN <script>alert(1)</script>'),{verb:'open',value:'<script>alert(1)</script>'});
});
test('completion handles unique, ambiguous, duplicate and absent matches', () => {
  const commands=['projects','projects players','projects tools','open htmltopng','open htmltopng'];
  assert.deepEqual(complete('OPEN H',commands),{matches:['open htmltopng'],value:'open htmltopng'});
  assert.equal(complete('proj',commands).value,'projects');
  assert.equal(complete('proj',commands).matches.length,3);
  assert.deepEqual(complete('nope',commands),{matches:[],value:'nope'});
});
test('window bounds remain visible after dragging, resizing and viewport changes', () => {
  for(const bounds of [{width:1440,height:856},{width:768,height:500},{width:360,height:316},{width:240,height:180}]) {
    for(const box of [{x:-400,y:-50,w:650,h:460},{x:1400,y:1000,w:900,h:1000},{x:80,y:50,w:10,h:10}]) {
      const rect=globalThis.WindowGeometry(box,bounds);
      assert.ok(rect.x>=0&&rect.y>=0);
      assert.ok(rect.x+rect.w<=bounds.width&&rect.y+rect.h<=bounds.height);
      assert.ok(rect.w>0&&rect.h>0);
      assert.deepEqual(globalThis.WindowGeometry(box,bounds,true),{x:0,y:0,w:bounds.width,h:bounds.height});
    }
  }
});
test('cd and ls resolve category folders and refuse anything else', () => {
  const dirs=['players','spot','tools'];
  assert.equal(resolvePath('','players',dirs),'players');
  assert.equal(resolvePath('players','',dirs),'players');
  assert.equal(resolvePath('players','..',dirs),'');
  assert.equal(resolvePath('players','../spot',dirs),'spot');
  assert.equal(resolvePath('players','~',dirs),'');
  assert.equal(resolvePath('','~/tools/',dirs),'tools');
  assert.equal(resolvePath('','..',dirs),'');
  assert.equal(resolvePath('players','tools',dirs),null);
  assert.equal(resolvePath('','nope',dirs),null);
  assert.equal(resolvePath('','players/ipod',dirs),null);
});
