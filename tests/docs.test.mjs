import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../scripts/docs.js';
const { pageFor, search } = globalThis.DocsModel;

test('a hash opens its page, the page holding its section, or the first page', () => {
  const pages = ['start', 'tabshell', 'qrer'];
  const sections = { 'tabshell-run': 'tabshell', 'qrer-use': 'qrer' };
  assert.equal(pageFor('#qrer', pages, sections), 'qrer');
  assert.equal(pageFor('#tabshell-run', pages, sections), 'tabshell');
  assert.equal(pageFor('', pages, sections), 'start');
  assert.equal(pageFor('#nope', pages, sections), 'start');
  assert.equal(pageFor('#%E0%A4%A', pages, sections), 'start');
  assert.equal(pageFor('#constructor', pages, sections), 'start');
});

test('search needs every word and ranks titles before sections', () => {
  const entries = [
    { page: 'tabshell', id: 'tabshell', title: 'TabShell', section: '', text: 'A real Linux terminal' },
    { page: 'tabshell', id: 'tabshell-run', title: 'TabShell', section: 'Run it', text: '' },
    { page: 'qrer', id: 'qrer-run', title: 'Qrer', section: 'Run it', text: '' },
  ];
  assert.deepEqual(search('tab', entries).map(e => e.id), ['tabshell', 'tabshell-run']);
  assert.deepEqual(search('run', entries).map(e => e.id), ['tabshell-run', 'qrer-run']);
  assert.deepEqual(search('linux terminal', entries).map(e => e.id), ['tabshell']);
  assert.deepEqual(search('qrer run', entries).map(e => e.id), ['qrer-run']);
  assert.deepEqual(search('   ', entries), []);
});
