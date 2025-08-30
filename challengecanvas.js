const board = document.getElementById('board');
const addBtn = document.getElementById('addBtn');
const playBtn = document.getElementById('playBtn');
const randBtn = document.getElementById('randBtn');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');
const textInput = document.getElementById('textInput');
const emojiInput = document.getElementById('emojiInput');
const challengeSelect = document.getElementById('challengeSelect');
const challengeToggles = document.getElementById('challengeToggles');
const newChallengeInput = document.getElementById('newChallengeInput');
const addChallengeBtn = document.getElementById('addChallengeBtn');

let notes = [];
let challenges = []; // {name,color,startDate}
let visibleChallenges = {};
let dragging = null;
let offsetX = 0, offsetY = 0;
let playing = false;
let playDay = null;

// Default colors
const colors = ['#ffeb3b','#4caf50','#2196f3','#ff5722','#9c27b0','#00bcd4','#ff9800'];

// Load from storage
chrome.storage.local.get(['notes','challenges'],(result)=>{
    if(result.notes) notes=result.notes;
    if(result.challenges) challenges=result.challenges;
    challenges.forEach(ch=>{ if(!(ch.name in visibleChallenges)) visibleChallenges[ch.name]=true; });
    rebuildChallengeList();
    renderNotes();
});

// Save all
function saveAll(){
    chrome.storage.local.set({notes,challenges});
}

// Rebuild challenge selector and toggles
function rebuildChallengeList(){
    challengeSelect.innerHTML='';
    challengeToggles.innerHTML='';
    challenges.forEach((ch,i)=>{
        // dropdown option
        const opt = document.createElement('option');
        opt.value = ch.name;
        opt.textContent = ch.name;
        challengeSelect.appendChild(opt);

        // container row
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '6px';

        // toggle
        const cb = document.createElement('input');
        cb.type='checkbox';
        cb.checked = visibleChallenges[ch.name];
        cb.onchange = ()=>{
            visibleChallenges[ch.name] = cb.checked;
            renderNotes();
        };

        // label
        const label = document.createElement('span');
        label.textContent = ch.name;
        label.style.color = ch.color;
        label.style.flex = '1'; // take space between checkbox & delete
        label.style.marginLeft = '6px';

        // delete button
        const delBtn = document.createElement('button');
        delBtn.textContent='×';
        delBtn.style.background='none';
        delBtn.style.border='none';
        delBtn.style.color='#f55';
        delBtn.style.fontSize='16px';
        delBtn.style.cursor='pointer';
        delBtn.onclick = ()=>{
            if(!confirm(`Delete challenge "${ch.name}"? All its notes will be removed.`)) return;
            notes = notes.filter(n=>n.challenge!==ch.name);
            challenges = challenges.filter(c=>c.name!==ch.name);
            delete visibleChallenges[ch.name];
            saveAll();
            rebuildChallengeList();
            renderNotes();
        };

        // build row
        row.appendChild(cb);
        row.appendChild(label);
        row.appendChild(delBtn);

        challengeToggles.appendChild(row);
    });
}

// Helper: choose black or white text based on background
function getContrastYIQ(hexcolor){
    hexcolor = hexcolor.replace("#", "");
    let r = parseInt(hexcolor.substr(0,2),16);
    let g = parseInt(hexcolor.substr(2,2),16);
    let b = parseInt(hexcolor.substr(4,2),16);
    let yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? '#000' : '#fff'; // black for light bg, white for dark bg
}

// Render notes
function renderNotes(){
    board.innerHTML='';
    notes.forEach((n,idx)=>{
        if(!visibleChallenges[n.challenge]) return;
        const ch = challenges.find(c=>c.name===n.challenge);
        if(!ch) return;

        const div = document.createElement('div');
        div.className='note';
        div.style.left=n.x+'px';
        div.style.top=n.y+'px';
        div.style.background=ch.color;
        div.style.color=getContrastYIQ(ch.color); // <-- FIX HERE
        div.textContent = `${n.emoji||'🙂'} Day ${n.day}: ${n.text}`;

        if(playDay!==null && n.day===playDay){
            div.classList.add('highlight');
            div.style.zIndex=999;
        } else div.style.zIndex=1;

        if(n.highlighted) div.classList.add('highlighted');

        // Delete note
        const delBtn=document.createElement('span');
        delBtn.textContent='×';
        delBtn.style.position='absolute';
        delBtn.style.top='2px';
        delBtn.style.right='4px';
        delBtn.style.cursor='pointer';
        delBtn.style.color='#900';
        delBtn.onclick=(e)=>{
            e.stopPropagation();
            notes.splice(idx,1);
            saveAll();
            renderNotes();
            rebuildChallengeList();
        };
        div.appendChild(delBtn);

        // Double-click to highlight
        div.ondblclick = (e)=>{
            e.stopPropagation();
            n.highlighted = !n.highlighted;
            saveAll();
            renderNotes();
        };

        // Drag
        div.onpointerdown=(e)=>{
            dragging=div;
            offsetX=e.clientX-n.x-board.getBoundingClientRect().left;
            offsetY=e.clientY-n.y-board.getBoundingClientRect().top;
        };

        board.appendChild(div);
    });
}

