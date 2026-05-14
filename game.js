// Game Constants
const CANVAS_WIDTH = Math.min(window.innerWidth, 1000);
const CANVAS_HEIGHT = Math.min(window.innerHeight, 700);
const GAME_WIDTH = 2000;
const GAME_HEIGHT = 1500;
const PLAYER_SIZE = 20;
const ENEMY_SIZE = 18;
const ITEM_SIZE = 10;
const MAX_HEALTH = 100;
const MAX_AMMO = 50;
const ZONE_DAMAGE = 0.5;
const ATTACK_COOLDOWN = 500; // ms
const ATTACK_RANGE = 60;
const ATTACK_DAMAGE = 10;
const AMMO_PER_ATTACK = 1;
const INITIAL_ENEMIES = 10;
const ZONE_SHRINK_RATE = 0.985; // per frame
const ZONE_START_RADIUS = 400;
const FINAL_ZONE_RADIUS = 100;

// Game State
const game = {
    canvas: null,
    ctx: null,
    running: false,
    paused: false,
    frameCount: 0,
    gameTime: 0,
    kills: 0,
    
    player: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        vx: 0,
        vy: 0,
        health: MAX_HEALTH,
        ammo: MAX_AMMO,
        lastAttack: 0,
        size: PLAYER_SIZE,
        color: '#00ff00'
    },
    
    enemies: [],
    items: [],
    zone: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        radius: ZONE_START_RADIUS,
        shrinking: false,
        shrinkStartFrame: 0
    },
    
    camera: {
        x: 0,
        y: 0
    },
    
    // Input states
    keys: {},
    joystick: {
        active: false,
        x: 0,
        y: 0
    },
    mobile: false,
    touchSensitivity: 0.05
};

// Initialize
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    game.canvas.width = CANVAS_WIDTH;
    game.canvas.height = CANVAS_HEIGHT;
    
    // Detect mobile
    game.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Show/hide mobile controls
    const mobileControls = document.getElementById('mobileControls');
    if (game.mobile) {
        mobileControls.classList.add('active');
        setupMobileControls();
    }
    
    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    document.getElementById('playAgainBtn').addEventListener('click', startGame);
    
    window.addEventListener('keydown', (e) => {
        game.keys[e.key.toLowerCase()] = true;
    });
    
    window.addEventListener('keyup', (e) => {
        game.keys[e.key.toLowerCase()] = false;
    });
    
    // Show menu
    showScreen('menuScreen');
}

function setupMobileControls() {
    // Left Joystick
    const joystickBg = document.querySelector('.joystick-bg');
    const joystickStick = document.getElementById('leftJoystick');
    let joystickActive = false;
    
    const handleJoystickStart = (e) => {
        joystickActive = true;
        joystickStick.classList.add('active');
        updateJoystick(e);
    };
    
    const handleJoystickMove = (e) => {
        if (!joystickActive) return;
        updateJoystick(e);
    };
    
    const handleJoystickEnd = () => {
        joystickActive = false;
        joystickStick.classList.remove('active');
        game.joystick.x = 0;
        game.joystick.y = 0;
        const stick = document.getElementById('leftJoystick');
        stick.style.transform = 'translate(-50%, -50%)';
    };
    
    function updateJoystick(e) {
        const touch = e.touches ? e.touches[0] : e;
        const rect = joystickBg.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = (touch.clientX - centerX) / (rect.width / 2);
        let dy = (touch.clientY - centerY) / (rect.height / 2);
        
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 1) {
            dx /= magnitude;
            dy /= magnitude;
        }
        
        game.joystick.x = dx;
        game.joystick.y = dy;
        
        const maxOffset = rect.width / 2 - 20;
        const offsetX = dx * maxOffset;
        const offsetY = dy * maxOffset;
        
        joystickStick.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    }
    
    joystickBg.addEventListener('touchstart', handleJoystickStart);
    document.addEventListener('touchmove', handleJoystickMove);
    document.addEventListener('touchend', handleJoystickEnd);
    
    // Attack Button
    document.getElementById('attackBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        playerAttack();
    });
    
    // Pickup Button
    document.getElementById('pickupBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        playerPickup();
    });
}

function startGame() {
    // Reset game state
    game.running = true;
    game.frameCount = 0;
    game.gameTime = 0;
    game.kills = 0;
    game.paused = false;
    
    // Reset player
    game.player.x = GAME_WIDTH / 2;
    game.player.y = GAME_HEIGHT / 2;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.health = MAX_HEALTH;
    game.player.ammo = MAX_AMMO;
    game.player.lastAttack = 0;
    
    // Reset zone
    game.zone.radius = ZONE_START_RADIUS;
    game.zone.shrinking = false;
    game.zone.shrinkStartFrame = 0;
    
    // Clear and spawn enemies
    game.enemies = [];
    for (let i = 0; i < INITIAL_ENEMIES; i++) {
        spawnEnemy();
    }
    
    // Spawn initial items
    game.items = [];
    for (let i = 0; i < 15; i++) {
        spawnItem();
    }
    
    // Hide screens
    hideScreens();
    
    // Start game loop
    gameLoop();
}

