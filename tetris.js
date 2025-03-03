// Tetris Game
document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('game-board');
    canvas.width = 300;
    canvas.height = 480; // Reduced from 600 to 480
    const ctx = canvas.getContext('2d');
    
    const nextPieceCanvas = document.createElement('canvas');
    nextPieceCanvas.width = 100;
    nextPieceCanvas.height = 100;
    const nextPieceCtx = nextPieceCanvas.getContext('2d');
    document.getElementById('next-piece').appendChild(nextPieceCanvas);
    
    const holdPieceCanvas = document.createElement('canvas');
    holdPieceCanvas.width = 100;
    holdPieceCanvas.height = 100;
    const holdPieceCtx = holdPieceCanvas.getContext('2d');
    document.getElementById('hold-piece').appendChild(holdPieceCanvas);

    // Game constants
    const BLOCK_SIZE = 24; // Reduced from 30 to 24
    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 20;
    const COLORS = [
        null,
        '#00FFFF',  // I - Cyan
        '#0071FF',  // J - Bright Blue
        '#FF9500',  // L - Bright Orange
        '#FFEF00',  // O - Bright Yellow
        '#00FF76',  // S - Bright Green
        '#D300FF',  // T - Bright Purple
        '#FF0055'   // Z - Bright Red
    ];

    // Tetromino shapes
    const SHAPES = [
        null,
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],  // I
        [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // J
        [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // L
        [[0, 4, 4], [0, 4, 4], [0, 0, 0]],                         // O
        [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
        [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
        [[7, 7, 0], [0, 7, 7], [0, 0, 0]]                          // Z
    ];

    // Game variables
    let board = createBoard();
    let score = 0;
    let lines = 0;
    let level = 1;
    let dropInterval = 1000; // ms
    let lastTime = 0;
    let dropCounter = 0;
    let gameOver = false;
    let isPaused = false;
    let animationId;
    let currentPiece = null;
    let nextPiece = null;
    let holdPiece = null;
    let canHold = true;

    // Player variables
    const player = {
        pos: { x: 0, y: 0 },
        piece: null,
        score: 0
    };

    // DOM elements
    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('level');
    const startButton = document.getElementById('start-button');

    // Event listeners
    document.addEventListener('keydown', handleKeyPress);
    startButton.addEventListener('click', toggleGame);

    // Game initialization
    function init() {
        board = createBoard();
        score = 0;
        lines = 0;
        level = 1;
        updateScore();
        gameOver = false;
        isPaused = false;
        holdPiece = null;
        canHold = true;
        drawHoldPiece();
        generateNewPiece();
        draw();
    }

    // Create empty game board
    function createBoard() {
        return Array.from(Array(BOARD_HEIGHT), () => Array(BOARD_WIDTH).fill(0));
    }

    // Generate a random piece
    function getRandomPiece() {
        return Math.floor(Math.random() * 7) + 1;
    }

    // Generate new piece for the player
    function generateNewPiece() {
        if (nextPiece === null) {
            nextPiece = getRandomPiece();
        }
        
        player.piece = nextPiece;
        nextPiece = getRandomPiece();
        player.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(SHAPES[player.piece][0].length / 2);
        player.pos.y = 0;

        // Game over check
        if (checkCollision()) {
            gameOver = true;
            cancelAnimationFrame(animationId);
            drawGameOver();
        }
        
        drawNextPiece();
        canHold = true;
    }

    // Draw next piece preview
    function drawNextPiece() {
        nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        nextPieceCtx.fillStyle = '#1a1a2e';
        nextPieceCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        const shape = SHAPES[nextPiece];
        const blockSize = 18; // Reduced from 20
        
        // Center the piece in the preview canvas
        const offsetX = (nextPieceCanvas.width - shape[0].length * blockSize) / 2;
        const offsetY = (nextPieceCanvas.height - shape.length * blockSize) / 2;
        
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    nextPieceCtx.fillStyle = COLORS[value];
                    nextPieceCtx.fillRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize, blockSize);
                    nextPieceCtx.strokeStyle = '#000';
                    nextPieceCtx.lineWidth = 1;
                    nextPieceCtx.strokeRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize, blockSize);
                }
            });
        });
    }

    // Check for collision
    function checkCollision() {
        const piece = SHAPES[player.piece];
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x] !== 0 && 
                   (board[y + player.pos.y] === undefined || 
                    board[y + player.pos.y][x + player.pos.x] === undefined ||
                    board[y + player.pos.y][x + player.pos.x] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Rotate piece
    function rotatePiece() {
        const piece = SHAPES[player.piece];
        const rotated = [];
        
        for (let i = 0; i < piece[0].length; i++) {
            const row = [];
            for (let j = piece.length - 1; j >= 0; j--) {
                row.push(piece[j][i]);
            }
            rotated.push(row);
        }
        
        // Create a deep copy of the original piece
        const originalPiece = JSON.parse(JSON.stringify(SHAPES[player.piece]));
        
        // Update the piece with the rotated version
        SHAPES[player.piece] = rotated;
        
        // Check for wall kicks
        const originalPos = { ...player.pos };
        let offset = 0;
        
        // Try different offsets to fit the rotated piece
        for (offset = 0; offset <= 2; offset++) {
            // Try right
            player.pos.x += offset;
            if (!checkCollision()) {
                return;
            }
            
            // Try left
            player.pos.x = originalPos.x - offset;
            if (!checkCollision()) {
                return;
            }
            
            // Reset position and try again with a larger offset
            player.pos.x = originalPos.x;
        }
        
        // If no valid position is found, revert to the original piece
        SHAPES[player.piece] = originalPiece;
    }

    // Merge piece with the board
    function mergePiece() {
        const piece = SHAPES[player.piece];
        piece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }
    
    // Hold the current piece
    function holdPiece() {
        if (!canHold) return;
        
        if (holdPiece === null) {
            holdPiece = player.piece;
            generateNewPiece();
        } else {
            const temp = holdPiece;
            holdPiece = player.piece;
            player.piece = temp;
            player.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(SHAPES[player.piece][0].length / 2);
            player.pos.y = 0;
            
            // Check if the held piece can be placed
            if (checkCollision()) {
                player.pos.y = 0;
                // If still colliding, try to place it higher
                if (checkCollision()) {
                    // Revert the swap if it's still colliding
                    player.piece = holdPiece;
                    holdPiece = temp;
                    return;
                }
            }
        }
        
        canHold = false;
        drawHoldPiece();
    }
    
    // Draw hold piece preview
    function drawHoldPiece() {
        holdPieceCtx.clearRect(0, 0, holdPieceCanvas.width, holdPieceCanvas.height);
        holdPieceCtx.fillStyle = '#1a1a2e';
        holdPieceCtx.fillRect(0, 0, holdPieceCanvas.width, holdPieceCanvas.height);
        
        if (holdPiece === null) return;
        
        const shape = SHAPES[holdPiece];
        const blockSize = 18; // Reduced from 20
        
        // Center the piece in the preview canvas
        const offsetX = (holdPieceCanvas.width - shape[0].length * blockSize) / 2;
        const offsetY = (holdPieceCanvas.height - shape.length * blockSize) / 2;
        
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    holdPieceCtx.fillStyle = COLORS[value];
                    holdPieceCtx.fillRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize, blockSize);
                    holdPieceCtx.strokeStyle = '#000';
                    holdPieceCtx.lineWidth = 1;
                    holdPieceCtx.strokeRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize, blockSize);
                }
            });
        });
    }

    // Drop piece by one row
    function dropPiece() {
        player.pos.y++;
        if (checkCollision()) {
            player.pos.y--;
            mergePiece();
            clearLines();
            generateNewPiece();
        }
        dropCounter = 0;
    }

    // Hard drop piece to the bottom
    function hardDrop() {
        while (!checkCollision()) {
            player.pos.y++;
        }
        player.pos.y--;
        mergePiece();
        clearLines();
        generateNewPiece();
        dropCounter = 0;
    }

    // Move piece horizontally
    function movePiece(direction) {
        player.pos.x += direction;
        if (checkCollision()) {
            player.pos.x -= direction;
        }
    }

    // Clear completed lines
    function clearLines() {
        let linesCleared = 0;
        outer: for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            
            // Clear the line and move everything down
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            y++;
            linesCleared++;
        }
        
        if (linesCleared > 0) {
            // Update score
            switch (linesCleared) {
                case 1:
                    score += 100 * level;
                    break;
                case 2:
                    score += 300 * level;
                    break;
                case 3:
                    score += 500 * level;
                    break;
                case 4:
                    score += 800 * level;
                    break;
            }
            
            lines += linesCleared;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(1000 - (level - 1) * 100, 100);
            
            updateScore();
        }
    }

    // Update score display
    function updateScore() {
        scoreElement.textContent = score;
        linesElement.textContent = lines;
        levelElement.textContent = level;
    }

    // Draw the game
    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw board
        drawBoard();
        
        // Draw current piece
        drawPiece();
    }

    // Draw the game board
    function drawBoard() {
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = COLORS[value];
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    // Draw the current piece
    function drawPiece() {
        const piece = SHAPES[player.piece];
        piece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = COLORS[value];
                    ctx.fillRect((x + player.pos.x) * BLOCK_SIZE, (y + player.pos.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect((x + player.pos.x) * BLOCK_SIZE, (y + player.pos.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    // Draw game over text
    function drawGameOver() {
        ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '30px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
        
        // Gradient text for score
        const gradient = ctx.createLinearGradient(
            canvas.width / 2 - 70, canvas.height / 2 + 10,
            canvas.width / 2 + 70, canvas.height / 2 + 10
        );
        gradient.addColorStop(0, '#00b894');
        gradient.addColorStop(1, '#00a8ff');
        
        ctx.fillStyle = gradient;
        ctx.font = '20px "Segoe UI", sans-serif';
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
        
        ctx.fillStyle = 'white';
        ctx.fillText('Press Start to play again', canvas.width / 2, canvas.height / 2 + 50);
    }

    // Draw pause screen
    function drawPauseScreen() {
        ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Gradient text for PAUSED
        const gradient = ctx.createLinearGradient(
            canvas.width / 2 - 80, canvas.height / 2,
            canvas.width / 2 + 80, canvas.height / 2
        );
        gradient.addColorStop(0, '#00a8ff');
        gradient.addColorStop(0.5, '#00b894');
        gradient.addColorStop(1, '#00a8ff');
        
        ctx.fillStyle = gradient;
        ctx.font = '30px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }

    // Handle keyboard input
    function handleKeyPress(event) {
        if (gameOver) {
            return;
        }
        
        switch (event.keyCode) {
            case 37: // Left arrow
                if (!isPaused) movePiece(-1);
                break;
            case 39: // Right arrow
                if (!isPaused) movePiece(1);
                break;
            case 40: // Down arrow
                if (!isPaused) dropPiece();
                break;
            case 38: // Up arrow
                if (!isPaused) hardDrop();
                break;
            case 32: // Space
                if (!isPaused) rotatePiece();
                break;
            case 80: // P key
                togglePause();
                break;
            case 67: // C key - hold piece
                if (!isPaused) holdPiece();
                break;
        }
    }

    // Toggle game pause
    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            cancelAnimationFrame(animationId);
            drawPauseScreen();
        } else {
            lastTime = 0;
            requestAnimationFrame(update);
        }
    }

    // Toggle game start/pause
    function toggleGame() {
        if (gameOver) {
            init();
            requestAnimationFrame(update);
        } else {
            togglePause();
        }
    }

    // Main game loop
    function update(time = 0) {
        if (gameOver || isPaused) {
            return;
        }
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            dropPiece();
        }
        
        draw();
        animationId = requestAnimationFrame(update);
    }

    // Initialize game
    init();
});
