const fs = require('fs');

let css = fs.readFileSync('css/style.css', 'utf8');

css = css.replace(/\.sidebar-links \{/, '.sidebar-links {\n    flex: 1;\n    justify-content: flex-start;');

fs.writeFileSync('css/style.css', css, 'utf8');
console.log("Added flex: 1 to sidebar-links");