function spawnEnemy() {
    let x, y, validPosition;
    
    do {
        x = Math.random() * GAME_WIDTH;
        y = Math.random() * GAME_HEIGHT;
        const distToZone = Math.hypot(x - game.zone.x, y - game.zone.y);
        validPosition = distToZone < game.zone.radius + 200;
    } while (!validPosition);
    
    game.enemies.push({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        health: 30,
        ammo: 30,
        size: ENEMY_SIZE,
        color: '#ff3333',
        lastAttack: 0,
        targetX: x,
        targetY: y,
        behavior: Math.random() > 0.5 ? 'hunt' : 'wander',
        behaviorTimer: 0
    });
}

function spawnItem() {
    const x = Math.random() * GAME_WIDTH;
    const y = Math.random() * GAME_HEIGHT;
    const type = Math.random() > 0.5 ? 'health' : 'ammo';
    
    game.items.push({
        x: x,
        y: y,
        type: type,
        size: ITEM_SIZE,
        color: type === 'health' ? '#ff3333' : '#ffcc00',
        value: type === 'health' ? 25 : 15
    });
}

function gameLoop() {
    if (!game.running) return;
    
    update();
    render();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    game.frameCount++;
    game.gameTime = game.frameCount / 60;
    
    // Player movement
    updatePlayerMovement();
    updatePlayerPosition();
    
    // Player in zone damage
    const playerDistToZone = Math.hypot(
        game.player.x - game.zone.x,
        game.player.y - game.zone.y
    );
    
    if (playerDistToZone > game.zone.radius) {
        game.player.health -= ZONE_DAMAGE;
    }
    
    // Start zone shrink at 60 seconds
    if (game.gameTime > 60 && !game.zone.shrinking) {
        game.zone.shrinking = true;
        game.zone.shrinkStartFrame = game.frameCount;
    }
    
    // Shrink zone
    if (game.zone.shrinking) {
        const shrinkProgress = (game.frameCount - game.zone.shrinkStartFrame) / 300;
        game.zone.radius = Math.max(
            FINAL_ZONE_RADIUS,
            ZONE_START_RADIUS * Math.pow(ZONE_SHRINK_RATE, game.frameCount - game.zone.shrinkStartFrame)
        );
    }
    
    // Update enemies
    game.enemies = game.enemies.filter(enemy => enemy.health > 0);
    
    game.enemies.forEach(enemy => {
        updateEnemy(enemy);
    });
    
    // Item pickups
    for (let i = game.items.length - 1; i >= 0; i--) {
        const item = game.items[i];
        
        // Player pickup
        const playerDist = Math.hypot(item.x - game.player.x, item.y - game.player.y);
        if (playerDist < PLAYER_SIZE + ITEM_SIZE + 10) {
            pickupItem(item);
            game.items.splice(i, 1);
            continue;
        }
        
        // Enemy pickup
        game.enemies.forEach(enemy => {
            const enemyDist = Math.hypot(item.x - enemy.x, item.y - enemy.y);
            if (enemyDist < ENEMY_SIZE + ITEM_SIZE + 10) {
                enemy.health = Math.min(enemy.health + 15, 30);
                if (item.type === 'ammo') enemy.ammo = Math.min(enemy.ammo + 10, 30);
                game.items.splice(i, 1);
            }
        });
    }
    
    // Spawn new items occasionally
    if (game.frameCount % 120 === 0 && game.items.length < 20) {
        spawnItem();
    }
    
    // Check game over
    if (game.player.health <= 0) {
        endGame(false);
    }
    
    // Check victory
    if (game.enemies.length === 0 && game.frameCount > 120) {
        endGame(true);
    }
    
    // Update camera
    game.camera.x = game.player.x - CANVAS_WIDTH / 2;
    game.camera.y = game.player.y - CANVAS_HEIGHT / 2;
}

