const board = document.getElementById('board');
const addBtn = document.getElementById('addBtn');
const playBtn = document.getElementById('playBtn');
const randBtn = document.getElementById('randBtn');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');
const textInput = document.getElementById('textInput');
const emojiInput = document.getElementById('emojiInput');
const startDateInput = document.getElementById('startDate');

let notes = [];
let dragging = null;
let offsetX = 0, offsetY = 0;
let playing = false;
let playDay = null;
let startDate = null;

// Load from storage
chrome.storage.local.get(['notes', 'startDate'], (result)=>{
    if(result.notes) notes = result.notes;
    if(result.startDate){
        startDate = new Date(result.startDate);
        startDateInput.value = result.startDate;
    }
    renderNotes();
});

// Save notes and startDate
function saveNotes(){
    chrome.storage.local.set({
        notes,
        startDate: startDate ? startDate.toISOString().slice(0,10) : null
    });
}

// Render notes
function renderNotes(){
    board.innerHTML = '';
    notes.forEach((n, idx)=>{
        const div = document.createElement('div');
        div.className = 'note';
        div.style.left = n.x + 'px';
        div.style.top = n.y + 'px';
        div.textContent = `${n.emoji||'🙂'} Day ${n.day}: ${n.text}`;

        // Highlight play day
        if(playDay !== null && n.day === playDay){
            div.classList.add('highlight');
            div.style.zIndex = 999;
        } else {
            div.style.zIndex = 1;
        }

        // Highlighted toggle
        if(n.highlighted) div.classList.add('highlighted');

        // Delete button
        const delBtn = document.createElement('span');
        delBtn.textContent = '×';
        delBtn.style.position = 'absolute';
        delBtn.style.top = '2px';
        delBtn.style.right = '4px';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontWeight = 'bold';
        delBtn.style.color = '#900';
        delBtn.onclick = (e)=>{
            e.stopPropagation();
            notes.splice(idx,1);
            saveNotes();
            renderNotes();
        };
        div.appendChild(delBtn);

        // Toggle highlighted on double-click
        div.ondblclick = (e)=>{
            e.stopPropagation();
            n.highlighted = !n.highlighted;
            saveNotes();
            renderNotes();
        }

        // Drag
        div.onpointerdown = (e)=>{
            dragging = div;
            offsetX = e.clientX - n.x - board.getBoundingClientRect().left;
            offsetY = e.clientY - n.y - board.getBoundingClientRect().top;
        };

        board.appendChild(div);
    });
}

// Add note
addBtn.onclick = ()=>{
    const text = textInput.value.trim();
    const emoji = emojiInput.value.trim() || '🙂';
    if(!text) return;

    if(!startDateInput.value) return alert("Please set a start date first.");
    if(!startDate) {
        startDate = new Date(startDateInput.value);
        saveNotes();
    }

    const today = new Date();
    let dayNumber = Math.floor((today - startDate)/(1000*60*60*24)) + 1;
    if(dayNumber < 1) dayNumber = 1;

    const x = Math.random() * (board.clientWidth - 120);
    const y = Math.random() * (board.clientHeight - 60);

    notes.push({text, emoji, x, y, day: dayNumber, highlighted:false});
    saveNotes();
    renderNotes();
    textInput.value = '';
    emojiInput.value = '';
}

// Dragging
board.onpointermove = (e)=>{
    if(!dragging) return;
    const idx = Array.from(board.children).indexOf(dragging);
    const rect = board.getBoundingClientRect();

    let nx = e.clientX - rect.left - offsetX;
    let ny = e.clientY - rect.top - offsetY;

    nx = Math.max(0, Math.min(rect.width - dragging.offsetWidth, nx));
    ny = Math.max(0, Math.min(rect.height - dragging.offsetHeight, ny));

    dragging.style.left = nx + 'px';
    dragging.style.top = ny + 'px';
    notes[idx].x = nx;
    notes[idx].y = ny;
    saveNotes();
};
board.onpointerup = ()=>{ dragging = null; }

// Randomise
randBtn.onclick = ()=>{
    const rect = board.getBoundingClientRect();
    notes.forEach((n,i)=>{
        const nx = Math.random() * (rect.width - 120);
        const ny = Math.random() * (rect.height - 60);
        n.x = nx; n.y = ny;
        board.children[i].style.left = nx + 'px';
        board.children[i].style.top = ny + 'px';
    });
    saveNotes();
    renderNotes();
}

// Play animation per day
async function play(){
    if(playing || !startDate) return;
    playing = true;

    const days = [...new Set(notes.map(n=>n.day))].sort((a,b)=>a-b);
    for(const day of days){
        playDay = day;
        renderNotes();
        await new Promise(r => setTimeout(r, 650));
    }

    playDay = null;
    renderNotes();
    playing = false;
}
playBtn.onclick = play;

// Reset progress
resetBtn.onclick = ()=>{
    if(!confirm("Reset all progress?")) return;
    notes = [];
    startDate = null;
    startDateInput.value = '';
    saveNotes();
    renderNotes();
}

// Export PNG
exportBtn.onclick = async ()=>{
    const canvas = await html2canvas(board, {backgroundColor:null, scale:2});
    const data = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = data;
    a.download = `progressboard-${new Date().toISOString().slice(0,10)}.png`;
    a.click();
}
