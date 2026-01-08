const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME Types for Static Serving
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // CORS Headers (Useful for local debugging if ports differ)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // CSP: Allow everything (unsafe-eval is critical for Matter.js/html2canvas)
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: *;");

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // --- API ENDPOINTS ---

    /**
     * POST /save-config
     * Saves the current window.cardConfig JSON to js/templateConfig.js
     */
    if (req.method === 'POST' && req.url === '/save-config') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                // Determine format
                const json = JSON.parse(body);

                // We write it back as a JavaScript file assignment
                const fileContent = `\nconst config = ${JSON.stringify(json, null, 4)};\n\n// Browser Compatibility\nif (typeof window !== 'undefined') {\n    window.cardConfig = config;\n}\n\n// Node Compatibility\nif (typeof module !== 'undefined') {\n    module.exports = config;\n}\n`;

                const filePath = path.join(__dirname, 'js', 'templateConfig.js');

                fs.writeFile(filePath, fileContent, (err) => {
                    if (err) {
                        console.error('Save Error:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Write failed' }));
                    } else {
                        console.log('Config saved to js/templateConfig.js');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    }
                });
            } catch (e) {
                console.error('Parse Error:', e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
        return;
    }

    /**
     * POST /upload-asset
     * Saves Base64 image data to local assets/uploads/ foler
     */
    if (req.method === 'POST' && req.url === '/upload-asset') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body); // { filename, data (base64), folder }
                const folderName = data.folder || 'uploads';
                const uploadDir = path.join(__dirname, 'assets', folderName);

                // Ensure dir exists
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Decode Base64 
                // Format: "data:image/png;base64,....."
                // Fix: Use [\s\S]+ instead of .+ to handle potential newlines in base64
                const matches = data.data.match(/^data:([A-Za-z-+\/]+);base64,([\s\S]+)$/);
                if (!matches || matches.length !== 3) {
                    throw new Error('Invalid base64 string');
                }
                const buffer = Buffer.from(matches[2], 'base64');

                // Generate hash from content for deduplication
                const crypto = require('crypto');
                const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 12);

                // Get file extension from original filename
                const ext = path.extname(data.filename) || '.png';
                let baseName = path.basename(data.filename, ext).replace(/[^a-z0-9]/gi, '_');

                // FIX: Remove existing hash suffix if present (prevent file_hash_hash.png)
                // Looks for _ followed by 12 hex chars at the end
                baseName = baseName.replace(/_[a-f0-9]{12}$/i, '');

                // Use hash-based filename: baseName_hash.ext
                const safeName = `${baseName}_${hash}${ext}`;
                const filePath = path.join(uploadDir, safeName);
                const publicUrl = `assets/${folderName}/${safeName}`;

                // Check if file with same hash already exists
                if (fs.existsSync(filePath)) {
                    console.log('File already exists (dedup):', safeName);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, url: publicUrl, deduplicated: true }));
                    return;
                }

                fs.writeFile(filePath, buffer, (err) => {
                    if (err) {
                        console.error('Upload Write Error:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'File write failed' }));
                    } else {
                        console.log('File uploaded:', safeName);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, url: publicUrl }));
                    }
                });

            } catch (e) {
                console.error('Upload Error:', e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // --- STATIC FILES ---
    // 1. Remove query string immediately
    const cleanUrl = req.url.split('?')[0];

    let filePath = '.' + cleanUrl;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Sanitize path to prevent traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');

    const extname = String(path.extname(safePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // fsPath is simply the safe filePath now
    const fsPath = filePath;

    fs.readFile(fsPath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                // 404
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

});

server.listen(PORT, () => {
    console.log(`\n---------------------------------------------------`);
    console.log(` SERVER RUNNING: http://localhost:${PORT}/`);
    console.log(` API ENABLED:    /save-config, /upload-asset`);
    console.log(`---------------------------------------------------\n`);
});
