const fs = require('fs');

let scriptContent = fs.readFileSync('js/script.js', 'utf-8');

const regex = /const \{ data: tenantsData, error: tenantsError \} = await supabaseClient[\s\S]*?\.from\('occupied_rooms'\)[\s\S]*?\.select\('room_no'\);/;

const replacement = `// --- Rubric 10: Ajax Fetch API -> Database (2nd endpoint) ---
        const fetchUrl2 = supabaseUrl + '/rest/v1/occupied_rooms?select=room_no';
        const response2 = await fetch(fetchUrl2, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': 'Bearer ' + supabaseKey
            }
        });

        if (!response2.ok) {
            throw new Error("HTTP Fetch Error (occupied_rooms): " + response2.status);
        }

        const tenantsData = await response2.json();
        const tenantsError = null;
        // --------------------------------------------------------`;

scriptContent = scriptContent.replace(regex, replacement);

fs.writeFileSync('js/script.js', scriptContent, 'utf-8');
console.log("Updated script.js to fetch occupied_rooms using pure fetch");
