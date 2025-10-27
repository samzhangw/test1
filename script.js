document.addEventListener('DOMContentLoaded', () => {
    // 取得 HTML 元素 (與前一版相同)
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const score1El = document.getElementById('score1');
    const score2El = document.getElementById('score2');
    const player1ScoreBox = document.getElementById('player1-score');
    const player2ScoreBox = document.getElementById('player2-score');
    const gameOverMessage = document.getElementById('game-over-message');
    const winnerText = document.getElementById('winner-text');
    const confirmLineButton = document.getElementById('confirm-line-button');
    const cancelLineButton = document.getElementById('cancel-line-button');
    const actionBar = document.getElementById('action-bar');
    const resetButton = document.getElementById('reset-button');

    // 遊戲設定
    const GRID_SIZE = 4;
    const DOT_SPACING = 100;
    const PADDING = 50;
    const DOT_RADIUS = 6;
    const LINE_WIDTH = 4;
    const CLICK_TOLERANCE_DOT = 15;

    // 玩家顏色 (與前一版相同)
    const PLAYER_COLORS = {
        1: { line: '#3498db', fill: 'rgba(52, 152, 219, 0.3)' }, // 使用 CSS 中的 P1 顏色
        2: { line: '#e74c3c', fill: 'rgba(231, 76, 60, 0.3)' }, // 使用 CSS 中的 P2 顏色
        0: { line: '#95a5a6', fill: 'rgba(149, 165, 166, 0.2)' } // 中立色
    };
    const DEFAULT_LINE_COLOR = '#e0e0e0'; // 淺灰色

    // 遊戲狀態
    let currentPlayer = 1;
    let scores = { 1: 0, 2: 0 };
    let dots = [];
    let lines = {};
    let triangles = [];
    
    // 【修改】 總三角形數變為 36
    let totalTriangles = (GRID_SIZE - 1) * (GRID_SIZE - 1) * 4; // 3x3 方格 * 4個三角形 = 36
    
    let selectedDot1 = null;
    let selectedDot2 = null;

    // 初始化遊戲
    function initGame() {
        const canvasSize = (GRID_SIZE - 1) * DOT_SPACING + PADDING * 2;
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        currentPlayer = 1;
        scores = { 1: 0, 2: 0 };
        dots = [];
        lines = {};
        triangles = [];
        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        gameOverMessage.classList.add('hidden');

        // 1. 產生所有點的座標 (相同)
        for (let r = 0; r < GRID_SIZE; r++) {
            dots[r] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                dots[r][c] = {
                    x: c * DOT_SPACING + PADDING,
                    y: r * DOT_SPACING + PADDING,
                    r: r, c: c
                };
            }
        }

        // 【修改】 2. 產生所有"小線段" (H, V, D, 和新的 A)
        lines = {}; // 清空
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                // 橫線 (H)
                if (c < GRID_SIZE - 1) {
                    const id = `H_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r][c + 1], drawn: false, player: null, id: id };
                }
                // 直線 (V)
                if (r < GRID_SIZE - 1) {
                    const id = `V_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c], drawn: false, player: null, id: id };
                }
                // 正斜線 (D, 左上 -> 右下)
                if (r < GRID_SIZE - 1 && c < GRID_SIZE - 1) {
                    const id = `D_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c + 1], drawn: false, player: null, id: id };
                }
                // 【新】 反斜線 (A, 右上 -> 左下)
                if (r < GRID_SIZE - 1 && c > 0) {
                    const id = `A_${r},${c}`; // 代表 (r, c) 到 (r+1, c-1)
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c - 1], drawn: false, player: null, id: id };
                }
            }
        }

        // 【修改】 3. 產生所有 36 個三角形
        triangles = []; // 清空
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            for (let c = 0; c < GRID_SIZE - 1; c++) {
                // 找出 (r,c) 這個 1x1 方格的所有邊
                const h1 = `H_${r},${c}`;   // 上方橫線
                const h2 = `H_${r + 1},${c}`; // 下方橫線
                const v1 = `V_${r},${c}`;   // 左方直線
                const v2 = `V_${r},${c + 1}`; // 右方直線
                
                // 正斜線 \
                const diag_D = `D_${r},${c}`; // (r,c) -> (r+1,c+1)
                // 反斜線 /
                const diag_A = `A_${r},${c + 1}`; // (r,c+1) -> (r+1,c)

                // 基於 正斜線 \ 的 2 個三角形
                triangles.push({ // 右上
                    lineKeys: [h1, v2, diag_D],
                    dots: [dots[r][c], dots[r][c + 1], dots[r + 1][c + 1]],
                    filled: false, player: null
                });
                triangles.push({ // 左下
                    lineKeys: [h2, v1, diag_D],
                    dots: [dots[r][c], dots[r + 1][c], dots[r + 1][c + 1]],
                    filled: false, player: null
                });

                // 【新】 基於 反斜線 / 的 2 個三角形
                triangles.push({ // 左上
                    lineKeys: [h1, v1, diag_A],
                    dots: [dots[r][c], dots[r][c + 1], dots[r+1][c]],
                    filled: false, player: null
                });
                triangles.push({ // 右下
                    lineKeys: [h2, v2, diag_A],
                    dots: [dots[r][c + 1], dots[r + 1][c], dots[r + 1][c + 1]],
                    filled: false, player: null
                });
            }
        }
        
        updateUI();
        drawCanvas();
    }

    // 繪製所有遊戲元素
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 繪製已完成的三角形 (相同)
        triangles.forEach(tri => {
            if (tri.filled) {
                ctx.beginPath();
                ctx.moveTo(tri.dots[0].x, tri.dots[0].y);
                ctx.lineTo(tri.dots[1].x, tri.dots[1].y);
                ctx.lineTo(tri.dots[2].x, tri.dots[2].y);
                ctx.closePath();
                ctx.fillStyle = PLAYER_COLORS[tri.player].fill;
                ctx.fill();
            }
        });

        // 2. 繪製所有線條 (相同)
        for (const id in lines) {
            const line = lines[id];
            ctx.beginPath();
            ctx.moveTo(line.p1.x, line.p1.y);
            ctx.lineTo(line.p2.x, line.p2.y);
            if (line.drawn) {
                ctx.strokeStyle = PLAYER_COLORS[line.player].line;
                ctx.lineWidth = LINE_WIDTH;
            } else {
                ctx.strokeStyle = DEFAULT_LINE_COLOR;
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 4]);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 3. 繪製所有的點 (相同)
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                ctx.beginPath();
                ctx.arc(dots[r][c].x, dots[r][c].y, DOT_RADIUS, 0, 2 * Math.PI);
                ctx.fillStyle = '#34495e'; // 使用 CSS 的文字色
                ctx.fill();
            }
        }
        
        // 4. 高亮顯示被選中的點 (相同)
        [selectedDot1, selectedDot2].forEach(dot => {
            if (dot) {
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, DOT_RADIUS + 3, 0, 2 * Math.PI);
                ctx.strokeStyle = PLAYER_COLORS[currentPlayer].line;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        });
    }

    // 點擊畫布 (相同)
    function handleCanvasClick(e) {
        if (!actionBar.classList.contains('hidden')) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const clickedDot = findNearestDot(mouseX, mouseY);
        if (!clickedDot) {
            if (selectedDot1) {
                cancelLine();
            }
            return;
        }
        if (selectedDot1 === null) {
            selectedDot1 = clickedDot;
        } else if (selectedDot2 === null) {
            if (clickedDot === selectedDot1) {
                selectedDot1 = null;
            } else {
                selectedDot2 = clickedDot;
                actionBar.classList.remove('hidden');
            }
        }
        drawCanvas();
    }

    // 確認連線 (相同)
    function confirmLine() {
        if (!selectedDot1 || !selectedDot2) return;
        const dotA = selectedDot1;
        const dotB = selectedDot2;

        if (!isValidLine(dotA, dotB)) {
            alert("無效的線條 (必須是橫線、直線或45度斜線)");
            cancelLine();
            return;
        }

        const segments = getSegmentsForLine(dotA, dotB);
        if (segments.length === 0) {
            alert("無效的路徑 (找不到對應的線段)");
            cancelLine();
            return;
        }

        const conflict = segments.some(seg => seg.drawn && seg.player !== currentPlayer);
        if (conflict) {
            alert("路徑被對手阻擋！");
            cancelLine();
            return;
        }

        const newSegmentsDrawn = segments.filter(seg => !seg.drawn);
        if (newSegmentsDrawn.length === 0) {
            alert("這條線您已經畫過了。");
            cancelLine();
            return;
        }

        newSegmentsDrawn.forEach(seg => {
            seg.drawn = true;
            seg.player = currentPlayer;
        });
        
        let scoredThisTurn = false;
        let totalFilledTriangles = 0;
        triangles.forEach(tri => {
            if (!tri.filled) {
                const isComplete = tri.lineKeys.every(key => lines[key] && lines[key].drawn);
                if (isComplete) {
                    const line1Player = lines[tri.lineKeys[0]].player;
                    const line2Player = lines[tri.lineKeys[1]].player;
                    const line3Player = lines[tri.lineKeys[2]].player;
                    if (line1Player === currentPlayer && line2Player === currentPlayer && line3Player === currentPlayer) {
                        tri.filled = true;
                        tri.player = currentPlayer;
                        scores[currentPlayer]++;
                        scoredThisTurn = true;
                    } else {
                        tri.filled = true;
                        tri.player = 0;
                    }
                }
            }
            if (tri.filled) totalFilledTriangles++;
        });

        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        drawCanvas();
        updateUI();

        if (totalFilledTriangles === totalTriangles) {
            endGame();
            return;
        }

        if (!scoredThisTurn) {
            switchPlayer();
        }
    }

    // 取消連線 (相同)
    function cancelLine() {
        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        drawCanvas();
    }

    // 輔助函式 - 找到最近的點 (相同)
    function findNearestDot(mouseX, mouseY) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const dot = dots[r][c];
                const distSq = (mouseX - dot.x) ** 2 + (mouseY - dot.y) ** 2;
                if (distSq < CLICK_TOLERANCE_DOT ** 2) {
                    return dot;
                }
            }
        }
        return null;
    }

    // 【修改】 輔助函式 - 檢查是否為 H, V, D, A
    function isValidLine(dotA, dotB) {
        const dr = Math.abs(dotA.r - dotB.r);
        const dc = Math.abs(dotA.c - dotB.c);
        // dr === 0 (橫線)
        // dc === 0 (直線)
        // dr === dc (斜線 \ 或 /)
        return dr === 0 || dc === 0 || dr === dc;
    }

    // 【修改】 輔助函式 - 取得長線上的所有小線段 (支援 H, V, D, A)
    function getSegmentsForLine(dotA, dotB) {
        const segments = [];
        const dr = Math.sign(dotB.r - dotA.r); // -1, 0, or 1
        const dc = Math.sign(dotB.c - dotA.c); // -1, 0, or 1

        let r = dotA.r;
        let c = dotA.c;

        while (r !== dotB.r || c !== dotB.c) {
            let next_r = r + dr;
            let next_c = c + dc;
            let segmentId = null;

            if (dr === 0) { // 橫線
                segmentId = `H_${r},${Math.min(c, next_c)}`;
            } else if (dc === 0) { // 直線
                segmentId = `V_${Math.min(r, next_r)},${c}`;
            } else if (dr === dc) { // 正斜線 \
                if (dr === 1) { // 往下
                    segmentId = `D_${r},${c}`;
                } else { // 往上 (dr === -1)
                    segmentId = `D_${next_r},${next_c}`;
                }
            } else { // 反斜線 / (dr !== dc)
                if (dr === 1) { // 往下 (dr=1, dc=-1)
                    segmentId = `A_${r},${c}`;
                } else { // 往上 (dr=-1, dc=1)
                    segmentId = `A_${next_r},${next_c}`;
                }
            }

            if (segmentId && lines[segmentId]) {
                segments.push(lines[segmentId]);
            } else {
                console.log("找不到線段 ID:", segmentId);
            }

            r = next_r;
            c = next_c;
        }
        return segments;
    }

    // 切換玩家 (相同)
    function switchPlayer() {
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        updateUI();
    }

    // 更新分數和玩家狀態 (相同)
    function updateUI() {
        score1El.textContent = scores[1];
        score2El.textContent = scores[2];
        if (currentPlayer === 1) {
            player1ScoreBox.classList.add('active');
            player2ScoreBox.classList.remove('active', 'player2');
        } else {
            player1ScoreBox.classList.remove('active');
            player2ScoreBox.classList.add('active', 'player2');
        }
    }

    // 遊戲結束 (相同)
    function endGame() {
        let winnerMessage = "";
        if (scores[1] > scores[2]) {
            winnerMessage = "玩家 1 獲勝！";
        } else if (scores[2] > scores[1]) {
            winnerMessage = "玩家 2 獲勝！";
        } else {
            winnerMessage = "平手！";
        }
        winnerText.textContent = winnerMessage;
        gameOverMessage.classList.remove('hidden');
        actionBar.classList.add('hidden');
    }

    // 綁定事件 (相同)
    canvas.addEventListener('click', handleCanvasClick);
    resetButton.addEventListener('click', initGame);
    confirmLineButton.addEventListener('click', confirmLine);
    cancelLineButton.addEventListener('click', cancelLine);

    // 啟動遊戲
    initGame();
});