function updatePlayerMovement() {
    const speed = 5;
    let moveX = 0;
    let moveY = 0;
    
    // Keyboard controls
    if (game.keys['w'] || game.keys['arrowup']) moveY -= speed;
    if (game.keys['s'] || game.keys['arrowdown']) moveY += speed;
    if (game.keys['a'] || game.keys['arrowleft']) moveX -= speed;
    if (game.keys['d'] || game.keys['arrowright']) moveX += speed;
    
    // Mobile joystick
    moveX += game.joystick.x * speed;
    moveY += game.joystick.y * speed;
    
    game.player.vx = moveX;
    game.player.vy = moveY;
    
    // Attack
    if (game.keys[' ']) {
        playerAttack();
    }
    
    // Pickup
    if (game.keys['e']) {
        playerPickup();
    }
}

function updatePlayerPosition() {
    game.player.x += game.player.vx;
    game.player.y += game.player.vy;
    
    // Boundary
    game.player.x = Math.max(PLAYER_SIZE, Math.min(GAME_WIDTH - PLAYER_SIZE, game.player.x));
    game.player.y = Math.max(PLAYER_SIZE, Math.min(GAME_HEIGHT - PLAYER_SIZE, game.player.y));
}

function updateEnemy(enemy) {
    const speed = 2.5;
    enemy.behaviorTimer++;
    
    // Change behavior occasionally
    if (enemy.behaviorTimer > 120) {
        enemy.behavior = Math.random() > 0.5 ? 'hunt' : 'wander';
        enemy.behaviorTimer = 0;
    }
    
    // Avoid zone
    const distToZone = Math.hypot(enemy.x - game.zone.x, enemy.y - game.zone.y);
    if (distToZone > game.zone.radius - 100) {
        const angle = Math.atan2(game.zone.y - enemy.y, game.zone.x - enemy.x);
        enemy.targetX = enemy.x + Math.cos(angle) * 200;
        enemy.targetY = enemy.y + Math.sin(angle) * 200;
    }
    
    // AI behavior
    if (enemy.behavior === 'hunt') {
        const playerDist = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
        if (playerDist < 400) {
            enemy.targetX = game.player.x;
            enemy.targetY = game.player.y;
            
            // Attack
            if (playerDist < ATTACK_RANGE && enemy.ammo > 0 && Date.now() - enemy.lastAttack > ATTACK_COOLDOWN) {
                enemyAttack(enemy);
            }
        }
    } else {
        if (enemy.behaviorTimer % 30 === 0) {
            enemy.targetX = Math.random() * GAME_WIDTH;
            enemy.targetY = Math.random() * GAME_HEIGHT;
        }
    }
    
    // Move towards target
    const dx = enemy.targetX - enemy.x;
    const dy = enemy.targetY - enemy.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 5) {
        enemy.vx = (dx / dist) * speed;
        enemy.vy = (dy / dist) * speed;
    } else {
        enemy.vx = 0;
        enemy.vy = 0;
    }
    
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    
    // Boundary
    enemy.x = Math.max(ENEMY_SIZE, Math.min(GAME_WIDTH - ENEMY_SIZE, enemy.x));
    enemy.y = Math.max(ENEMY_SIZE, Math.min(GAME_HEIGHT - ENEMY_SIZE, enemy.y));
}

function playerAttack() {
    if (game.player.ammo <= 0 || Date.now() - game.player.lastAttack < ATTACK_COOLDOWN) return;
    
    game.player.lastAttack = Date.now();
    game.player.ammo -= AMMO_PER_ATTACK;
    
    // Check hits
    game.enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
        if (dist < ATTACK_RANGE) {
            enemy.health -= ATTACK_DAMAGE;
            if (enemy.health <= 0) {
                game.kills++;
            }
        }
    });
}

function enemyAttack(enemy) {
    enemy.lastAttack = Date.now();
    enemy.ammo -= 1;
    
    const dist = Math.hypot(game.player.x - enemy.x, game.player.y - enemy.y);
    if (dist < ATTACK_RANGE) {
        game.player.health -= 5;
    }
}

function playerPickup() {
    game.items.forEach((item, index) => {
        const dist = Math.hypot(item.x - game.player.x, item.y - game.player.y);
        if (dist < PLAYER_SIZE + ITEM_SIZE + 30) {
            pickupItem(item);
            game.items.splice(index, 1);
        }
    });
}

function pickupItem(item) {
    if (item.type === 'health') {
        game.player.health = Math.min(game.player.health + item.value, MAX_HEALTH);
    } else if (item.type === 'ammo') {
        game.player.ammo = Math.min(game.player.ammo + item.value, MAX_AMMO);
    }
}

