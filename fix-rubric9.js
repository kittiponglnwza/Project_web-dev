const fs = require('fs');
let authContent = fs.readFileSync('js/auth.js', 'utf-8');

// 1. Remove the old (Store) block before try
const storeBlockRegex = /\s*\/\/\s*---\s*Rubric 9:\s*Cookie \+ Session \(Store\) ---[\s\S]*?\/\/\s*------------------------------------------/;
authContent = authContent.replace(storeBlockRegex, '');

// 2. Insert the new (Store) block AFTER successful login
const loginSuccessPoint = `const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: emailVal,
                    password: passVal,
                });

                if (error) throw error;`;

const newStoreBlock = `const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: emailVal,
                    password: passVal,
                });

                if (error) throw error;

                // --- Rubric 9: Cookie + Session (Store) ---
                if (document.getElementById("rememberMe")?.checked) {
                    document.cookie = "rememberMe=true; max-age=604800; path=/;";
                    sessionStorage.setItem("savedEmail", emailVal);
                    sessionStorage.setItem("sessionID", "sess_" + new Date().getTime());
                } else {
                    document.cookie = "rememberMe=; max-age=0; path=/;";
                    sessionStorage.removeItem("savedEmail");
                    sessionStorage.removeItem("sessionID");
                }
                // ------------------------------------------`;

authContent = authContent.replace(loginSuccessPoint, newStoreBlock);

// 3. Fix logout function
const oldLogoutBlock = `// --- Rubric 9: Clear Cookie & Session ---
        document.cookie = "rememberMe=; max-age=0; path=/;";
        sessionStorage.clear();
        // ----------------------------------------`;

const newLogoutBlock = `// --- Rubric 9: Clear Cookie & Session ---
        document.cookie = "rememberMe=; max-age=0; path=/;";
        sessionStorage.removeItem("savedEmail");
        sessionStorage.removeItem("sessionID");
        // ----------------------------------------`;

authContent = authContent.replace(oldLogoutBlock, newLogoutBlock);

fs.writeFileSync('js/auth.js', authContent, 'utf-8');
console.log("Updated auth.js precisely according to Rubric 9");
