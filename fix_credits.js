const fs = require('fs');
const file = 'd:/Code/fmp/fmp-client/app/dashboard/clips/v2/[videoId]/page.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add the dynamicCreditsCost variable right below the state hooks if it doesn't exist
if (!content.includes('const dynamicCreditsCost')) {
  content = content.replace(
    /const \[trimRange, setTrimRange\] = useState\(\[0, 60\]\);/,
    'const [trimRange, setTrimRange] = useState([0, 60]);\n\tconst dynamicCreditsCost = Math.ceil((trimRange[1] - trimRange[0]) / 60) || 1;'
  );
}

// Replace references to `creditsCost` with `dynamicCreditsCost` in the render block and optimistic deduction
// Wait, `creditsCost` state still exists and might be used to track original cost, but let's just replace all instances 
// where it's used in arithmetic.

content = content.replace(/creditsCost \+ \(preferences/g, 'dynamicCreditsCost + (preferences');
content = content.replace(/creditsCost !== null/g, 'true'); // dynamicCreditsCost is always a number since it's derived
content = content.replace(/userBalance - creditsCost/g, 'userBalance - dynamicCreditsCost');

// Also update the display of `creditsCost` in the span
content = content.replace(
  /\{creditsCost !== null \? creditsCost \+ \(preferences\.prioritize \? 2 : 0\) : "-"\}/g,
  '{dynamicCreditsCost + (preferences.prioritize ? 2 : 0)}'
);

fs.writeFileSync(file, content);
console.log('done_dynamic_credits');
