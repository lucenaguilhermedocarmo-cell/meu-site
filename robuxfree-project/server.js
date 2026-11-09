const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
const profileCache = new Map();
const profileRequests = new Map();
const PROFILE_CACHE_TTL = 5 * 60 * 1000;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR, {
    dotfiles: 'deny',
    index: false,
    maxAge: '1h'
}));

app.get('/api/roblox/profile', async (req, res, next) => {
    if (req.get('Origin') === 'null') {
        res.set('Access-Control-Allow-Origin', '*');
    }

    const username = typeof req.query.username === 'string' ? req.query.username.trim() : '';
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Digite um nome de usuário Roblox válido (3 a 20 caracteres).' });
    }

    const cacheKey = username.toLowerCase();
    const cached = profileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.profile);
    }

    let profileRequest;
    try {
        profileRequest = profileRequests.get(cacheKey);
        if (!profileRequest) {
            profileRequest = (async () => {
                const searchResponse = await fetch('https://users.roblox.com/v1/usernames/users', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
                });
                if (!searchResponse.ok) {
                    const error = new Error('O Roblox não conseguiu concluir a busca agora.');
                    error.status = searchResponse.status === 429 ? 429 : 502;
                    throw error;
                }

                const searchData = await searchResponse.json();
                const user = searchData.data?.find((item) =>
                    item.requestedUsername.toLowerCase() === username.toLowerCase()
                );
                if (!user) {
                    const error = new Error('Não encontrei um perfil com esse nome exato. Confira o nickname.');
                    error.status = 404;
                    throw error;
                }

                const userResponse = await fetch(`https://users.roblox.com/v1/users/${user.id}`, {
                    headers: { Accept: 'application/json' }
                });
                if (!userResponse.ok) {
                    const error = new Error('Não foi possível carregar os dados desse perfil agora.');
                    error.status = userResponse.status === 429 ? 429 : 502;
                    throw error;
                }

                const userDetails = await userResponse.json();
                if (String(userDetails.id) !== String(user.id) || !userDetails.name || !userDetails.displayName) {
                    const error = new Error('O Roblox retornou dados incompletos para esse perfil.');
                    error.status = 502;
                    throw error;
                }

                return {
                    username: userDetails.name,
                    displayName: userDetails.displayName,
                    userId: String(userDetails.id)
                };
            })();
            profileRequests.set(cacheKey, profileRequest);
        }

        const profile = await profileRequest;
        profileCache.set(cacheKey, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL });
        return res.json(profile);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return next(error);
    } finally {
        if (profileRequests.get(cacheKey) === profileRequest) {
            profileRequests.delete(cacheKey);
        }
    }
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return callback(new Error('Formato inválido. Envie PNG, JPG ou WEBP.'));
        }
        callback(null, true);
    }
});

function getImageExtension(buffer, mimeType) {
    if (
        mimeType === 'image/png' &&
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
        return '.png';
    }

    if (
        mimeType === 'image/jpeg' &&
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
    ) {
        return '.jpg';
    }

    if (
        mimeType === 'image/webp' &&
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return '.webp';
    }

    return null;
}

app.post('/upload-print', upload.single('printImage'), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }

    const extension = getImageExtension(req.file.buffer, req.file.mimetype);
    if (!extension) {
        return res.status(400).json({ error: 'O conteúdo do arquivo não corresponde a uma imagem PNG, JPG ou WEBP.' });
    }

    const filename = `${crypto.randomBytes(16).toString('hex')}${extension}`;
    const destination = path.join(UPLOAD_DIR, filename);

    try {
        await fs.promises.writeFile(destination, req.file.buffer, { flag: 'wx' });
        const imageUrl = `/uploads/${filename}`;
        console.log(`Comprovante recebido: ${imageUrl}`);
        return res.status(201).json({
            message: 'Imagem enviada com sucesso!',
            url: imageUrl
        });
    } catch (error) {
        return next(error);
    }
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'Arquivo muito grande. O limite é 5 MB.'
            : 'Não foi possível processar o arquivo enviado.';
        return res.status(400).json({ error: message });
    }

    if (error.message && error.message.startsWith('Formato inválido.')) {
        return res.status(400).json({ error: error.message });
    }

    console.error('Erro no servidor:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
