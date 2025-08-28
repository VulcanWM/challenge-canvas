const board = document.getElementById('board');
const addBtn = document.getElementById('addBtn');
const playBtn = document.getElementById('playBtn');
const randBtn = document.getElementById('randBtn');
const exportBtn = document.getElementById('exportBtn');
const textInput = document.getElementById('textInput');
const emojiInput = document.getElementById('emojiInput');

let notes = [];
let dragging = null;
let offsetX=0, offsetY=0;
let playIndex = -1;
let playing = false;

// Load from chrome.storage
chrome.storage.local.get(['notes'], (result)=>{
    if(result.notes) notes=result.notes;
    renderNotes();
});

// Save notes
function saveNotes(){
    chrome.storage.local.set({notes});
}

// Render all notes
function renderNotes(){
    board.innerHTML='';
    notes.forEach((n, idx)=>{
        const div = document.createElement('div');
        div.className='note';
        div.style.left = n.x+'px';
        div.style.top = n.y+'px';
        div.textContent = `${n.emoji||'🙂'} Day ${idx+1}: ${n.text}`;

        // highlight + bring to front if playing
        if(idx === playIndex){
            div.classList.add('highlight');
            div.style.zIndex = 999;   // temporarily on top
        } else {
            div.style.zIndex = 1;     // normal stacking
        }

        // Drag
        div.onpointerdown = (e)=>{
            dragging=div;
            offsetX = e.clientX - n.x - board.getBoundingClientRect().left;
            offsetY = e.clientY - n.y - board.getBoundingClientRect().top;
        };
        board.appendChild(div);
    });
}


// Add note
addBtn.onclick = ()=>{
    const text=textInput.value.trim();
    const emoji=emojiInput.value.trim()||'🙂';
    if(!text) return;
    const x = Math.random()*380;
    const y = Math.random()*380;
    notes.push({text, emoji, x, y});
    saveNotes();
    renderNotes();
    textInput.value=''; emojiInput.value='';
}

// Dragging events
board.onpointermove = (e)=>{
    if(!dragging) return;
    const idx = Array.from(board.children).indexOf(dragging);
    const rect = board.getBoundingClientRect();

    let nx = e.clientX - rect.left - offsetX;
    let ny = e.clientY - rect.top - offsetY;

    // dynamically constrain inside board
    nx = Math.max(0, Math.min(rect.width - dragging.offsetWidth, nx));
    ny = Math.max(0, Math.min(rect.height - dragging.offsetHeight, ny));

    dragging.style.left = nx + 'px';
    dragging.style.top = ny + 'px';
    notes[idx].x = nx;
    notes[idx].y = ny;
    saveNotes();
};

board.onpointerup = ()=>{ dragging=null; }

// Randomise
randBtn.onclick = ()=>{
    const rect = board.getBoundingClientRect();

    notes.forEach((n,i)=>{
        const nx = Math.random() * (rect.width - 120);   // note width ~120
        const ny = Math.random() * (rect.height - 60);   // note height ~60
        n.x = nx;
        n.y = ny;
        board.children[i].style.left = nx + 'px';
        board.children[i].style.top = ny + 'px';
    });

    saveNotes();
    renderNotes();
};


// Play animation
async function play(){
    if(playing) return;
    playing = true;

    for(let i = 0; i < notes.length; i++){
        playIndex = i;
        renderNotes();                  // now brings current note to front
        await new Promise(r => setTimeout(r, 650));
    }

    playIndex = -1;
    renderNotes();
    playing = false;
}
playBtn.onclick = play;

// Export PNG
exportBtn.onclick = async ()=>{
    const canvas = await html2canvas(board, {backgroundColor:null, scale:2});
    const data = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href=data;
    a.download=`progressboard-${new Date().toISOString().slice(0,10)}.png`;
    a.click();
}
