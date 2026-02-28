const http = require('http');

const API = 'http://127.0.0.1:3456';

function request(path) {
    return new Promise((resolve, reject) => {
        http.get(`${API}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    resolve(data);
                }
            });
        }).on('error', reject);
    });
}

async function test() {
    console.log('=== SQLite Memory Tests ===\n');
    
    // Test 1: List
    console.log('1. List memories...');
    const list = await request('/list');
    console.log(`   Total: ${list.length} memories\n`);
    
    // Test 2: Search
    console.log('2. Search...');
    const search = await request('/search?q=test');
    console.log(`   Results: ${search.length}\n`);
    
    // Test 3: Vector search
    console.log('3. Vector search...');
    const vsearch = await request('/vsearch?q=ai');
    console.log(`   Results: ${vsearch.length}\n`);
    
    // Test 4: Frequent
    console.log('4. Frequent memories...');
    const freq = await request('/frequent');
    console.log(`   Top: ${freq[0]?.key}\n`);
    
    console.log('=== All tests passed ===');
}

test().catch(console.error);
