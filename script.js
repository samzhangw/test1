document.addEventListener('DOMContentLoaded', () => {
    // 取得 HTML 元素 (與之前相同)
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const score1El = document.getElementById('score1');
    const score2El = document.getElementById('score2');
    const player1ScoreBox = document.getElementById('player1-score');
    const player2ScoreBox = document.getElementById('player2-score');
    const gameOverMessage = document.getElementById('game-over-message');
    const winnerText = document.getElementById('winner-text');
    const resetButton = document.getElementById('reset-button');

    // 遊戲設定
    const GRID_SIZE = 4;
    const DOT_SPACING = 100;
    const PADDING = 50;
    const DOT_RADIUS = 6;
    const LINE_WIDTH = 4;
    const CLICK_TOLERANCE_DOT = 15; // 點擊點的容忍範圍

    // 玩家顏色 (與上一版相同)
    const PLAYER_COLORS = {
        1: { line: '#007bff', fill: 'rgba(0, 123, 255, 0.3)' },
        2: { line: '#dc3545', fill: 'rgba(220, 53, 69, 0.3)' },
        0: { line: '#888', fill: 'rgba(150, 150, 150, 0.2)' }
    };
    const DEFAULT_LINE_COLOR = '#e0e0e0';

    // 遊戲狀態
    let currentPlayer = 1;
    let scores = { 1: 0, 2: 0 };
    let dots = [];
    let lines = {};
    let triangles = [];
    let totalTriangles = (GRID_SIZE - 1) * (GRID_SIZE - 1) * 2;
    
    // ----- 【新】: 處理兩次點擊的狀態 -----
    let selectedDot = null; // 儲存玩家點擊的第一個點

    // 初始化遊戲 (基本相同)
    function initGame() {
        const canvasSize = (GRID_SIZE - 1) * DOT_SPACING + PADDING * 2;
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        currentPlayer = 1;
        scores = { 1: 0, 2: 0 };
        dots = [];
        lines = {};
        triangles = [];
        selectedDot = null; // 重置點擊
        gameOverMessage.classList.add('hidden');

        // 1. 產生所有點的座標 (並加上 r, c 索引)
        for (let r = 0; r < GRID_SIZE; r++) {
            dots[r] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                dots[r][c] = {
                    x: c * DOT_SPACING + PADDING,
                    y: r * DOT_SPACING + PADDING,
                    r: r, // 儲存行列索引
                    c: c
                };
            }
        }

        // 2. 產生所有"小線段" (與之前相同)
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (c < GRID_SIZE - 1) {
                    const id = `H_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r][c + 1], drawn: false, player: null, id: id };
                }
                if (r < GRID_SIZE - 1) {
                    const id = `V_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c], drawn: false, player: null, id: id };
                }
                if (r < GRID_SIZE - 1 && c < GRID_SIZE - 1) {
                    const id = `D_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c + 1], drawn: false, player: null, id: id };
                }
            }
        }

        // 3. 產生所有 18 個三角形 (與之前相同)
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            for (let c = 0; c < GRID_SIZE - 1; c++) {
                const h1 = `H_${r},${c}`;   const h2 = `H_${r + 1},${c}`;
                const v1 = `V_${r},${c}`;   const v2 = `V_${r},${c + 1}`;
                const diag = `D_${r},${c}`;
                triangles.push({
                    lineKeys: [h2, v1, diag],
                    dots: [dots[r][c], dots[r + 1][c], dots[r + 1][c + 1]],
                    filled: false, player: null
                });
                triangles.push({
                    lineKeys: [h1, v2, diag],
                    dots: [dots[r][c], dots[r][c + 1], dots[r + 1][c + 1]],
                    filled: false, player: null
                });
            }
        }

        updateUI();
        drawCanvas();
    }

    // 繪製所有遊戲元素 (微調)
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 繪製已完成的三角形 (與之前相同)
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

        // 2. 繪製所有"小線段" (與之前相同)
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

        // 3. 繪製所有的點
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                ctx.beginPath();
                ctx.arc(dots[r][c].x, dots[r][c].y, DOT_RADIUS, 0, 2 * Math.PI);
                ctx.fillStyle = '#333';
                ctx.fill();
            }
        }
        
        // ----- 【新】: 繪製被選中的第一個點 (高亮) -----
        if (selectedDot) {
            ctx.beginPath();
            ctx.arc(selectedDot.x, selectedDot.y, DOT_RADIUS + 3, 0, 2 * Math.PI);
            ctx.strokeStyle = PLAYER_COLORS[currentPlayer].line;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    // ----- 【核心修改】: 處理畫布點擊事件 -----
    function handleCanvasClick(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 找到點擊位置最近的"點"
        const clickedDot = findNearestDot(mouseX, mouseY);
        if (!clickedDot) {
            selectedDot = null; // 點了空白處，取消選取
            drawCanvas();
            return;
        }

        if (selectedDot === null) {
            // 這是第一次點擊
            selectedDot = clickedDot;
            drawCanvas(); // 重繪以顯示高亮
        } else {
            // 這是第二次點擊
            const dotA = selectedDot;
            const dotB = clickedDot;
            selectedDot = null; // 重置選取

            if (dotA === dotB) { // 點了同一個點
                drawCanvas(); // 取消高亮
                return;
            }

            // 1. 檢查線條是否有效 (橫/直/45度)
            if (!isValidLine(dotA, dotB)) {
                console.log("無效的線條 (非 H, V, D)");
                drawCanvas();
                return;
            }

            // 2. 取得這條長線包含的所有"小線段"
            const segments = getSegmentsForLine(dotA, dotB);
            if (segments.length === 0) {
                console.log("找不到線段");
                drawCanvas();
                return;
            }

            // 3. 檢查是否有衝突 (是否壓到對手的線)
            const conflict = segments.some(seg => seg.drawn && seg.player !== currentPlayer);
            if (conflict) {
                console.log("路徑被對手阻擋！");
                drawCanvas();
                return;
            }

            // 4. 執行畫線 (過濾掉自己已經畫過的)
            const newSegmentsDrawn = segments.filter(seg => !seg.drawn);
            if (newSegmentsDrawn.length === 0) {
                console.log("這條線你已經畫過了");
                drawCanvas();
                return;
            }

            newSegmentsDrawn.forEach(seg => {
                seg.drawn = true;
                seg.player = currentPlayer;
            });
            
            // 5. 檢查得分 (與上一版邏輯相同)
            let scoredThisTurn = false;
            let totalFilledTriangles = 0;

            triangles.forEach(tri => {
                if (!tri.filled) {
                    const isComplete = tri.lineKeys.every(key => lines[key].drawn);
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
                            tri.player = 0; // 混色，作廢
                        }
                    }
                }
                if (tri.filled) totalFilledTriangles++;
            });

            // 6. 繪製並更新
            drawCanvas();
            updateUI();

            // 7. 檢查遊戲結束
            if (totalFilledTriangles === totalTriangles) {
                endGame();
                return;
            }

            // 8. 如果沒有得分，則換人
            if (!scoredThisTurn) {
                switchPlayer();
            }
            // (如果得分，則不換人，繼續回合)
        }
    }

    // ----- 【新】: 輔助函式 - 找到最近的點 -----
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

    // ----- 【新】: 輔助函式 - 檢查是否為 H, V, D -----
    function isValidLine(dotA, dotB) {
        const dr = Math.abs(dotA.r - dotB.r);
        const dc = Math.abs(dotA.c - dotB.c);
        return dr === 0 || dc === 0 || dr === dc; // 橫, 直, 或 45度斜
    }

    // ----- 【新】: 輔助函式 - 取得長線上的所有小線段 -----
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
            } else { // 斜線
                // 我們的系統只定義了左上到右下 (D) 的斜線
                // 我們需要確保這條線是 D 類型
                if (dr === 1 && dc === 1) { // (0,0) -> (1,1)
                    segmentId = `D_${r},${c}`;
                } else if (dr === -1 && dc === -1) { // (1,1) -> (0,0)
                    segmentId = `D_${next_r},${next_c}`;
                } else {
                    // 這是另一種斜線 (e.g. (0,1) -> (1,0)), 我們的三角形用不到
                    // 但為了完整性，我們可以返回空，或者在 isValidLine 中就擋掉
                    // 目前的 isValidLine 允許了這種斜線，但這裡會找不到 ID。
                    // 為了遊戲正確，我們只找 D_\` 類型的
                    segmentId = `D_${Math.min(r, next_r)},${Math.min(c, next_c)}`;
                    if (!lines[segmentId]) segmentId = null; // 確保 ID 存在
                }
            }

            if (segmentId && lines[segmentId]) {
                segments.push(lines[segmentId]);
            } else if (segmentId) {
                // 邏輯出錯，或線條是反斜線
                console.log("找不到線段 ID:", segmentId);
            }

            r = next_r;
            c = next_c;
        }
        return segments;
    }

    // 切換玩家 (與之前相同)
    function switchPlayer() {
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        updateUI();
    }

    // 更新分數和玩家狀態 (與之前相同)
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

    // 遊戲結束 (與之前相同)
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
    }

    // 綁定事件
    canvas.addEventListener('click', handleCanvasClick);
    resetButton.addEventListener('click', initGame);

    // 啟動遊戲
    initGame();
});