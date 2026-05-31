const video = document.getElementById('video');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const playerSection = document.getElementById('player-section');

// ── Video loading ──

function loadVideo(file) {
    if (!file || !file.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.classList.add('visible');
    dropZone.classList.add('hidden');
}

fileInput.addEventListener('change', (e) => {
    loadVideo(e.target.files[0]);
    e.target.value = '';
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    loadVideo(e.dataTransfer.files[0]);
});

dropZone.addEventListener('click', () => fileInput.click());

// ── Segments state ──

let segments = loadSegments();
let editingIndex = null;

function loadSegments() {
    try {
        return JSON.parse(localStorage.getItem('segments')) || [];
    } catch {
        return [];
    }
}

function saveSegments() {
    localStorage.setItem('segments', JSON.stringify(segments));
}

// ── Time helpers ──

function parseTime(str) {
    const s = str.trim();
    if (s.includes(':')) {
        const [m, sec] = s.split(':').map(Number);
        if (isNaN(m) || isNaN(sec) || m < 0 || sec < 0) return null;
        return m * 60 + sec;
    }
    const n = parseFloat(s);
    return isNaN(n) || n < 0 ? null : n;
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Hot cue bar ──

function closeEdit() {
    if (editingIndex === null) return;
    if (!segments[editingIndex].key) {
        segments.splice(editingIndex, 1);
    }
    editingIndex = null;
    render();
}

function render() {
    const bar = document.getElementById('hot-cue-bar');
    bar.innerHTML = '';

    segments.forEach((seg, i) => {
        const card = document.createElement('div');
        card.className = 'cue-card' + (editingIndex === i ? ' editing' : '');

        if (editingIndex === i) {
            card.innerHTML = `
                <input class="cue-key-input" maxlength="1" value="${seg.key}" placeholder="A" title="Trigger key (single character)">
                <input class="cue-time-input" value="${formatTime(seg.startTime)}" placeholder="0:00" title="Start time (m:ss or seconds)">
                <input class="cue-label-input" value="${seg.label}" placeholder="Label">
                <button class="cue-delete-btn" title="Delete">&#x2715;</button>
            `;

            const keyInput   = card.querySelector('.cue-key-input');
            const timeInput  = card.querySelector('.cue-time-input');
            const labelInput = card.querySelector('.cue-label-input');
            const deleteBtn  = card.querySelector('.cue-delete-btn');

            keyInput.addEventListener('input', () => {
                const val = keyInput.value.slice(-1).toLowerCase();
                keyInput.value = val;
                const duplicate = segments.some((s, idx) => idx !== i && s.key === val);
                if (val.length === 1 && !duplicate) {
                    keyInput.classList.remove('invalid');
                    segments[i].key = val;
                    saveSegments();
                } else {
                    keyInput.classList.add('invalid');
                }
            });

            timeInput.addEventListener('change', () => {
                const t = parseTime(timeInput.value);
                if (t !== null) {
                    timeInput.classList.remove('invalid');
                    segments[i].startTime = t;
                    timeInput.value = formatTime(t);
                    saveSegments();
                } else {
                    timeInput.classList.add('invalid');
                }
            });

            labelInput.addEventListener('input', () => {
                segments[i].label = labelInput.value;
                saveSegments();
            });

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                segments.splice(i, 1);
                editingIndex = null;
                saveSegments();
                render();
            });

            // Escape closes; stopPropagation keeps keydown from the video handler
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeEdit();
                e.stopPropagation();
            });

            // Prevent clicks inside the card from bubbling to the document close handler
            card.addEventListener('click', (e) => e.stopPropagation());

            setTimeout(() => labelInput.focus(), 0);
        } else {
            card.dataset.index = i;
            card.innerHTML = `
                <span class="cue-key">${seg.key.toUpperCase()}</span>
                <span class="cue-time">${formatTime(seg.startTime)}</span>
                <span class="cue-label">${seg.label || '&#8212;'}</span>
            `;

            card.addEventListener('click', (e) => {
                e.stopPropagation();
                if (editingIndex !== null && !segments[editingIndex].key) {
                    segments.splice(editingIndex, 1);
                }
                editingIndex = i;
                render();
            });
        }

        bar.appendChild(card);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'cue-add';
    addBtn.textContent = '+';
    addBtn.title = 'Add segment';
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeEdit();
        segments.push({ key: '', startTime: 0, label: '' });
        editingIndex = segments.length - 1;
        render();
    });
    bar.appendChild(addBtn);
}

// Click outside the bar closes any open edit
document.addEventListener('click', closeEdit);

render();

// ── Trigger ──

const sessionLog = [];

function triggerHotCue(idx) {
    const seg = segments[idx];
    if (!seg) return;
    video.currentTime = seg.startTime;
    video.play();

    const card = document.querySelector(`.cue-card[data-index="${idx}"]`);
    if (card) {
        card.classList.add('active');
        setTimeout(() => card.classList.remove('active'), 300);
    }

    sessionLog.push({
        key: seg.key,
        label: seg.label,
        startTime: seg.startTime,
        triggeredAt: Date.now()
    });
    renderLog();
}

// Keyboard
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const idx = segments.findIndex(s => s.key === e.key.toLowerCase());
    if (idx !== -1) triggerHotCue(idx);
});

// ── Session log ──

function renderLog() {
    document.getElementById('log-count').textContent = sessionLog.length;
    const entries = document.getElementById('log-entries');
    entries.innerHTML = '';

    for (let i = sessionLog.length - 1; i >= 0; i--) {
        const e = sessionLog[i];
        const row = document.createElement('div');
        row.className = 'log-row';
        row.innerHTML = `
            <span class="log-n">${i + 1}</span>
            <span class="log-key">${e.key.toUpperCase()}</span>
            <span class="log-label">${e.label || '&#8212;'}</span>
            <span class="log-start">${formatTime(e.startTime)}</span>
            <span class="log-at">${new Date(e.triggeredAt).toLocaleTimeString()}</span>
        `;
        entries.appendChild(row);
    }

    if (sessionLog.length === 1) {
        document.getElementById('session-log').open = true;
    }
}

document.getElementById('export-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const blob = new Blob([JSON.stringify(sessionLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('clear-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    sessionLog.length = 0;
    renderLog();
});
