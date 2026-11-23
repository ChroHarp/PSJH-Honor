/**
 * 平興數枝扭蛋機 - 45度 HD-2D 復古雜貨店像素引擎 & 8-bit 音效模組
 */
(function () {
    const LOGICAL_W = 240;
    const LOGICAL_H = 180;

    // 8-bit Web Audio 音效合成器
    class RetroAudio {
        constructor() {
            this.ctx = null;
            this.muted = false;
        }
        ensureCtx() {
            if (this.muted) return null;
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return this.ctx;
        }
        playTone(freq, duration, type = 'square', volume = 0.08, delay = 0) {
            const ctx = this.ensureCtx();
            if (!ctx) return;
            const now = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
        }
        playCrank() {
            for (let i = 0; i < 6; i++) {
                this.playTone(220 + i * 35, 0.05, 'square', 0.06, i * 0.16);
                this.playTone(150, 0.04, 'triangle', 0.07, i * 0.16 + 0.08);
            }
        }
        playDrop() {
            this.playTone(520, 0.08, 'triangle', 0.1, 0);
            this.playTone(340, 0.09, 'triangle', 0.1, 0.12);
            this.playTone(680, 0.1, 'square', 0.07, 0.28);
        }
        playFanfare() {
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((n, idx) => {
                this.playTone(n, idx === 3 ? 0.35 : 0.11, 'square', 0.07, idx * 0.1);
            });
        }
    }

    // 45度等角投影 (2:1 Isometric)
    function isoProject(gx, gy, gz, originX, originY) {
        return {
            x: Math.round(originX + (gx - gy)),
            y: Math.round(originY + (gx + gy) * 0.5 - gz)
        };
    }

    function drawIsoPolygon(ctx, pts, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // 繪製 45度等角立體方塊
    function drawIsoBox(ctx, ox, oy, x, y, z, w, d, h, colTop, colLeft, colRight, outline = '#3a2214') {
        const p000 = isoProject(x, y, z, ox, oy);
        const p100 = isoProject(x + w, y, z, ox, oy);
        const p110 = isoProject(x + w, y + d, z, ox, oy);
        const p010 = isoProject(x, y + d, z, ox, oy);

        const p001 = isoProject(x, y, z + h, ox, oy);
        const p101 = isoProject(x + w, y, z + h, ox, oy);
        const p111 = isoProject(x + w, y + d, z + h, ox, oy);
        const p011 = isoProject(x, y + d, z + h, ox, oy);

        drawIsoPolygon(ctx, [p010, p110, p111, p011], colLeft, outline);
        drawIsoPolygon(ctx, [p110, p100, p101, p111], colRight, outline);
        drawIsoPolygon(ctx, [p001, p101, p111, p011], colTop, outline);
    }

    // 繪製像素風小扭蛋球
    function drawPixelCapsule(ctx, cx, cy, r, topColor, bottomColor = '#fffaf0') {
        const ir = Math.round(r);
        ctx.fillStyle = '#3a2214';
        ctx.fillRect(cx - ir - 1, cy - ir, ir * 2 + 2, ir * 2);
        ctx.fillRect(cx - ir, cy - ir - 1, ir * 2, ir * 2 + 2);

        ctx.fillStyle = topColor;
        ctx.fillRect(cx - ir, cy - ir, ir * 2, ir);
        ctx.fillStyle = bottomColor;
        ctx.fillRect(cx - ir, cy, ir * 2, ir);
        ctx.fillStyle = '#5c3c28';
        ctx.fillRect(cx - ir, cy, ir * 2, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - ir + 1, cy - ir + 1, Math.max(1, Math.floor(ir / 2)), 1);
    }

    class GachaScene {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = LOGICAL_W;
            this.canvas.height = LOGICAL_H;
            this.ctx.imageSmoothingEnabled = false;

            this.audio = new RetroAudio();
            this.state = 'idle';
            this.stateTimer = 0;
            this.crankAngle = 0;
            this.shakeOffset = { x: 0, y: 0 };
            this.onBurstComplete = null;
            this.elapsed = 0;

            const colors = ['#e04f33', '#234b8c', '#f5b841', '#3f915b', '#d96b98', '#ff8547'];
            this.domeBalls = Array.from({ length: 11 }, (_, i) => ({
                baseX: -12 + (i % 4) * 7 + ((i * 3) % 5 - 2),
                baseY: -6 + Math.floor(i / 4) * 5,
                x: 0,
                y: 0,
                color: colors[i % colors.length],
                phase: i * 0.7
            }));

            this.dropBall = { x: 0, y: 0, z: 0, color: '#e04f33', visible: false };

            // 溫暖店鋪裡的金色微塵
            this.dustMotes = Array.from({ length: 20 }, () => ({
                x: Math.random() * LOGICAL_W,
                y: Math.random() * LOGICAL_H,
                speedY: -0.05 - Math.random() * 0.1,
                speedX: 0.04 + Math.random() * 0.07,
                alpha: 0.25 + Math.random() * 0.45,
                size: Math.random() > 0.7 ? 2 : 1
            }));

            this.sparkles = [];
            this.lastTime = performance.now();
            this.loop = this.loop.bind(this);
            requestAnimationFrame(this.loop);
        }

        triggerDraw(onComplete) {
            if (this.state !== 'idle') return false;
            this.state = 'cranking';
            this.stateTimer = 0;
            this.onBurstComplete = onComplete;
            const colors = ['#e04f33', '#234b8c', '#f5b841', '#3f915b'];
            this.dropBall.color = colors[Math.floor(Math.random() * colors.length)];
            this.dropBall.visible = false;
            this.sparkles = [];
            this.audio.playCrank();
            return true;
        }

        spawnSparkles(cx, cy) {
            const cols = ['#ffe394', '#f5b841', '#ff8566', '#ffffff', '#6cc78a'];
            for (let i = 0; i < 24; i++) {
                const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.2;
                const speed = 0.8 + Math.random() * 2.1;
                this.sparkles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 0.6,
                    life: 1,
                    color: cols[i % cols.length],
                    size: Math.random() > 0.5 ? 2 : 1
                });
            }
        }

        update(dt) {
            this.elapsed += dt;

            for (const m of this.dustMotes) {
                m.x += m.speedX;
                m.y += m.speedY;
                if (m.y < 0) m.y = LOGICAL_H;
                if (m.x > LOGICAL_W) m.x = 0;
            }

            for (let i = this.sparkles.length - 1; i >= 0; i--) {
                const s = this.sparkles[i];
                s.x += s.vx;
                s.y += s.vy;
                s.vy += 0.05;
                s.life -= 0.025;
                if (s.life <= 0) this.sparkles.splice(i, 1);
            }

            this.stateTimer += dt;

            if (this.state === 'cranking') {
                this.crankAngle += dt * 0.011;
                this.shakeOffset.x = Math.round(Math.sin(this.stateTimer * 0.06) * 1.5);
                this.shakeOffset.y = Math.round(Math.cos(this.stateTimer * 0.08) * 1);

                for (const b of this.domeBalls) {
                    b.x = b.baseX + Math.sin(this.stateTimer * 0.02 + b.phase) * 5;
                    b.y = b.baseY - Math.abs(Math.cos(this.stateTimer * 0.025 + b.phase)) * 11;
                }

                if (this.stateTimer >= 1350) {
                    this.state = 'dropping';
                    this.stateTimer = 0;
                    this.shakeOffset = { x: 0, y: 0 };
                    this.dropBall.visible = true;
                    this.dropBall.x = 0;
                    this.dropBall.y = 0;
                    this.dropBall.z = 16;
                    this.audio.playDrop();
                }
            } else if (this.state === 'dropping') {
                const t = Math.min(1, this.stateTimer / 850);
                this.dropBall.y = t * 30;
                if (t < 0.45) {
                    const p = t / 0.45;
                    this.dropBall.z = 16 * (1 - p * p);
                } else if (t < 0.75) {
                    const p = (t - 0.45) / 0.3;
                    this.dropBall.z = Math.sin(p * Math.PI) * 9;
                } else {
                    const p = (t - 0.75) / 0.25;
                    this.dropBall.z = Math.sin(p * Math.PI) * 4;
                }

                if (this.stateTimer >= 900) {
                    this.state = 'burst';
                    this.stateTimer = 0;
                    const ballPos = isoProject(0 + this.dropBall.x, 18 + this.dropBall.y, 4, 120, 122);
                    this.spawnSparkles(ballPos.x, ballPos.y);
                    this.audio.playFanfare();
                }
            } else if (this.state === 'burst') {
                if (this.stateTimer >= 420) {
                    const cb = this.onBurstComplete;
                    this.onBurstComplete = null;
                    this.state = 'idle';
                    this.dropBall.visible = false;
                    if (cb) cb();
                }
            } else {
                for (const b of this.domeBalls) {
                    b.x = b.baseX;
                    b.y = b.baseY;
                }
            }
        }

        // 繪製溫暖雜貨店 45° 背景牆面、木地板與門簾
        drawStoreBackdrop(ctx) {
            // 暖陽米黃色背景牆
            ctx.fillStyle = '#f2dec0';
            ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

            // 45度等角雜貨店紅磚/暖木磁磚地板
            const tileSize = 18;
            const ox = 120;
            const oy = 66;
            for (let gx = -6; gx <= 6; gx++) {
                for (let gy = -6; gy <= 6; gy++) {
                    const p0 = isoProject(gx * tileSize, gy * tileSize, 0, ox, oy);
                    const p1 = isoProject((gx + 1) * tileSize, gy * tileSize, 0, ox, oy);
                    const p2 = isoProject((gx + 1) * tileSize, (gy + 1) * tileSize, 0, ox, oy);
                    const p3 = isoProject(gx * tileSize, (gy + 1) * tileSize, 0, ox, oy);

                    const isEven = (gx + gy) % 2 === 0;
                    const col = isEven ? '#e3c096' : '#cfa272';
                    drawIsoPolygon(ctx, [p0, p1, p2, p3], col, '#b88856');
                }
            }

            // 後方左側木質牆板 (45度壁面)
            const wL0 = isoProject(-95, -62, 0, ox, oy);
            const wL1 = isoProject(10, -62, 0, ox, oy);
            const wL2 = isoProject(10, -62, 95, ox, oy);
            const wL3 = isoProject(-95, -62, 95, ox, oy);
            drawIsoPolygon(ctx, [wL0, wL1, wL2, wL3], '#e8cfa6', '#7a451d');

            // 後方右側木質牆板
            const wR0 = isoProject(10, -62, 0, ox, oy);
            const wR1 = isoProject(95, -62, 0, ox, oy);
            const wR2 = isoProject(95, -62, 95, ox, oy);
            const wR3 = isoProject(10, -62, 95, ox, oy);
            drawIsoPolygon(ctx, [wR0, wR1, wR2, wR3], '#d9b98b', '#7a451d');

            // 牆面木頭腰板 (下半部深木色)
            const dL0 = isoProject(-95, -62, 0, ox, oy);
            const dL1 = isoProject(95, -62, 0, ox, oy);
            const dL2 = isoProject(95, -62, 24, ox, oy);
            const dL3 = isoProject(-95, -62, 24, ox, oy);
            drawIsoPolygon(ctx, [dL0, dL1, dL2, dL3], '#9c5c2e', '#3a2214');

            // 機台下方復古紅金編織墊
            const r = 30;
            const rp0 = isoProject(-r, -r + 12, 0.5, 120, 122);
            const rp1 = isoProject(r, -r + 12, 0.5, 120, 122);
            const rp2 = isoProject(r, r + 16, 0.5, 120, 122);
            const rp3 = isoProject(-r, r + 16, 0.5, 120, 122);
            drawIsoPolygon(ctx, [rp0, rp1, rp2, rp3], '#b83227', '#f5b841');
        }

        // 繪製雜貨店旁邊的背景物 (木櫃、糖果罐、飲料箱、盆栽、暖燈籠)
        drawStoreProps(ctx) {
            const ox = 120;
            const oy = 122;

            // --- 左側背景物：復古木頭零食櫃 + 玻璃糖果罐 ---
            drawIsoBox(ctx, ox, oy, -68, -42, 0, 26, 20, 28, '#d99b52', '#b87333', '#7a451d');
            // 櫃子上的兩個玻璃糖果罐
            const jar1 = isoProject(-58, -32, 28, ox, oy);
            ctx.fillStyle = 'rgba(180, 230, 245, 0.75)';
            ctx.fillRect(jar1.x - 5, jar1.y - 12, 10, 12);
            ctx.strokeStyle = '#3a2214';
            ctx.strokeRect(jar1.x - 5.5, jar1.y - 12.5, 11, 13);
            ctx.fillStyle = '#e04f33';
            ctx.fillRect(jar1.x - 4, jar1.y - 14, 8, 2); // 紅蓋子
            // 罐內彩色糖果像素
            ctx.fillStyle = '#f5b841'; ctx.fillRect(jar1.x - 3, jar1.y - 5, 2, 2);
            ctx.fillStyle = '#e04f33'; ctx.fillRect(jar1.x, jar1.y - 7, 2, 2);
            ctx.fillStyle = '#3f915b'; ctx.fillRect(jar1.x + 1, jar1.y - 4, 2, 2);

            const jar2 = isoProject(-45, -34, 28, ox, oy);
            ctx.fillStyle = 'rgba(180, 230, 245, 0.75)';
            ctx.fillRect(jar2.x - 4, jar2.y - 10, 8, 10);
            ctx.strokeStyle = '#3a2214';
            ctx.strokeRect(jar2.x - 4.5, jar2.y - 10.5, 9, 11);
            ctx.fillStyle = '#234b8c';
            ctx.fillRect(jar2.x - 3, jar2.y - 12, 6, 2); // 藍蓋子
            ctx.fillStyle = '#ff85a1'; ctx.fillRect(jar2.x - 2, jar2.y - 5, 2, 2);
            ctx.fillStyle = '#ffe394'; ctx.fillRect(jar2.x + 1, jar2.y - 6, 2, 2);

            // 左前方小木箱
            drawIsoBox(ctx, ox, oy, -72, -10, 0, 16, 16, 12, '#e3b276', '#c48a47', '#8a5422');

            // --- 右側背景物：飲料木箱 + 彈珠汽水瓶 + 綠色盆栽 ---
            drawIsoBox(ctx, ox, oy, 40, -34, 0, 24, 18, 14, '#c48a47', '#9c5c2e', '#6e3d1a');
            // 箱子裡的彈珠汽水 / 玻璃瓶
            const bottles = [
                isoProject(46, -26, 14, ox, oy),
                isoProject(52, -26, 14, ox, oy),
                isoProject(58, -26, 14, ox, oy)
            ];
            bottles.forEach((bp, i) => {
                ctx.fillStyle = i === 1 ? '#3f915b' : '#4a8be8';
                ctx.fillRect(bp.x - 2, bp.y - 9, 4, 9);
                ctx.fillStyle = '#fff8eb';
                ctx.fillRect(bp.x - 1, bp.y - 11, 2, 2);
            });

            // 右前方陶土盆栽
            drawIsoBox(ctx, ox, oy, 48, 2, 0, 14, 14, 12, '#c9623b', '#a84725', '#782e15');
            const plantBase = isoProject(55, 9, 12, ox, oy);
            ctx.fillStyle = '#26633b';
            ctx.fillRect(plantBase.x - 7, plantBase.y - 12, 14, 10);
            ctx.fillStyle = '#3f915b';
            ctx.fillRect(plantBase.x - 5, plantBase.y - 16, 10, 8);
            ctx.fillStyle = '#6cc78a';
            ctx.fillRect(plantBase.x - 3, plantBase.y - 18, 5, 4);

            // 右上角微晃的雜貨店暖黃紙燈籠
            const sway = Math.round(Math.sin(this.elapsed * 0.0025) * 1.5);
            const lx = 208 + sway;
            const ly = 26;
            ctx.strokeStyle = '#3a2214';
            ctx.beginPath();
            ctx.moveTo(208, 0);
            ctx.lineTo(lx, ly - 10);
            ctx.stroke();
            ctx.fillStyle = '#f5b841';
            ctx.fillRect(lx - 8, ly - 9, 16, 18);
            ctx.strokeStyle = '#3a2214';
            ctx.strokeRect(lx - 8.5, ly - 9.5, 17, 19);
            ctx.fillStyle = '#e04f33';
            ctx.fillRect(lx - 5, ly - 11, 10, 2);
            ctx.fillRect(lx - 5, ly + 9, 10, 2);
            // 燈籠暖光點
            ctx.fillStyle = '#fff5cc';
            ctx.fillRect(lx - 4, ly - 5, 4, 8);
        }

        drawMachine(ctx) {
            const ox = 120 + this.shakeOffset.x;
            const oy = 122 + this.shakeOffset.y;

            // 地面投射陰影
            const sp0 = isoProject(-16, -16, 0.6, 126, 125);
            const sp1 = isoProject(22, -16, 0.6, 126, 125);
            const sp2 = isoProject(22, 22, 0.6, 126, 125);
            const sp3 = isoProject(-16, 22, 0.6, 126, 125);
            drawIsoPolygon(ctx, [sp0, sp1, sp2, sp3], 'rgba(58, 34, 20, 0.35)', null);

            // 1. 底座
            drawIsoBox(ctx, ox, oy, -18, -18, 0, 36, 36, 8, '#6e503c', '#523828', '#382418');

            // 2. 下層主機身 (經典復古紅)
            drawIsoBox(ctx, ox, oy, -16, -16, 8, 32, 32, 34, '#ff7452', '#e04f33', '#a83019');

            // 出蛋口
            const ch0 = isoProject(-6, 16.2, 10, ox, oy);
            const ch1 = isoProject(6, 16.2, 10, ox, oy);
            const ch2 = isoProject(6, 16.2, 21, ox, oy);
            const ch3 = isoProject(-6, 16.2, 21, ox, oy);
            drawIsoPolygon(ctx, [ch0, ch1, ch2, ch3], '#2c1a0e', '#f5b841');

            // 米白金屬銘牌
            const plate0 = isoProject(-11, 16.2, 25, ox, oy);
            const plate1 = isoProject(11, 16.2, 25, ox, oy);
            const plate2 = isoProject(11, 16.2, 37, ox, oy);
            const plate3 = isoProject(-11, 16.2, 37, ox, oy);
            drawIsoPolygon(ctx, [plate0, plate1, plate2, plate3], '#fbf4e4', '#3a2214');

            // 旋轉把手
            const knobCenter = isoProject(0, 17, 31, ox, oy);
            ctx.fillStyle = '#f5b841';
            ctx.fillRect(knobCenter.x - 4, knobCenter.y - 4, 8, 8);
            ctx.strokeStyle = '#3a2214';
            ctx.strokeRect(knobCenter.x - 4.5, knobCenter.y - 4.5, 9, 9);

            const dx = Math.round(Math.cos(this.crankAngle) * 5);
            const dy = Math.round(Math.sin(this.crankAngle) * 3);
            ctx.strokeStyle = '#3a2214';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(knobCenter.x - dx, knobCenter.y - dy);
            ctx.lineTo(knobCenter.x + dx, knobCenter.y + dy);
            ctx.stroke();
            ctx.strokeStyle = '#ffe394';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(knobCenter.x - dx, knobCenter.y - dy);
            ctx.lineTo(knobCenter.x + dx, knobCenter.y + dy);
            ctx.stroke();

            // 3. 金色腰帶環
            drawIsoBox(ctx, ox, oy, -17, -17, 42, 34, 34, 5, '#ffe08a', '#f5b841', '#c48414');

            // 4. 玻璃展示櫃
            drawIsoBox(ctx, ox, oy, -15, -15, 47, 30, 30, 34, 'rgba(215,245,255,0.45)', 'rgba(170,220,245,0.32)', 'rgba(120,175,210,0.35)', '#4a6b82');

            const domeCenter = isoProject(0, 0, 56, ox, oy);
            for (const b of this.domeBalls) {
                drawPixelCapsule(
                    ctx,
                    Math.round(domeCenter.x + b.x),
                    Math.round(domeCenter.y + b.y),
                    3,
                    b.color
                );
            }

            // 玻璃反光
            const gl0 = isoProject(-12, 15.2, 52, ox, oy);
            const gl1 = isoProject(-9, 15.2, 76, ox, oy);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(gl0.x, gl0.y);
            ctx.lineTo(gl1.x, gl1.y);
            ctx.stroke();

            // 5. 頂蓋
            drawIsoBox(ctx, ox, oy, -16, -16, 81, 32, 32, 6, '#ff7452', '#e04f33', '#a83019');
            drawIsoBox(ctx, ox, oy, -7, -7, 87, 14, 14, 4, '#ffe08a', '#f5b841', '#c48414');
        }

        drawDropBall(ctx) {
            if (!this.dropBall.visible) return;
            const pos = isoProject(0 + this.dropBall.x, 18 + this.dropBall.y, this.dropBall.z, 120, 122);
            const shadowPos = isoProject(0 + this.dropBall.x, 18 + this.dropBall.y, 0.5, 120, 122);
            ctx.fillStyle = 'rgba(58, 34, 20, 0.35)';
            ctx.fillRect(shadowPos.x - 5, shadowPos.y - 2, 10, 4);
            drawPixelCapsule(ctx, pos.x, pos.y - 4, 6, this.dropBall.color);
        }

        drawHD2DEffects(ctx) {
            for (const m of this.dustMotes) {
                ctx.fillStyle = `rgba(255, 248, 215, ${m.alpha})`;
                ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
            }
            for (const s of this.sparkles) {
                ctx.globalAlpha = Math.max(0, s.life);
                ctx.fillStyle = s.color;
                ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
            }
            ctx.globalAlpha = 1;
        }

        loop(now) {
            const dt = Math.min(50, now - this.lastTime);
            this.lastTime = now;

            this.update(dt);

            const ctx = this.ctx;
            this.drawStoreBackdrop(ctx);
            this.drawStoreProps(ctx);
            this.drawMachine(ctx);
            this.drawDropBall(ctx);
            this.drawHD2DEffects(ctx);

            requestAnimationFrame(this.loop);
        }
    }

    window.GachaScene = GachaScene;
})();
