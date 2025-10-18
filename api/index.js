const express = require('express');
const QRCode = require('qrcode');
const { makeWASocket, useMultiFileAuthState, Browsers, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session storage
const sessions = new Map();

// Utility function (gen-id.js replacement)
function makeid(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Mega upload function (mega.js replacement)
async function upload(fileStream, filename) {
    // Simplified file storage - saving locally for Vercel
    const filePath = `./sessions/${filename}`;
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    return new Promise((resolve) => {
        // For Vercel, we'll return a local file path
        const publicUrl = `/sessions/${filename}`;
        resolve(publicUrl);
    });
}

// Main HTML (main.html replacement)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TRI CONTROLS BOT</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
        }
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        .logo {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            color: white;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: bold;
            margin: 0 auto 20px;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #7f8c8d;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .button-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .button {
            display: block;
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            text-decoration: none;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 16px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(52, 152, 219, 0.3);
        }
        .footer {
            margin-top: 30px;
            color: #7f8c8d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">TRI</div>
        <h1>TRI CONTROLS BOT</h1>
        <p class="subtitle">Advanced WhatsApp Session Generator</p>
        
        <div class="button-container">
            <a href="/qr" class="button">QR CODE</a>
            <a href="/pair" class="button">PAIRING CODE</a>
            <a href="https://github.com/trimstrdevstudio/tri-controls-bot" class="button" target="_blank">FORK ON GITHUB</a>
            <a href="https://wa.me/263780166288" class="button" target="_blank">SUPPORT</a>
        </div>

        <div class="footer">
            &copy; 2024 TRI MSTR DEV STUDIO | Developed by GHOSTTRI
        </div>
    </div>
</body>
</html>
    `);
});

// QR Page (qr.html replacement)
app.get('/qr', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR SCANNER - TRI CONTROLS</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
        }
        body {
            background: linear-gradient(-45deg, #4a90e2, #3ac569, #9b59b6, #e74c3c);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 100%;
            text-align: center;
            backdrop-filter: blur(10px);
        }
        .logo {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            margin: 0 auto 15px;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .qr-container {
            margin: 20px 0;
            padding: 20px;
            background: white;
            border-radius: 10px;
            border: 2px dashed #bdc3c7;
        }
        #qrImage {
            max-width: 100%;
            height: auto;
        }
        .status {
            margin: 15px 0;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
        }
        .status.connecting {
            background: #fff3cd;
            color: #856404;
        }
        .status.success {
            background: #d1ecf1;
            color: #0c5460;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
        }
        .btn {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 5px;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        progress {
            width: 100%;
            height: 20px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">TRI</div>
        <h1>TRI QR SCANNER</h1>
        <p>Scan QR Code with WhatsApp</p>
        
        <div class="qr-container">
            <img id="qrImage" src="" alt="QR Code">
        </div>
        
        <div id="status" class="status connecting">Generating QR Code...</div>
        
        <progress value="0" max="30" id="progressBar"></progress>
        
        <div>
            <button class="btn" onclick="generateQR()" id="generateBtn">
                <span id="btnText">Generate QR</span>
            </button>
            <a href="/" class="btn">Home</a>
            <a href="/pair" class="btn">Pairing Code</a>
        </div>
    </div>

    <script>
        let timeleft = 30;
        let downloadTimer = setInterval(function() {
            if (timeleft <= 0) {
                clearInterval(downloadTimer);
                document.getElementById("progressBar").style.display = "none";
                document.getElementById("status").className = "status error";
                document.getElementById("status").innerHTML = "QR Expired! Please regenerate";
            }
            document.getElementById("progressBar").value = 30 - timeleft;
            timeleft -= 1;
        }, 1000);

        async function generateQR() {
            const generateBtn = document.getElementById('generateBtn');
            const btnText = document.getElementById('btnText');
            const status = document.getElementById('status');
            const qrImage = document.getElementById('qrImage');
            const progressBar = document.getElementById('progressBar');

            generateBtn.disabled = true;
            btnText.innerHTML = '<div class="loading"></div> Generating...';
            status.className = 'status connecting';
            status.innerHTML = 'Generating QR Code...';
            progressBar.style.display = 'block';
            progressBar.value = 0;
            timeleft = 30;

            try {
                const response = await fetch('/api/qr');
                if (response.ok) {
                    const blob = await response.blob();
                    qrImage.src = URL.createObjectURL(blob);
                    status.className = 'status success';
                    status.innerHTML = 'QR Code generated! Scan with WhatsApp.';
                    
                    // Reset timer
                    clearInterval(downloadTimer);
                    timeleft = 30;
                    downloadTimer = setInterval(function() {
                        if (timeleft <= 0) {
                            clearInterval(downloadTimer);
                            progressBar.style.display = "none";
                            status.className = "status error";
                            status.innerHTML = "QR Expired! Please regenerate";
                        }
                        progressBar.value = 30 - timeleft;
                        timeleft -= 1;
                    }, 1000);
                } else {
                    throw new Error('Failed to generate QR code');
                }
            } catch (error) {
                status.className = 'status error';
                status.innerHTML = 'Error: ' + error.message;
            } finally {
                generateBtn.disabled = false;
                btnText.innerHTML = 'Generate QR';
            }
        }

        // Auto generate on page load
        window.onload = generateQR;
    </script>
</body>
</html>
    `);
});

