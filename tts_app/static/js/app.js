document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const textInput = document.getElementById('text-input');
    const charCounter = document.getElementById('char-counter');
    const wordCounter = document.getElementById('word-counter');
    const toggleClean = document.getElementById('toggle-clean');
    const btnClean = document.getElementById('btn-clean');
    const btnPaste = document.getElementById('btn-paste');
    const btnClear = document.getElementById('btn-clear');
    const presetBtns = document.querySelectorAll('.btn-preset');

    // Robust Clean Script Function: Strips headers (###), timestamps (0:00–0:04, 0:04-0:08, [0:15]), bold formatting, and bullet markers
    function cleanScriptText(text) {
        if (!text) return '';
        let cleaned = text;

        // 1. Remove entire lines starting with markdown headers (#, ##, ###) or timestamp title lines like "### 0:00–0:04 — Open Login"
        cleaned = cleaned.replace(/^#+.*$/gm, '');
        cleaned = cleaned.replace(/^\d{1,2}:\d{2}\s*[\-–—]\s*\d{1,2}:\d{2}.*$/gm, '');

        // 2. Remove standalone inline timestamps like 0:00–0:04, 0:04-0:08, [0:15]
        cleaned = cleaned.replace(/\b\d{1,2}:\d{2}\s*[\-–—]\s*\d{1,2}:\d{2}\b/g, '');
        cleaned = cleaned.replace(/\[?\b\d{1,2}:\d{2}\b\]?/g, '');

        // 3. Remove bold (**word**) and italics (*word*) formatting
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
        cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
        cleaned = cleaned.replace(/__(.*?)__/g, '$1');
        cleaned = cleaned.replace(/_(.*?)_/g, '$1');

        // 4. Remove leading dashes/bullet symbols at line start
        cleaned = cleaned.replace(/^[–—\-\*•]+\s*/gm, '');

        // 5. Reduce multiple blank lines into clean paragraph spacing
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

        return cleaned;
    }

    // Auto-Clean helper
    function applyAutoClean() {
        if (toggleClean && toggleClean.checked) {
            const raw = textInput.value;
            const cleaned = cleanScriptText(raw);
            if (cleaned !== raw) {
                textInput.value = cleaned;
            }
        }
    }

    if (btnClean) {
        btnClean.addEventListener('click', () => {
            const raw = textInput.value;
            if (!raw.trim()) {
                showToast('Textarea is empty!', 'error');
                return;
            }
            textInput.value = cleanScriptText(raw);
            updateCounters();
            showToast('Cleaned headers & timestamps!');
        });
    }

    if (toggleClean) {
        toggleClean.addEventListener('change', () => {
            if (toggleClean.checked) {
                applyAutoClean();
                updateCounters();
                showToast('Auto-Clean Headers ON');
            }
        });
    }


    
    const ttsForm = document.getElementById('tts-form');
    const languageSelect = document.getElementById('language-select');
    const speedToggle = document.getElementById('speed-toggle');
    const speedLabel = document.getElementById('speed-label');
    const btnGenerate = document.getElementById('btn-generate');
    const btnContent = btnGenerate.querySelector('.btn-content');
    const btnLoader = btnGenerate.querySelector('.btn-loader');
    
    // Player Elements
    const playerCard = document.getElementById('player-card');
    const playerLangBadge = document.getElementById('player-lang-badge');
    const playerTextPreview = document.getElementById('player-text-preview');
    const mainAudio = document.getElementById('main-audio');
    const waveform = document.getElementById('waveform');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');
    const progressWrapper = document.getElementById('progress-wrapper');
    const progressBar = document.getElementById('progress-bar');
    const btnMute = document.getElementById('btn-mute');
    const volumeSlider = document.getElementById('volume-slider');
    const playerFileSize = document.getElementById('player-file-size');
    const btnDownload = document.getElementById('btn-download');
    
    // History Elements
    const historyList = document.getElementById('history-list');
    const historyCount = document.getElementById('history-count');
    
    // Toast Element
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Helper: Get CSRF Token
    function getCsrfToken() {
        const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfInput) return csrfInput.value;
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Helper: Show Toast Notification
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        const icon = toast.querySelector('.toast-icon');
        if (type === 'error') {
            icon.className = 'toast-icon fa-solid fa-circle-exclamation';
            icon.style.color = '#ef4444';
            toast.style.borderColor = '#ef4444';
        } else {
            icon.className = 'toast-icon fa-solid fa-circle-check';
            icon.style.color = '#10b981';
            toast.style.borderColor = '#6366f1';
        }
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3500);
    }

    // Helper: Format Time (seconds to mm:ss)
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    const durationCounter = document.getElementById('duration-counter');
    const voiceSelect = document.getElementById('voice-select');
    const rateSelect = document.getElementById('rate-select');
    const pitchSelect = document.getElementById('pitch-select');

    const rateFactors = {
        '+0%': 1.00,
        '+5%': 1.05,
        '+10%': 1.10,
        '+15%': 1.15,
        '+20%': 1.20,
        '+25%': 1.25,
        '+35%': 1.35,
        '+50%': 1.50,
        '+75%': 1.75,
        '+100%': 2.00,
        '-5%': 0.95,
        '-10%': 0.90,
        '-15%': 0.85,
        '-20%': 0.80,
        '-25%': 0.75,
        '-35%': 0.65,
        '-50%': 0.50
    };


    // 1. Text & Duration Counters
    function updateCounters() {
        const text = textInput.value;
        const chars = text.length;
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        
        charCounter.textContent = `${chars} / 5000 chars`;
        wordCounter.textContent = `${words} words`;

        // Calculate estimated voiceover duration (average 150 words/min)
        const selectedRate = rateSelect ? rateSelect.value : '+0%';
        const factor = rateFactors[selectedRate] || 1.0;
        const totalEstSeconds = Math.round((words / 150) * 60 / factor);
        
        const estMins = Math.floor(totalEstSeconds / 60);
        const estSecs = totalEstSeconds % 60;
        
        if (durationCounter) {
            durationCounter.innerHTML = `<i class="fa-solid fa-clock"></i> Est: ${estMins}m ${estSecs < 10 ? '0' : ''}${estSecs}s`;
        }
    }
    textInput.addEventListener('input', updateCounters);
    if (rateSelect) {
        rateSelect.addEventListener('change', updateCounters);
    }

    // 2. Preset Pill Buttons
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            textInput.value = btn.dataset.text;
            applyAutoClean();
            updateCounters();
            textInput.focus();
        });
    });

    // 3. Paste & Clear
    btnPaste.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            textInput.value += text;
            applyAutoClean();
            updateCounters();
            showToast('Text pasted from clipboard!');
        } catch (err) {
            showToast('Failed to paste from clipboard. Please paste manually.', 'error');
        }
    });


    btnClear.addEventListener('click', () => {
        textInput.value = '';
        updateCounters();
        textInput.focus();
    });

    // 5. Generate Audio Form Submit
    ttsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = textInput.value.trim();
        if (!text) {
            showToast('Please enter some text before generating audio!', 'error');
            return;
        }

        // Loading State & Chunked Loader Modal
        btnContent.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        btnGenerate.disabled = true;
        startChunkedLoader();

        try {
            const response = await fetch('/api/generate/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    text: text,
                    voice: voiceSelect ? voiceSelect.value : 'en-US-JennyNeural',
                    pitch: pitchSelect ? pitchSelect.value : '+0Hz',
                    rate: rateSelect ? rateSelect.value : '+0%'
                })
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                stopChunkedLoader();
                showToast('MP3 generated successfully!');
                saveToLocalStorage(result.data);
                loadPlayer(result.data);
                renderLocalStorageHistory();
            } else {
                stopChunkedLoader();
                showToast(result.message || 'Failed to generate audio.', 'error');
            }
        } catch (err) {
            stopChunkedLoader();
            showToast('Network error occurred. Please try again.', 'error');
        } finally {
            btnContent.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            btnGenerate.disabled = false;
        }
    });

    // Chunked Loader Modal Logic
    const loaderModal = document.getElementById('loader-modal');
    const loaderStatusText = document.getElementById('loader-status-text');
    const loaderPercent = document.getElementById('loader-percent');

    const statusMessages = [
        "Some patience — it's worth it...",
        "Connecting to Neural Speech Engine...",
        "Synthesizing voice inflections & tone...",
        "Fitting speech duration & pace...",
        "Finalizing crisp MP3 download file..."
    ];

    let chunkTimer = null;
    let messageTimer = null;

    function startChunkedLoader() {
        if (!loaderModal) return;
        loaderModal.classList.remove('hidden');
        
        // Reset chunks
        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById(`chunk-${i}`);
            if (el) el.classList.remove('active');
        }

        let currentChunk = 1;
        let messageIndex = 0;

        const firstChunk = document.getElementById('chunk-1');
        if (firstChunk) firstChunk.classList.add('active');
        if (loaderPercent) loaderPercent.textContent = '20% Completed';
        if (loaderStatusText) loaderStatusText.textContent = statusMessages[0];

        chunkTimer = setInterval(() => {
            currentChunk++;
            if (currentChunk <= 5) {
                const chunkEl = document.getElementById(`chunk-${currentChunk}`);
                if (chunkEl) chunkEl.classList.add('active');
                if (loaderPercent) loaderPercent.textContent = `${currentChunk * 20}% Completed`;
            } else {
                clearInterval(chunkTimer);
            }
        }, 800);

        messageTimer = setInterval(() => {
            messageIndex = (messageIndex + 1) % statusMessages.length;
            if (loaderStatusText) loaderStatusText.textContent = statusMessages[messageIndex];
        }, 1400);
    }

    function stopChunkedLoader() {
        if (chunkTimer) clearInterval(chunkTimer);
        if (messageTimer) clearInterval(messageTimer);

        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById(`chunk-${i}`);
            if (el) el.classList.add('active');
        }
        if (loaderPercent) loaderPercent.textContent = '100% Completed';
        if (loaderStatusText) loaderStatusText.textContent = 'MP3 Generation Complete!';

        setTimeout(() => {
            if (loaderModal) loaderModal.classList.add('hidden');
        }, 400);
    }


    // 6. Load Audio Player with fresh data
    function loadPlayer(data) {
        playerCard.classList.remove('hidden');
        playerLangBadge.textContent = `${data.language_name}${data.slow ? ' (Slow)' : ''}`;
        playerTextPreview.textContent = `"${data.text}"`;
        playerFileSize.textContent = data.file_size;
        
        const dlUrl = data.download_url || `/api/download/${data.id}/`;
        btnDownload.href = dlUrl;
        btnDownload.setAttribute('download', `speech_${data.id}.mp3`);

        mainAudio.src = data.audio_url;
        mainAudio.load();
        
        // Auto play audio
        mainAudio.play().then(() => {
            updatePlayPauseIcon(true);
        }).catch(() => {
            updatePlayPauseIcon(false);
        });

        playerCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 7. Audio Controls & Events
    function updatePlayPauseIcon(isPlaying) {
        if (isPlaying) {
            btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
            waveform.classList.add('playing');
        } else {
            btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
            waveform.classList.remove('playing');
        }
    }

    btnPlayPause.addEventListener('click', () => {
        if (mainAudio.paused) {
            mainAudio.play();
            updatePlayPauseIcon(true);
        } else {
            mainAudio.pause();
            updatePlayPauseIcon(false);
        }
    });

    mainAudio.addEventListener('timeupdate', () => {
        const current = mainAudio.currentTime;
        const duration = mainAudio.duration || 0;
        currentTimeEl.textContent = formatTime(current);
        totalDurationEl.textContent = formatTime(duration);

        if (duration > 0) {
            const percent = (current / duration) * 100;
            progressBar.style.width = `${percent}%`;
        }
    });

    mainAudio.addEventListener('ended', () => {
        updatePlayPauseIcon(false);
        progressBar.style.width = '0%';
        currentTimeEl.textContent = '0:00';
    });

    // Scrubber click to seek
    progressWrapper.addEventListener('click', (e) => {
        const rect = progressWrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const duration = mainAudio.duration;
        if (duration > 0) {
            mainAudio.currentTime = (clickX / width) * duration;
        }
    });

    // Volume Controls
    volumeSlider.addEventListener('input', (e) => {
        mainAudio.volume = e.target.value;
        if (mainAudio.volume === 0) {
            btnMute.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        } else {
            btnMute.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        }
    });

    btnMute.addEventListener('click', () => {
        if (mainAudio.volume > 0) {
            mainAudio.dataset.lastVolume = mainAudio.volume;
            mainAudio.volume = 0;
            volumeSlider.value = 0;
            btnMute.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        } else {
            const lastVol = mainAudio.dataset.lastVolume || 1;
            mainAudio.volume = lastVol;
            volumeSlider.value = lastVol;
            btnMute.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        }
    });

    // 8. LocalStorage Private History Manager
    const STORAGE_KEY = 'voicecraft_user_history_v2';

    function getLocalStorageHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveToLocalStorage(record) {
        try {
            const history = getLocalStorageHistory();
            const updated = [record, ...history.filter(item => String(item.id) !== String(record.id))].slice(0, 30);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('LocalStorage write error:', e);
        }
    }

    function removeFromLocalStorage(id) {
        try {
            const history = getLocalStorageHistory();
            const updated = history.filter(item => String(item.id) !== String(id));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('LocalStorage delete error:', e);
        }
    }

    function renderLocalStorageHistory() {
        const items = getLocalStorageHistory();
        historyCount.textContent = `${items.length} records`;
        if (items.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    <p>No audio files generated yet. Convert text above to save to your browser's private history!</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = items.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-info">
                    <div class="history-meta">
                        <span class="badge badge-accent">${item.language_name}</span>
                        <span>• ${item.created_at}</span>
                        <span>• ${item.file_size}</span>
                    </div>
                    <p class="history-text">"${item.text}"</p>
                </div>
                <div class="history-actions">
                    <button type="button" class="btn-history-play" title="Play Audio" data-url="${item.audio_url}" data-text="${escapeHtml(item.text)}" data-lang="${item.language_name}" data-size="${item.file_size}" data-id="${item.id}">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <a href="${item.download_url || item.audio_url}" download="speech_${item.id}.mp3" class="btn-secondary" style="padding: 6px 12px; font-size: 12px;" title="Download MP3">
                        <i class="fa-solid fa-download"></i> Download
                    </a>
                    <button type="button" class="btn-history-delete" title="Delete record" data-id="${item.id}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Attach event handlers for history items
        document.querySelectorAll('.btn-history-play').forEach(btn => {
            btn.addEventListener('click', () => {
                loadPlayer({
                    id: btn.dataset.id,
                    text: btn.dataset.text,
                    language_name: btn.dataset.lang,
                    audio_url: btn.dataset.url,
                    download_url: btn.dataset.url,
                    file_size: btn.dataset.size,
                    slow: false
                });
            });
        });

        document.querySelectorAll('.btn-history-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                if (confirm('Are you sure you want to delete this recording from your private history?')) {
                    removeFromLocalStorage(id);
                    renderLocalStorageHistory();
                    showToast('Record deleted from browser history!');
                }
            });
        });
    }

    function escapeHtml(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // 9. Mobile Navigation Drawer & FAQ Accordion
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Auto-close menu when tapping a link on mobile
        document.querySelectorAll('.nav-link, .btn-nav-cta').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }

    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            item.classList.toggle('active');
        });
    });

    // Initial LocalStorage history load
    renderLocalStorageHistory();
});



