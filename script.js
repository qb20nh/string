const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let tool = 'string';
const pins = [];
const segments = [];
let drawing = null; // {start:Pin, endPos:{x,y}, center:Pin|null}
let draggingPin = null;
let dragOffset = {x:0,y:0};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}
window.addEventListener('resize', resize);
resize();

// Tool buttons
for (const btn of document.querySelectorAll('#controls button')) {
    btn.addEventListener('click', () => {
        tool = btn.dataset.tool;
    });
}
window.addEventListener('keydown', (e) => {
    if (e.key === '1') tool = 'string';
    if (e.key === '2') tool = 'pin';
    if (e.key === '3') tool = 'delete';
});

function createPin(x, y) {
    pins.push({x, y, r: 10});
    draw();
}

function hitPin(pos) {
    return pins.find(p => Math.hypot(p.x - pos.x, p.y - pos.y) <= p.r);
}

function computeArcParams(start, center, end) {
    const radius = Math.hypot(start.x - center.x, start.y - center.y);
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
    const cross = (start.x - center.x) * (end.y - center.y) -
                  (start.y - center.y) * (end.x - center.x);
    const clockwise = cross < 0;
    return { radius, startAngle, endAngle, clockwise };
}

function drawSegments() {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    for (const seg of segments) {
        ctx.beginPath();
        if (seg.type === 'arc') {
            ctx.arc(seg.center.x, seg.center.y, seg.radius,
                seg.startAngle, seg.endAngle, seg.clockwise);
        } else {
            ctx.moveTo(seg.start.x, seg.start.y);
            ctx.lineTo(seg.end.x, seg.end.y);
        }
        ctx.stroke();
    }
    if (drawing) {
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        if (drawing.center) {
            const tmp = computeArcParams(drawing.start, drawing.center, drawing.endPos);
            ctx.arc(drawing.center.x, drawing.center.y, tmp.radius,
                tmp.startAngle, tmp.endAngle, tmp.clockwise);
        } else {
            ctx.moveTo(drawing.start.x, drawing.start.y);
            ctx.lineTo(drawing.endPos.x, drawing.endPos.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawPins() {
    for (const p of pins) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        if (drawing && drawing.center === p) {
            ctx.fillStyle = 'orange';
        } else {
            ctx.fillStyle = '#333';
        }
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        if (drawing && drawing.center === p) {
            ctx.fillStyle = 'black';
            ctx.fillText('Arc', p.x + p.r + 4, p.y - p.r - 4);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPins();
    drawSegments();
}

canvas.addEventListener('mousedown', (e) => {
    const pos = {x: e.offsetX, y: e.offsetY};
    if (tool === 'string') {
        const hit = hitPin(pos);
        if (hit) {
            drawing = {start: hit, endPos: pos, center: null};
        }
    } else if (tool === 'pin') {
        // check for existing pin
        const hit = hitPin(pos);
        if (hit) {
            draggingPin = hit;
            dragOffset.x = pos.x - hit.x;
            dragOffset.y = pos.y - hit.y;
        } else {
            createPin(pos.x, pos.y);
        }
    } else if (tool === 'delete') {
        const idx = pins.findIndex(p => Math.hypot(p.x - pos.x, p.y - pos.y) <= p.r);
        if (idx >= 0) {
            pins.splice(idx, 1);
            draw();
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const pos = {x: e.offsetX, y: e.offsetY};
    if (draggingPin) {
        draggingPin.x = pos.x - dragOffset.x;
        draggingPin.y = pos.y - dragOffset.y;
        draw();
    } else if (drawing) {
        drawing.endPos = pos;
        const center = hitPin(pos);
        if (center && center !== drawing.start) {
            drawing.center = center;
        } else {
            drawing.center = null;
        }
        draw();
    }
});

canvas.addEventListener('mouseup', (e) => {
    const pos = {x: e.offsetX, y: e.offsetY};
    if (drawing) {
        const hit = hitPin(pos);
        if (drawing.center && hit && hit !== drawing.start && hit !== drawing.center) {
            const arc = computeArcParams(drawing.start, drawing.center, hit);
            segments.push({
                type: 'arc',
                start: drawing.start,
                end: hit,
                center: drawing.center,
                radius: arc.radius,
                startAngle: arc.startAngle,
                endAngle: arc.endAngle,
                clockwise: arc.clockwise
            });
        } else if (hit && hit !== drawing.start) {
            segments.push({type: 'line', start: drawing.start, end: hit});
        }
        drawing = null;
        draw();
    }
    draggingPin = null;
});
