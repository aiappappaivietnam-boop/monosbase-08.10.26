const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const directory of ['assets', 'public/assets']) {
  fs.copyFileSync(path.join(root, 'src/components/product-concept-library.js'), path.join(root, directory, 'product-concept-library.js'));
}
