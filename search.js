import { readFileSync } from 'fs';
const content = readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('newRequestsCount') || l.includes('lastSeenRequests') || l.includes('contentRequests')) {
    console.log((i+1) + ': ' + l.trim().substring(0, 140));
  }
});