// Add note
addBtn.onclick = ()=>{
    const text=textInput.value.trim();
    const emoji=emojiInput.value.trim()||'🙂';
    const chName = challengeSelect.value;
    if(!text) return;
    const ch = challenges.find(c=>c.name===chName);
    if(!ch || !ch.startDate) return alert('Set a start date for this challenge first.');
    const start = new Date(ch.startDate);
    const today = new Date();
    let dayNumber = Math.floor((today-start)/(1000*60*60*24))+1;
    if(dayNumber<1) dayNumber=1;

    const boardRect = board.getBoundingClientRect();
    const controlsRect = document.getElementById("controls").getBoundingClientRect();

    const availableWidth = boardRect.width - controlsRect.width - 20; // leave space for menu
    const availableHeight = boardRect.height - 60;

    const x = Math.random() * Math.max(availableWidth - 140, 50); // note width = 140
    const y = Math.random() * Math.max(availableHeight, 50);

    notes.push({text,emoji,x,y,day:dayNumber,highlighted:false,challenge:chName});
    saveAll();
    renderNotes();
}

// Add challenge
addChallengeBtn.onclick = ()=>{
    const name = newChallengeInput.value.trim();
    if(!name) return;
    if(challenges.find(c=>c.name===name)) return alert('Challenge already exists.');
    const color = colors[challenges.length % colors.length];
    const startDate = prompt(`Enter start date for "${name}" (YYYY-MM-DD)`,'');
    if(!startDate) return alert('Start date required.');
    challenges.push({name,color,startDate});
    visibleChallenges[name]=true;
    saveAll();
    rebuildChallengeList();
    newChallengeInput.value='';
}

// Dragging
board.onpointermove=(e)=>{
    if(!dragging) return;
    const idx = Array.from(board.children).indexOf(dragging);
    const rect = board.getBoundingClientRect();
    let nx=e.clientX-rect.left-offsetX;
    let ny=e.clientY-rect.top-offsetY;
    nx=Math.max(0,Math.min(rect.width-dragging.offsetWidth,nx));
    ny=Math.max(0,Math.min(rect.height-dragging.offsetHeight,ny));
    dragging.style.left=nx+'px';
    dragging.style.top=ny+'px';
    notes[idx].x=nx; notes[idx].y=ny;
    saveAll();
};
board.onpointerup=()=>{ dragging=null; };

// Randomise
randBtn.onclick = ()=>{
    const boardRect = board.getBoundingClientRect();
    const controlsRect = document.getElementById("controls").getBoundingClientRect();

    const availableWidth = boardRect.width - controlsRect.width - 20;
    const availableHeight = boardRect.height - 60;

    notes.forEach(n=>{
        n.x=Math.random() * Math.max(availableWidth - 140, 50);
        n.y=Math.random() * Math.max(availableHeight, 50);
    });
    saveAll();
    renderNotes();
}

// Play
async function play(){
    if(playing) return;
    playing=true;
    const days=[...new Set(notes.map(n=>n.day))].sort((a,b)=>a-b);
    for(const day of days){ playDay=day; renderNotes(); await new Promise(r=>setTimeout(r,650)); }
    playDay=null;
    renderNotes();
    playing=false;
}
playBtn.onclick=play;

// Reset
resetBtn.onclick = ()=>{
    if(!confirm('Reset all progress?')) return;
    notes=[]; challenges=[]; visibleChallenges={};
    saveAll();
    rebuildChallengeList();
    renderNotes();
}

// Export
exportBtn.onclick=async ()=>{
    const canvas = await html2canvas(board,{backgroundColor:null,scale:2});
    const data = canvas.toDataURL('image/png');
    const a=document.createElement('a');
    a.href=data;
    a.download=`progressboard-${new Date().toISOString().slice(0,10)}.png`;
    a.click();
}
