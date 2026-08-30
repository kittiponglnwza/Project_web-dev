const fs = require('fs');

let css = fs.readFileSync('css/style.css', 'utf8');

const scrollbarCSS = `
/* =========================================
   Custom Scrollbar (For responsive tables & containers)
   ========================================= */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}
`;

css = css + scrollbarCSS;
fs.writeFileSync('css/style.css', css, 'utf8');
console.log("Added custom scrollbar CSS");
