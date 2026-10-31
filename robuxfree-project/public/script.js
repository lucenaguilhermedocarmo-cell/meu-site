let currentStep = 1;
const userData = {
    username: '',
    displayName: '',
    userId: '',
    amount: 5000
};
let selectedFile = null;
let previewUrl = '';
let profileSearchTimer = null;
let profileSearchId = 0;
const profileCache = new Map();

function updateProgress(step) {
    document.getElementById('progressBar').style.width = `${(step / 5) * 100}%`;
}

function goToStep(step) {
    if (step >= 2 && step <= 4 && !userData.username) return;
    if (step === 5 && (!userData.username || !selectedFile)) return;

    document.querySelectorAll('.step').forEach((element) => {
        element.classList.remove('active');
        element.classList.add('hidden');
    });

    const target = document.getElementById(`step${step}`);
    if (!target) {
        throw new Error(`Etapa inválida: ${step}`);
    }
    target.classList.remove('hidden');
    target.classList.add('active');
    currentStep = step;
    updateProgress(step);
}

async function searchProfile() {
    const input = document.getElementById('usernameInput').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const resultDiv = document.getElementById('profileResult');
    const profileStatus = document.getElementById('profileStatus');
    const searchButton = document.getElementById('searchButton');

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(input)) {
        profileStatus.textContent = 'O nickname deve ter de 3 a 20 letras, números ou _ (sublinhado).';
        profileStatus.classList.remove('hidden');
        resultDiv.classList.add('hidden');
        return;
    }

    clearTimeout(profileSearchTimer);
    const requestId = ++profileSearchId;
    errorMsg.classList.add('hidden');
    userData.username = input;
    userData.displayName = input;
    userData.userId = '';
    document.getElementById('displayName').textContent = input;
    document.getElementById('userName').textContent = `@${input}`;
    document.getElementById('userId').textContent = 'Não verificado';
    resultDiv.classList.remove('hidden');
    searchButton.disabled = true;
    searchButton.textContent = 'BUSCANDO...';
    profileStatus.textContent = 'Nickname exibido. Tentando confirmar com o Roblox...';
    profileStatus.classList.remove('hidden');

    try {
        const cacheKey = input.toLowerCase();
        let profile = profileCache.get(cacheKey);
        if (!profile) {
            profile = await searchRobloxDirectly(input);
            profileCache.set(cacheKey, profile);
        }
        if (requestId !== profileSearchId) return;

        userData.username = profile.username;
        userData.displayName = profile.displayName;
        userData.userId = profile.userId;
        document.getElementById('displayName').textContent = profile.displayName;
        document.getElementById('userName').textContent = `@${profile.username}`;
        document.getElementById('userId').textContent = profile.userId;
        resultDiv.classList.remove('hidden');
        profileStatus.textContent = 'Perfil encontrado. Confira o nickname antes de confirmar.';
    } catch (error) {
        if (error.name === 'AbortError' || requestId !== profileSearchId) return;
        console.error('Erro ao buscar perfil:', error);
        userData.userId = '';
        document.getElementById('displayName').textContent = input;
        document.getElementById('userName').textContent = `@${input}`;
        document.getElementById('userId').textContent = 'Não verificado';
        resultDiv.classList.remove('hidden');
        profileStatus.textContent = `Não consegui confirmar "${input}" com o Roblox. Você pode continuar com o nickname digitado, mas ele não foi verificado.`;
    } finally {
        if (requestId === profileSearchId) {
            searchButton.disabled = false;
            searchButton.textContent = 'BUSCAR PERFIL';
        }
    }
}

async function searchRobloxDirectly(username) {
    let user;
    try {
        const response = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
        });
        if (response.status === 429) {
            throw new Error('O Roblox está limitando as buscas no momento. Aguarde um minuto e tente novamente.');
        }
        if (!response.ok) {
            throw new Error('O Roblox não conseguiu consultar esse nickname. Tente novamente mais tarde.');
        }
        const searchData = await response.json();
        user = searchData.data?.find((item) =>
            item.requestedUsername.toLowerCase() === username.toLowerCase()
        );
    } catch (error) {
        if (!(error instanceof TypeError)) throw error;

        const searchUrl = new URL('https://users.roblox.com/v1/users/search');
        searchUrl.search = new URLSearchParams({ keyword: username, limit: '10' });
        const response = await fetch(searchUrl, { headers: { Accept: 'application/json' } });
        if (response.status === 429) {
            throw new Error('O Roblox está limitando as buscas no momento. Aguarde um minuto e tente novamente.');
        }
        if (!response.ok) {
            throw new Error('O Roblox não conseguiu consultar esse nickname. Tente novamente mais tarde.');
        }
        const searchData = await response.json();
        user = searchData.data?.find((item) => item.name.toLowerCase() === username.toLowerCase());
    }

    if (!user) {
        throw new Error('Não encontrei um perfil com esse nome exato. Confira o nickname.');
    }

    return {
        username: user.name,
        displayName: user.displayName,
        userId: String(user.id)
    };
}

