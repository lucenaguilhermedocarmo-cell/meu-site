let currentStep = 1;
const userData = {
    username: '',
    displayName: '',
    amount: 5000
};
let selectedFile = null;
let previewUrl = '';

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

function searchProfile() {
    const input = document.getElementById('usernameInput').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const resultDiv = document.getElementById('profileResult');
    const profileStatus = document.getElementById('profileStatus');

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(input)) {
        profileStatus.textContent = 'O nickname deve ter de 3 a 20 letras, números ou _ (sublinhado).';
        profileStatus.classList.remove('hidden');
        resultDiv.classList.add('hidden');
        userData.username = '';
        userData.displayName = '';
        return;
    }

    errorMsg.classList.add('hidden');
    userData.username = input;
    userData.displayName = input;
    document.getElementById('displayName').textContent = input;
    document.getElementById('userName').textContent = `@${input}`;
    resultDiv.classList.remove('hidden');
    profileStatus.textContent = 'Nickname selecionado. Confira antes de continuar.';
}

function handleUsernameInput() {
    userData.username = '';
    userData.displayName = '';
    document.getElementById('profileResult').classList.add('hidden');
    document.getElementById('errorMsg').classList.add('hidden');
    const input = document.getElementById('usernameInput').value.trim();
    const profileStatus = document.getElementById('profileStatus');
    const searchButton = document.getElementById('searchButton');
    searchButton.disabled = false;
    searchButton.textContent = 'CONTINUAR COM NICK';

    if (input.length < 3) {
        profileStatus.textContent = 'Digite pelo menos 3 caracteres para continuar.';
        return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(input)) {
        profileStatus.textContent = 'Use apenas letras, números ou _ (sublinhado) no nickname.';
        return;
    }

    profileStatus.textContent = 'Clique em CONTINUAR COM NICK para prosseguir.';
}

function changeProfile() {
    userData.username = '';
    userData.displayName = '';
    document.getElementById('usernameInput').value = '';
    document.getElementById('profileResult').classList.add('hidden');
    document.getElementById('errorMsg').classList.add('hidden');
    document.getElementById('profileStatus').textContent = 'Digite o nickname para continuar.';
    document.getElementById('usernameInput').focus();
}

function continueFromTutorial() {
    const searchSection = document.getElementById('profileSearchSection');
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    searchSection.scrollIntoView({ behavior, block: 'center' });
    document.getElementById('usernameInput').focus({ preventScroll: true });
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
    document.getElementById('finalAmt').textContent = userData.amount.toLocaleString('pt-BR');
}

updateProgress(currentStep);

const tutorialVideo = document.getElementById('tutorialVideo');
const tutorialStatus = document.getElementById('tutorialStatus');
tutorialVideo.addEventListener('loadedmetadata', () => {
    tutorialStatus.classList.add('hidden');
});
tutorialVideo.addEventListener('error', () => {
    tutorialStatus.textContent = 'Não foi possível carregar o vídeo. Confirme se public\\media\\tutorial.mp4 está disponível.';
    tutorialStatus.classList.remove('hidden');
});

function initializeGoldSnow() {
    const canvas = document.getElementById('snowCanvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let flakes = [];
    let clickParticles = [];
    let animationFrame = 0;

    function resizeCanvas() {
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        const count = width < 600 ? 24 : 42;
        flakes = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 1.2 + Math.random() * 3.2,
            speed: 0.25 + Math.random() * 0.85,
            drift: (Math.random() - 0.5) * 0.55,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.012,
            flake: Math.random() > 0.42
        }));
        drawFrame(false);
    }

    function drawFlake(flake, advance) {
        if (advance) {
            flake.y += flake.speed;
            flake.x += flake.drift + Math.sin(flake.angle) * 0.25;
            flake.angle += flake.spin;
            if (flake.y > height + 8) {
                flake.y = -8;
                flake.x = Math.random() * width;
            }
            if (flake.x < -8) flake.x = width + 8;
            if (flake.x > width + 8) flake.x = -8;
        }

        context.save();
        context.translate(flake.x, flake.y);
        context.rotate(flake.angle);
        context.globalAlpha = 0.38 + Math.abs(Math.sin(flake.angle * 1.7)) * 0.48;
        context.strokeStyle = '#ffd75a';
        context.fillStyle = '#ffe78a';
        context.shadowColor = '#ffc400';
        context.shadowBlur = flake.size * 3;
        if (flake.flake) {
            context.lineWidth = Math.max(0.55, flake.size * 0.22);
            context.beginPath();
            for (let arm = 0; arm < 3; arm += 1) {
                const angle = arm * Math.PI / 3;
                context.moveTo(-flake.size, 0);
                context.lineTo(flake.size, 0);
                context.moveTo(-flake.size * 0.45, 0);
                context.lineTo(-flake.size * 0.7, -flake.size * 0.3);
                context.moveTo(-flake.size * 0.45, 0);
                context.lineTo(-flake.size * 0.7, flake.size * 0.3);
                context.rotate(angle);
            }
            context.stroke();
        } else {
            context.beginPath();
            context.arc(0, 0, flake.size * 0.55, 0, Math.PI * 2);
            context.fill();
        }
        context.restore();
    }

    function drawFrame(advance) {
        context.clearRect(0, 0, width, height);
        flakes.forEach((flake) => drawFlake(flake, advance));
        if (advance) {
            clickParticles = clickParticles.filter((particle) => particle.life > 0);
            clickParticles.forEach((particle) => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life -= 1;
                context.globalAlpha = particle.life / particle.maxLife;
                context.fillStyle = '#ffd700';
                context.shadowColor = '#ffd700';
                context.shadowBlur = 8;
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                context.fill();
            });
            context.globalAlpha = 1;
        }
    }

    function animate() {
        if (motionPreference.matches || document.hidden) return;
        drawFrame(true);
        animationFrame = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
        window.cancelAnimationFrame(animationFrame);
        if (motionPreference.matches) {
            drawFrame(false);
        } else if (!document.hidden) {
            animate();
        }
    }

    window.addEventListener('resize', resizeCanvas, { passive: true });
    document.addEventListener('visibilitychange', startAnimation);
    if (motionPreference.addEventListener) {
        motionPreference.addEventListener('change', startAnimation);
    } else {
        motionPreference.addListener(startAnimation);
    }
    document.addEventListener('click', (event) => {
        if (motionPreference.matches || !event.target.closest('button:not(:disabled)')) return;
        for (let index = 0; index < 9; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.6 + Math.random() * 2;
            clickParticles.push({
                x: event.clientX,
                y: event.clientY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1 + Math.random() * 2,
                life: 24,
                maxLife: 24
            });
        }
    });

    resizeCanvas();
    startAnimation();
}

initializeGoldSnow();
