document.addEventListener('DOMContentLoaded', () => {
    // 取得 HTML 元素
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
    const DOT_SPACING = 100; // 畫布內部邏輯的點距
    const PADDING = 50; // 畫布內部邏輯的留白
    const DOT_RADIUS = 6;
    const LINE_WIDTH = 4;
    const CLICK_TOLERANCE_DOT = 15;

    // 玩家顏色 (使用 CSS style.css 中定義的顏色)
    const PLAYER_COLORS = {
        1: { line: '#3498db', fill: 'rgba(52, 152, 219, 0.3)' },
        2: { line: '#e74c3c', fill: 'rgba(231, 76, 60, 0.3)' },
        0: { line: '#95a5a6', fill: 'rgba(149, 165, 166, 0.2)' } // 中立/作廢
    };
    const DEFAULT_LINE_COLOR = '#e0e0e0';

    // 遊戲狀態
    let currentPlayer = 1;
    let scores = { 1: 0, 2: 0 };
    let dots = [];
    let lines = {};
    let triangles = [];
    let totalTriangles = (GRID_SIZE - 1) * (GRID_SIZE - 1) * 4; // 3x3 * 4 = 36
    
    let selectedDot1 = null;
    let selectedDot2 = null;

    // 初始化遊戲
    function initGame() {
        // 設定畫布的 "真實" 像素大小
        const canvasSize = (GRID_SIZE - 1) * DOT_SPACING + PADDING * 2;
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        // 重置所有狀態
        currentPlayer = 1;
        scores = { 1: 0, 2: 0 };
        dots = [];
        lines = {};
        triangles = [];
        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        gameOverMessage.classList.add('hidden');

        // 1. 產生所有點的座標 (r, c)
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

        // 2. 產生所有 "小線段" (H, V, D, A)
        lines = {};
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                // 橫線 (Horizontal)
                if (c < GRID_SIZE - 1) {
                    const id = `H_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r][c + 1], drawn: false, player: null, id: id };
                }
                // 直線 (Vertical)
                if (r < GRID_SIZE - 1) {
                    const id = `V_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c], drawn: false, player: null, id: id };
                }
                // 正斜線 (Diagonal, \)
                if (r < GRID_SIZE - 1 && c < GRID_SIZE - 1) {
                    const id = `D_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c + 1], drawn: false, player: null, id: id };
                }
                // 反斜線 (Anti-diagonal, /)
                if (r < GRID_SIZE - 1 && c > 0) {
                    const id = `A_${r},${c}`; // (r, c) -> (r+1, c-1)
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c - 1], drawn: false, player: null, id: id };
                }
            }
        }

        // 3. 產生所有 36 個三角形
        triangles = [];
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            for (let c = 0; c < GRID_SIZE - 1; c++) {
                // 1x1 方格的四條邊
                const h1 = `H_${r},${c}`;   // 上
                const h2 = `H_${r + 1},${c}`; // 下
                const v1 = `V_${r},${c}`;   // 左
                const v2 = `V_${r},${c + 1}`; // 右
                
                // 1x1 方格的兩條斜線
                const diag_D = `D_${r},${c}`; // \
                const diag_A = `A_${r},${c + 1}`; // /

                // 基於 \ 的 2 個三角形
                triangles.push({
                    lineKeys: [h1, v2, diag_D], // 右上
                    dots: [dots[r][c], dots[r][c + 1], dots[r + 1][c + 1]],
                    filled: false, player: null
                });
                triangles.push({
                    lineKeys: [h2, v1, diag_D], // 左下
                    dots: [dots[r][c], dots[r + 1][c], dots[r + 1][c + 1]],
                    filled: false, player: null
                });

                // 基於 / 的 2 個三角形
                triangles.push({
                    lineKeys: [h1, v1, diag_A], // 左上
                    dots: [dots[r][c], dots[r][c + 1], dots[r+1][c]],
                    filled: false, player: null
                });
                triangles.push({
                    lineKeys: [h2, v2, diag_A], // 右下
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

        // 1. 繪製已完成的三角形 (填色)
        triangles.forEach(tri => {
            if (tri.filled) {
                ctx.beginPath();
                ctx.moveTo(tri.dots[0].x, tri.dots[0].y);
                ctx.lineTo(tri.dots[1].x, tri.dots[1].y);
                ctx.lineTo(tri.dots[2].x, tri.dots[2].y);
                ctx.closePath();
                // *** 即使是混色的，也用得分玩家的顏色填滿 ***
                ctx.fillStyle = PLAYER_COLORS[tri.player].fill;
                ctx.fill();
            }
        });

        // 2. 繪製所有線條 (已畫或提示)
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
                ctx.setLineDash([2, 4]); // 虛線
            }
            ctx.stroke();
            ctx.setLineDash([]); // 重置虛線
        }

        // 3. 繪製所有的點
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                ctx.beginPath();
                ctx.arc(dots[r][c].x, dots[r][c].y, DOT_RADIUS, 0, 2 * Math.PI);
                ctx.fillStyle = '#34495e'; // 點的顏色
                ctx.fill();
            }
        }
        
        // 4. 高亮顯示被選中的點 (點1 和 點2)
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

    // 點擊/觸控畫布 (包含手機版座標換算)
    function handleCanvasClick(e) {
        // 如果按鈕已顯示 (等待確認)，禁止再點選畫布
        if (!actionBar.classList.contains('hidden')) {
            return;
        }

        const rect = canvas.getBoundingClientRect();

        // 計算畫布在螢幕上的縮放比例
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // 獲取正確的點擊/觸控座標
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX; // 觸控
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX; // 滑鼠
            clientY = e.clientY;
        }
        
        // 換算回畫布的 "真實" 座標
        const mouseX = (clientX - rect.left) * scaleX;
        const mouseY = (clientY - rect.top) * scaleY;
        
        // 找到最近的點
        const clickedDot = findNearestDot(mouseX, mouseY);
        
        if (!clickedDot) { // 點了空白處
            if (selectedDot1) {
                cancelLine(); // 取消當前的選取
            }
            return;
        }

        if (selectedDot1 === null) {
            // 這是第一次點擊
            selectedDot1 = clickedDot;
        } else if (selectedDot2 === null) {
            // 這是第二次點擊
            if (clickedDot === selectedDot1) {
                // 點了同一個點，取消選取
                selectedDot1 = null;
            } else {
                // 選了第二個點
                selectedDot2 = clickedDot;
                // 顯示確認按鈕
                actionBar.classList.remove('hidden');
            }
        }
        
        drawCanvas(); // 重繪以顯示高亮
    }

    // "確認連線" 按鈕的函式
    function confirmLine() {
        if (!selectedDot1 || !selectedDot2) return;
        const dotA = selectedDot1;
        const dotB = selectedDot2;

        // 1. 檢查線條是否有效 (橫/直/45度)
        if (!isValidLine(dotA, dotB)) {
            alert("無效的線條 (必須是橫線、直線或45度斜線)");
            cancelLine();
            return;
        }

        // 2. 取得這條長線包含的所有"小線段"
        const segments = getSegmentsForLine(dotA, dotB);
        if (segments.length === 0) {
            alert("無效的路徑 (找不到對應的線段)");
            cancelLine();
            return;
        }

        // 3. 檢查是否有衝突 (是否壓到對手的線)
        const conflict = segments.some(seg => seg.drawn && seg.player !== currentPlayer);
        if (conflict) {
            alert("路徑被對手阻擋！");
            cancelLine();
            return;
        }

        // 4. 檢查是否是新線段
        const newSegmentsDrawn = segments.filter(seg => !seg.drawn);
        if (newSegmentsDrawn.length === 0) {
            alert("這條線您已經畫過了。");
            cancelLine();
            return;
        }

        // 5. 執行畫線 (標記為當前玩家)
        newSegmentsDrawn.forEach(seg => {
            seg.drawn = true;
            seg.player = currentPlayer;
        });
        
        // 6. 檢查得分
        let scoredThisTurn = false;
        let totalFilledTriangles = 0;
        
        triangles.forEach(tri => {
            if (!tri.filled) {
                // 檢查1：三條線是否都存在且都畫了
                const isComplete = tri.lineKeys.every(key => lines[key] && lines[key].drawn);
                
                // --- 【規則修改處】 ---
                if (isComplete) {
                    // 新規則：只要三角形完成了，當前玩家 (畫最後一筆的人) 就得分
                    // 不再檢查三條線是否為同一玩家
                    tri.filled = true;
                    tri.player = currentPlayer; // 這個三角形算作當前玩家的
                    scores[currentPlayer]++;
                    scoredThisTurn = true; // 得分！獲得額外回合

                    // (原版的 'else' (混色作廢) 邏輯已移除)
                }
                // --- 【規則修改結束】 ---
            }
            if (tri.filled) totalFilledTriangles++;
        });

        // 7. 重置選取並隱藏按鈕
        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        
        // 8. 繪製並更新 UI
        drawCanvas();
        updateUI();

        // 9. 檢查遊戲是否結束
        if (totalFilledTriangles === totalTriangles) {
            endGame();
            return;
        }

        // 10. 如果沒有得分，則換人
        if (!scoredThisTurn) {
            switchPlayer();
        }
        // (如果得分，則不換人，繼續回合)
    }

    // "取消選取" 按鈕的函式
    function cancelLine() {
        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        drawCanvas(); // 重繪以移除高亮
    }


    // ----- 輔助函式 -----

    // 輔助函式 - 找到最近的點
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

    // 輔助函式 - 檢查是否為 H, V, D, A
    function isValidLine(dotA, dotB) {
        const dr = Math.abs(dotA.r - dotB.r);
        const dc = Math.abs(dotA.c - dotB.c);
        // dr === 0 (橫線)
        // dc === 0 (直線)
        // dr === dc (斜線 \ 或 /)
        return dr === 0 || dc === 0 || dr === dc;
    }

    // 輔助函式 - 取得長線上的所有小線段
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
                if (dr === 1) { // 往下 (0,0 -> 1,1)
                    segmentId = `D_${r},${c}`;
                } else { // 往上 (1,1 -> 0,0)
                    segmentId = `D_${next_r},${next_c}`;
                }
            } else { // 反斜線 / (dr !== dc)
                if (dr === 1) { // 往下 (0,1 -> 1,0)
                    segmentId = `A_${r},${c}`;
                } else { // 往上 (1,0 -> 0,1)
                    segmentId = `A_${next_r},${next_c}`;
                }
            }

            if (segmentId && lines[segmentId]) {
                segments.push(lines[segmentId]);
            } else {
                console.log("找不到線段 ID (或路徑無效):", segmentId);
            }

            r = next_r;
            c = next_c;
        }
        return segments;
    }

    // 切換玩家
    function switchPlayer() {
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        updateUI();
    }

    // 更新分數和玩家狀態
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

    // 遊戲結束
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
        actionBar.classList.add('hidden'); // 遊戲結束時隱藏操作按鈕
    }

    // 綁定所有事件
    canvas.addEventListener('click', handleCanvasClick);
    
    // 增加觸控開始事件監聽 (手機優化)
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault(); // 防止 'click' 事件重複觸發 (鬼點擊)
        handleCanvasClick(e); // 傳遞 'touch' 事件給主處理器
    });

    resetButton.addEventListener('click', initGame);
    confirmLineButton.addEventListener('click', confirmLine);
    cancelLineButton.addEventListener('click', cancelLine);

    // 啟動遊戲
    initGame();
});
