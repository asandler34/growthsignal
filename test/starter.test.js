'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { starterFix } = require('../src/improve/starter');

const base = {
  site: { finalUrl: 'https://summit.example/' },
  facts: { names: ['Summit </script><script>alert(1)</script>'], phones: ['(303) 555-0142'] },
  crawlers: [{ token: 'OAI-SearchBot', operator: 'OpenAI', purpose: 'search', allowed: false, rule: 'Disallow: /' }, { token: 'GPTBot', operator: 'OpenAI', purpose: 'training', allowed: false, rule: 'Disallow: /' }],
};

test('blocked search crawler gives a robots.txt snippet for search crawlers only', () => {
  const fix = starterFix({ ...base, priorities: [{ rank: 1, checkId: 'ai_search_crawlers', title: 'Crawlers' }] });
  assert.match(fix.content, /User-agent: OAI-SearchBot\nAllow: \//);
  assert.doesNotMatch(fix.content, /GPTBot/);
});

test('structured data draft escapes script breaking text and uses placeholders for unknowns', () => {
  const fix = starterFix({ ...base, priorities: [{ rank: 1, checkId: 'jsonld_business', title: 'Markup' }] }, { category: 'plumber', city: 'Denver' });
  assert.equal(fix.content.match(/<\/script>/g).length, 1, 'only the closing tag of the block itself');
  assert.match(fix.content, /"@type": "Plumber"/);
  assert.match(fix.content, /"addressRegion": "\[State\]"/);
  assert.match(fix.note, /check every value/i);
});

test('HTML drafts escape values and skip priorities without a starter', () => {
  const fix = starterFix({ ...base, priorities: [{ rank: 1, checkId: 'https_home', title: 'HTTPS' }, { rank: 2, checkId: 'title_meta', title: 'Title' }] }, {});
  assert.equal(fix.rank, 2);
  assert.doesNotMatch(fix.content, /<script>/);
  assert.match(fix.content, /&lt;\/script&gt;/);
  assert.equal(starterFix({ ...base, priorities: [{ rank: 1, checkId: 'https_home', title: 'HTTPS' }] }), null);
});