// Pair Page (pair.html replacement)
app.get('/pair', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PAIRING CODE - TRI CONTROLS</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
        }
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 100%;
        }
        .logo {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            margin: 0 auto 15px;
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 20px;
        }
        .input-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #2c3e50;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }
        input:focus {
            outline: none;
            border-color: #3498db;
        }
        .btn {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
            margin: 10px 0;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .btn:disabled {
            background: #bdc3c7;
            cursor: not-allowed;
            transform: none;
        }
        .status {
            margin: 15px 0;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
        }
        .status.connecting {
            background: #fff3cd;
            color: #856404;
        }
        .status.success {
            background: #d1ecf1;
            color: #0c5460;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
        }
        .session-code {
            background: #2c3e50;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            word-break: break-all;
            font-family: monospace;
            text-align: center;
            cursor: pointer;
        }
        .nav-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        .nav-buttons a {
            flex: 1;
            text-align: center;
            background: #95a5a6;
            color: white;
            padding: 10px;
            border-radius: 8px;
            text-decoration: none;
        }
        .nav-buttons a:hover {
            background: #7f8c8d;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">TRI</div>
        <h1>PAIRING CODE</h1>
        
        <div class="input-group">
            <label>Enter your number with country code:</label>
            <input type="text" id="phoneNumber" placeholder="263780166288">
        </div>
        
        <button class="btn" onclick="generatePairCode()" id="generateBtn">
            <span id="btnText">Generate Pairing Code</span>
        </button>
        
        <div id="status" class="status"></div>
        
        <div id="sessionCode" class="session-code" style="display: none;" onclick="copyCode()"></div>
        
        <div class="nav-buttons">
            <a href="/">Home</a>
            <a href="/qr">QR Code</a>
        </div>
    </div>

    <script>
        async function generatePairCode() {
            const generateBtn = document.getElementById('generateBtn');
            const btnText = document.getElementById('btnText');
            const status = document.getElementById('status');
            const sessionCode = document.getElementById('sessionCode');
            const phoneNumber = document.getElementById('phoneNumber').value;

            if (!phoneNumber) {
                status.className = 'status error';
                status.innerHTML = 'Please enter your phone number';
                return;
            }

            generateBtn.disabled = true;
            btnText.innerHTML = '<div class="loading"></div> Generating...';
            status.className = 'status connecting';
            status.innerHTML = 'Generating pairing code...';
            sessionCode.style.display = 'none';

            try {
                const response = await fetch('/api/pair', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ number: phoneNumber })
                });

                const data = await response.json();

                if (data.code) {
                    status.className = 'status success';
                    status.innerHTML = 'Pairing code generated successfully!';
                    sessionCode.innerHTML = 'CODE: ' + data.code;
                    sessionCode.style.display = 'block';
                } else {
                    throw new Error(data.error || 'Failed to generate pairing code');
                }
            } catch (error) {
                status.className = 'status error';
                status.innerHTML = 'Error: ' + error.message;
            } finally {
                generateBtn.disabled = false;
                btnText.innerHTML = 'Generate Pairing Code';
            }
        }

        function copyCode() {
            const codeElement = document.getElementById('sessionCode');
            const code = codeElement.innerText.replace('CODE: ', '');
            
            navigator.clipboard.writeText(code).then(() => {
                const originalText = codeElement.innerText;
                codeElement.innerText = 'COPIED!';
                codeElement.style.background = '#27ae60';
                
                setTimeout(() => {
                    codeElement.innerText = originalText;
                    codeElement.style.background = '#2c3e50';
                }, 2000);
            });
        }
    </script>