function render() {
    // Clear canvas
    game.ctx.fillStyle = '#0f3460';
    game.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw zone
    const zoneScreenX = game.zone.x - game.camera.x;
    const zoneScreenY = game.zone.y - game.camera.y;
    
    // Safe zone
    game.ctx.fillStyle = 'rgba(0, 200, 0, 0.1)';
    game.ctx.beginPath();
    game.ctx.arc(zoneScreenX, zoneScreenY, game.zone.radius, 0, Math.PI * 2);
    game.ctx.fill();
    
    game.ctx.strokeStyle = 'rgba(0, 200, 0, 0.5)';
    game.ctx.lineWidth = 2;
    game.ctx.stroke();
    
    // Danger zone
    game.ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
    game.ctx.beginPath();
    game.ctx.arc(zoneScreenX, zoneScreenY, GAME_WIDTH, 0, Math.PI * 2);
    game.ctx.fill();
    
    game.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    game.ctx.lineWidth = 3;
    game.ctx.beginPath();
    game.ctx.arc(zoneScreenX, zoneScreenY, game.zone.radius, 0, Math.PI * 2);
    game.ctx.stroke();
    
    // Draw items
    game.items.forEach(item => {
        const screenX = item.x - game.camera.x;
        const screenY = item.y - game.camera.y;
        
        game.ctx.fillStyle = item.color;
        game.ctx.beginPath();
        game.ctx.arc(screenX, screenY, item.size, 0, Math.PI * 2);
        game.ctx.fill();
        
        game.ctx.strokeStyle = '#fff';
        game.ctx.lineWidth = 1;
        game.ctx.stroke();
    });
    
    // Draw player
    const playerScreenX = game.player.x - game.camera.x;
    const playerScreenY = game.player.y - game.camera.y;
    
    game.ctx.fillStyle = game.player.color;
    game.ctx.beginPath();
    game.ctx.arc(playerScreenX, playerScreenY, game.player.size, 0, Math.PI * 2);
    game.ctx.fill();
    
    game.ctx.strokeStyle = '#fff';
    game.ctx.lineWidth = 2;
    game.ctx.stroke();
    
    // Draw enemies
    game.enemies.forEach(enemy => {
        const screenX = enemy.x - game.camera.x;
        const screenY = enemy.y - game.camera.y;
        
        game.ctx.fillStyle = enemy.color;
        game.ctx.beginPath();
        game.ctx.arc(screenX, screenY, enemy.size, 0, Math.PI * 2);
        game.ctx.fill();
        
        game.ctx.strokeStyle = '#fff';
        game.ctx.lineWidth = 1.5;
        game.ctx.stroke();
        
        // Health bar
        const healthPercent = enemy.health / 30;
        game.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffcc00' : '#ff3333';
        game.ctx.fillRect(screenX - 15, screenY - 25, 30 * healthPercent, 3);
        game.ctx.strokeStyle = '#fff';
        game.ctx.strokeRect(screenX - 15, screenY - 25, 30, 3);
    });
    
    // Update HUD
    updateHUD();
}

function updateHUD() {
    const healthPercent = (game.player.health / MAX_HEALTH) * 100;
    const ammoPercent = (game.player.ammo / MAX_AMMO) * 100;
    
    document.getElementById('healthBar').style.width = Math.max(0, healthPercent) + '%';
    document.getElementById('healthText').textContent = Math.max(0, Math.ceil(game.player.health)) + '/' + MAX_HEALTH;
    
    document.getElementById('ammoBar').style.width = ammoPercent + '%';
    document.getElementById('ammoText').textContent = game.player.ammo + '/' + MAX_AMMO;
    
    document.getElementById('enemyCount').textContent = game.enemies.length;
    
    // Zone warning
    const playerDistToZone = Math.hypot(
        game.player.x - game.zone.x,
        game.player.y - game.zone.y
    );
    
    const zoneWarning = document.querySelector('.zone-warning');
    if (playerDistToZone > game.zone.radius) {
        zoneWarning.classList.add('active');
        zoneWarning.textContent = '⚠️ DANGER ZONE!\nMove to safety!';
    } else if (playerDistToZone > game.zone.radius - 150) {
        zoneWarning.classList.add('active');
        zoneWarning.textContent = '⚠️ Zone shrinking soon!';
    } else {
        zoneWarning.classList.remove('active');
    }
}

function endGame(victory) {
    game.running = false;
    
    if (victory) {
        document.getElementById('victoryStats').textContent = 
            `Time: ${Math.floor(game.gameTime)}s | Kills: ${game.kills} | Final Health: ${Math.ceil(game.player.health)}`;
        showScreen('victoryScreen');
    } else {
        document.getElementById('gameOverMessage').textContent = 
            game.enemies.length > 0 ? 'Defeated by enemies!' : 'Caught in the zone!';
        document.getElementById('finalStats').textContent = 
            `Time: ${Math.floor(game.gameTime)}s | Kills: ${game.kills} | Enemies Left: ${game.enemies.length}`;
        showScreen('gameOverScreen');
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function hideScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}