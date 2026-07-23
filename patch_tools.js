const fs = require('fs');
const content = fs.readFileSync('lib/tools.ts', 'utf8');
const newTool = `  {
    id: 'remove-duplicates',
    name: 'Remove Duplicates',
    description: 'Remove duplicate lines from a block of text, keeping only the first occurrence.',
    category: 'Text',
    icon: Layers,
    path: '/tools/remove-duplicates',
  },
`;
if (!content.includes("'remove-duplicates'")) {
  const updated = content.replace('];\n\nexport const categories', newTool + '];\n\nexport const categories');
  fs.writeFileSync('lib/tools.ts', updated);
  console.log('patched');
} else {
  console.log('already patched');
}