function handleUsernameInput() {
    clearTimeout(profileSearchTimer);
    profileSearchId += 1;

    userData.username = '';
    userData.displayName = '';
    userData.userId = '';
    document.getElementById('profileResult').classList.add('hidden');
    document.getElementById('errorMsg').classList.add('hidden');
    const input = document.getElementById('usernameInput').value.trim();
    const profileStatus = document.getElementById('profileStatus');
    const searchButton = document.getElementById('searchButton');
    searchButton.disabled = false;
    searchButton.textContent = 'BUSCAR PERFIL';

    if (input.length < 3) {
        profileStatus.textContent = 'Digite pelo menos 3 caracteres para buscar o perfil.';
        return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(input)) {
        profileStatus.textContent = 'Use apenas letras, números ou _ (sublinhado) no nickname.';
        return;
    }

    userData.username = input;
    userData.displayName = input;
    document.getElementById('displayName').textContent = input;
    document.getElementById('userName').textContent = `@${input}`;
    document.getElementById('userId').textContent = 'Não verificado';
    document.getElementById('profileResult').classList.remove('hidden');
    profileStatus.textContent = 'Nickname exibido. Tentando confirmar com o Roblox...';
    profileSearchTimer = setTimeout(() => {
        searchProfile();
    }, 1400);
}

document.getElementById('usernameInput').addEventListener('input', handleUsernameInput);
document.getElementById('usernameInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchProfile();
    }
});

function selectAmount(element, amount) {
    document.querySelectorAll('.card').forEach((card) => card.classList.remove('selected'));
    element.classList.add('selected');
    userData.amount = amount;
}

function clearSelectedFile() {
    selectedFile = null;
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
    document.getElementById('btnSubmitPrint').disabled = true;
    document.getElementById('previewContainer').classList.add('hidden');
    document.getElementById('imagePreview').removeAttribute('src');
    document.getElementById('fileName').textContent = '';
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = '';
    }
}

function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
        clearSelectedFile();
        alert('Formato inválido. Use PNG, JPG ou WEBP.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        clearSelectedFile();
        alert('Arquivo muito grande. O limite é 5 MB.');
        return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('imagePreview').src = previewUrl;
    document.getElementById('previewContainer').classList.remove('hidden');
    document.getElementById('btnSubmitPrint').disabled = false;
    document.getElementById('uploadStatus').classList.add('hidden');
}

async function submitPrint() {
    if (!selectedFile) return;

    const button = document.getElementById('btnSubmitPrint');
    const status = document.getElementById('uploadStatus');
    button.disabled = true;
    button.textContent = 'ENVIANDO...';
    status.textContent = 'Enviando comprovante...';
    status.style.color = '';
    status.classList.remove('hidden');

    const formData = new FormData();
    formData.append('printImage', selectedFile);

    try {
        const response = await fetch('/upload-print', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Falha no envio.');
        }

        status.textContent = 'Recebido. Abrindo resumo...';
        status.style.color = '#4caf50';
        prepareSummary();
        goToStep(5);
    } catch (error) {
        console.error('Erro no envio do comprovante:', error);
        status.textContent = error.message || 'Erro no envio. Tente novamente.';
        status.style.color = '#ff4444';
        button.disabled = false;
        button.textContent = 'TENTAR NOVAMENTE';
    }
}

function prepareSummary() {
    document.getElementById('finalName').textContent = userData.displayName;
    document.getElementById('finalId').textContent = userData.userId || 'Não verificado';
    document.getElementById('finalAmt').textContent = userData.amount.toLocaleString('pt-BR');
}

updateProgress(currentStep);