</body>
</html>
    `);
});

// API Routes
app.get('/api/qr', async (req, res) => {
    const sessionId = makeid();
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Safari')
        });

        sessions.set(sessionId, { sock, saveCreds });

        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('connection.update', async (update) => {
            const { connection, qr } = update;
            
            if (connection === 'open') {
                console.log('✅ TRI BOT Connected: ' + sessionId);
                
                try {
                    await sock.sendMessage(sock.user.id, {
                        text: `🚀 TRI CONTROLS BOT Connected!\\n\\nSession ID: ${sessionId}\\n\\nPowered by TRI MSTR DEV STUDIO\\nDeveloper: GHOSTTRI`
                    });
                } catch (e) {
                    console.log('Message error:', e);
                }

                setTimeout(() => {
                    try {
                        sock.ws.close();
                        sessions.delete(sessionId);
                        if (fs.existsSync(`./sessions/${sessionId}`)) {
                            fs.rmSync(`./sessions/${sessionId}`, { recursive: true });
                        }
                    } catch (e) {
                        console.log('Cleanup error:', e);
                    }
                }, 5000);
            }

            if (connection === 'close') {
                sessions.delete(sessionId);
                if (fs.existsSync(`./sessions/${sessionId}`)) {
                    fs.rmSync(`./sessions/${sessionId}`, { recursive: true });
                }
            }
        });

        // Generate QR code
        const qrPromise = new Promise((resolve) => {
            sock.ev.on('connection.update', async (update) => {
                if (update.qr) {
                    try {
                        const qrBuffer = await QRCode.toBuffer(update.qr);
                        resolve(qrBuffer);
                    } catch (error) {
                        resolve(null);
                    }
                }
            });
        });

        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(null), 30000);
        });

        const qrBuffer = await Promise.race([qrPromise, timeoutPromise]);

        if (qrBuffer) {
            res.setHeader('Content-Type', 'image/png');
            res.send(qrBuffer);
        } else {
            res.status(408).send('QR generation timeout');
        }

    } catch (error) {
        console.log('QR API error:', error);
        res.status(500).send('Internal server error');
    }
});

app.post('/api/pair', async (req, res) => {
    const { number } = req.body;
    const sessionId = makeid();

    if (!number) {
        return res.status(400).json({ error: 'Phone number required' });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);
        
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: state.keys,
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Safari')
        });

        sessions.set(sessionId, { sock, saveCreds });

        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            await delay(1500);
            const cleanNumber = number.replace(/[^0-9]/g, '');
            
            try {
                const code = await sock.requestPairingCode(cleanNumber);
                
                sock.ev.on('connection.update', async (update) => {
                    if (update.connection === 'open') {
                        console.log('✅ TRI BOT Paired: ' + sessionId);
                        
                        try {
                            await sock.sendMessage(sock.user.id, {
                                text: `🔐 TRI CONTROLS BOT Paired Successfully!\\n\\nNumber: ${number}\\nSession: ${sessionId}\\n\\nBy GHOSTTRI - TRI MSTR DEV STUDIO`
                            });
                        } catch (e) {
                            console.log('Message error:', e);
                        }

                        setTimeout(() => {
                            try {
                                sock.ws.close();
                                sessions.delete(sessionId);
                                if (fs.existsSync(`./sessions/${sessionId}`)) {
                                    fs.rmSync(`./sessions/${sessionId}`, { recursive: true });
                                }
                            } catch (e) {
                                console.log('Cleanup error:', e);
                            }
                        }, 5000);
                    }
                });

                return res.json({ code });
            } catch (pairError) {
                return res.status(500).json({ error: 'Pairing failed' });
            }
        }

    } catch (error) {
        console.log('Pair API error:', error);
        sessions.delete(sessionId);
        if (fs.existsSync(`./sessions/${sessionId}`)) {
            fs.rmSync(`./sessions/${sessionId}`, { recursive: true });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'TRI CONTROLS BOT',
        developer: 'GHOSTTRI',
        company: 'TRI MSTR DEV STUDIO'
    });
});

// Ensure sessions directory exists
if (!fs.existsSync('./sessions')) {
    fs.mkdirSync('./sessions', { recursive: true });
}

// Start server
app.listen(PORT, () => {
    console.log(\`
🚀 TRI CONTROLS BOT - Session Generator
📍 Port: \${PORT}
👨‍💻 Developer: GHOSTTRI
🏢 Company: TRI MSTR DEV STUDIO
📞 Support: 263780166288
✅ Server running: http://localhost:\${PORT}
    \`);
});

module.exports = app;
