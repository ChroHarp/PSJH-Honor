/**
 * 平興數枝扭蛋機 - 傳統柑仔店開放陳列 溫暖水彩 3D 場景引擎 (Three.js) & 音效模組
 */
(function () {
    const CAPSULE_COLORS = [
        0xe62929, // 鮮朱紅
        0x1c64d1, // 寶石藍
        0xffbe0b, // 明亮金黃
        0x1ea85a, // 翠綠
        0xe84393, // 桃粉
        0xff7b00, // 鮮橙橘
        0x7c3aed  // 葡萄紫
    ];

    // 溫暖木琴風 Web Audio 音效合成器
    class CozyAudio {
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
        playTone(freq, duration, type = 'triangle', volume = 0.08, delay = 0) {
            const ctx = this.ensureCtx();
            if (!ctx) return;
            const now = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(volume, now + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration + 0.02);
        }
        playCrank() {
            for (let i = 0; i < 6; i++) {
                this.playTone(210 + i * 32, 0.07, 'triangle', 0.07, i * 0.17);
                this.playTone(145, 0.05, 'sine', 0.06, i * 0.17 + 0.08);
            }
        }
        playDrop() {
            this.playTone(523.25, 0.1, 'sine', 0.1, 0);
            this.playTone(392.0, 0.11, 'triangle', 0.09, 0.14);
            this.playTone(659.25, 0.14, 'sine', 0.09, 0.3);
        }
        playFanfare() {
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((n, idx) => {
                const dur = idx === 3 ? 0.45 : 0.14;
                this.playTone(n, dur, 'triangle', 0.08, idx * 0.095);
                this.playTone(n * 2, dur * 0.7, 'sine', 0.03, idx * 0.095);
            });
        }
    }

    // 4 階水彩 Toon 漸層貼圖（加深陰影層次，使紅色機身與彩色糖果更飽和鮮豔）
    function createToonGradientMap(THREE) {
        const data = new Uint8Array([
            92, 92, 92, 255,
            148, 148, 148, 255,
            208, 208, 208, 255,
            255, 255, 255, 255
        ]);
        const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;
        return tex;
    }

    // 程序化生成溫暖水彩筆觸與紙紋貼圖
    function createWatercolorTexture(THREE, baseColor, accentColor, pattern = 'wash', labelText = '') {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, size, size);

        // 水彩暈染筆觸
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 24 + Math.random() * 54;
            const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
            const col = i % 3 === 0 ? accentColor : (i % 2 === 0 ? 'rgba(255,250,238,0.12)' : 'rgba(92,54,28,0.10)');
            grad.addColorStop(0, col);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (pattern === 'wood') {
            ctx.strokeStyle = 'rgba(64, 34, 14, 0.22)';
            for (let y = 0; y < size; y += 32) {
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(size, y);
                ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(96, 52, 22, 0.18)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 22; i++) {
                const y = Math.random() * size;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 9, size * 0.7, y + (Math.random() - 0.5) * 9, size, y);
                ctx.stroke();
            }
        } else if (pattern === 'rug') {
            ctx.strokeStyle = '#ffbe0b';
            ctx.lineWidth = 14;
            ctx.strokeRect(18, 18, size - 36, size - 36);
            ctx.strokeStyle = '#ffe5a3';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 6]);
            ctx.strokeRect(32, 32, size - 64, size - 64);
            ctx.setLineDash([]);
        } else if (pattern === 'striped') {
            ctx.fillStyle = accentColor;
            for (let x = 0; x < size; x += 32) {
                ctx.fillRect(x, 0, 16, size);
            }
        } else if (pattern === 'snack') {
            ctx.fillStyle = accentColor;
            ctx.fillRect(0, 0, size, 48);
            ctx.fillRect(0, size - 38, size, 38);
            ctx.fillStyle = '#fff9ec';
            ctx.fillRect(26, 70, size - 52, 102);
            ctx.strokeStyle = '#4a2c1a';
            ctx.lineWidth = 5;
            ctx.strokeRect(26, 70, size - 52, 102);
            ctx.fillStyle = accentColor;
            for (let d = 0; d < 5; d++) {
                ctx.beginPath();
                ctx.arc(52 + d * 38, 121, 10, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (pattern === 'lollipop') {
            ctx.translate(size / 2, size / 2);
            for (let a = 0; a < 180; a++) {
                const ang = a * 0.18;
                const rad = a * 0.68;
                ctx.fillStyle = a % 10 < 5 ? accentColor : '#fffdf7';
                ctx.beginPath();
                ctx.arc(Math.cos(ang) * rad, Math.sin(ang) * rad, 11, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else if (pattern === 'vbanner') {
            ctx.strokeStyle = '#ffdf8c';
            ctx.lineWidth = 8;
            ctx.strokeRect(14, 14, size - 28, size - 28);
            ctx.fillStyle = '#fff9ec';
            ctx.font = 'bold 44px "Noto Sans TC", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const chars = (labelText || '懷舊童玩').split('');
            chars.forEach((ch, idx) => {
                ctx.fillText(ch, size / 2, 54 + idx * 50);
            });
        }

        // 水彩細微紙張顆粒
        for (let i = 0; i < 420; i++) {
            ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(60,35,18,0.04)';
            ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    // 繪製復古柑仔店琺瑯／鐵牌招牌貼圖
    function createVintageSignTexture(THREE, bgColor, rimColor, title, subText, isRound = false) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);

        // 水彩仿舊斑駁感
        for (let i = 0; i < 18; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 16 + Math.random() * 34;
            const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
            grad.addColorStop(0, 'rgba(130, 82, 42, 0.14)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (isRound) {
            ctx.strokeStyle = rimColor;
            ctx.lineWidth = 18;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size * 0.43, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#3a2214';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.strokeStyle = rimColor;
            ctx.lineWidth = 16;
            ctx.strokeRect(12, 12, size - 24, size - 24);
            ctx.fillStyle = rimColor;
            ctx.fillRect(12, size - 78, size - 24, 66);
        }

        ctx.fillStyle = isRound ? '#2c1a0e' : '#3a2214';
        ctx.font = 'bold 54px "Noto Sans TC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, size / 2, isRound ? size * 0.43 : size * 0.40);

        ctx.fillStyle = isRound ? rimColor : '#fff8eb';
        ctx.font = 'bold 30px "Noto Sans TC", sans-serif';
        ctx.fillText(subText, size / 2, isRound ? size * 0.67 : size * 0.81);

        const tex = new THREE.CanvasTexture(canvas);
        tex.encoding = THREE.sRGBEncoding;
        return tex;
    }

    // 繪製水彩風暖褐色描邊輪廓
    function addInkOutline(THREE, mesh, scale = 1.035, color = 0x4a2c1a) {
        const outlineMat = new THREE.MeshBasicMaterial({
            color,
            side: THREE.BackSide
        });
        const outline = new THREE.Mesh(mesh.geometry, outlineMat);
        outline.scale.setScalar(scale);
        mesh.add(outline);
        return outline;
    }

    // 製作雙色真實立體扭蛋球
    function createCapsuleMesh(THREE, radius, topColor, gradientMap) {
        const group = new THREE.Group();

        const topGeo = new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const topMat = new THREE.MeshToonMaterial({
            color: topColor,
            gradientMap
        });
        const topMesh = new THREE.Mesh(topGeo, topMat);
        topMesh.castShadow = true;

        const botGeo = new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        const botMat = new THREE.MeshToonMaterial({
            color: 0xfff8eb,
            gradientMap
        });
        const botMesh = new THREE.Mesh(botGeo, botMat);
        botMesh.castShadow = true;

        const seamGeo = new THREE.TorusGeometry(radius * 0.99, radius * 0.065, 6, 20);
        const seamMat = new THREE.MeshBasicMaterial({ color: 0x4a2c1a });
        const seamMesh = new THREE.Mesh(seamGeo, seamMat);
        seamMesh.rotation.x = Math.PI / 2;

        group.add(topMesh, botMesh, seamMesh);
        return group;
    }

    class GachaScene {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            this.audio = new CozyAudio();

            this.state = 'idle';
            this.stateTimer = 0;
            this.elapsed = 0;
            this.settleTime = 0;
            this.onBurstComplete = null;

            this.mouseTarget = { x: 0, y: 0 };
            this.mouseCurrent = { x: 0, y: 0 };
            this.swayables = [];
            this.capsules = [];
            this.sparkles = [];

            if (!window.THREE) {
                this.fallbackNoThree();
                return;
            }

            this.THREE = window.THREE;
            this.initThree();
            this.buildShopBackdrop();
            this.buildStorefrontShelves();
            this.buildLanterns();
            this.buildGachaMachine();
            this.populateCapsules();
            this.buildDustMotes();
            this.bindEvents();

            this.lastTime = performance.now();
            this.loop = this.loop.bind(this);
            requestAnimationFrame(this.loop);
        }

        fallbackNoThree() {
            const ctx = this.canvas.getContext('2d');
            if (!ctx) return;
            this.canvas.width = 640;
            this.canvas.height = 480;
            ctx.fillStyle = '#f2e2c4';
            ctx.fillRect(0, 0, 640, 480);
            ctx.fillStyle = '#4a2c1a';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('正在載入 3D 柑仔店場景（需連線載入 Three.js）...', 320, 240);
        }

        initThree() {
            const THREE = this.THREE;
            this.gradientMap = createToonGradientMap(THREE);

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xf0dec0);
            this.scene.fog = new THREE.FogExp2(0xf0dec0, 0.018);

            const parent = this.canvas.parentElement;
            const w = Math.max(320, parent ? parent.clientWidth : 640);
            const h = Math.max(240, parent ? parent.clientHeight : 480);

            this.baseCamPos = new THREE.Vector3(4.85, 3.95, 6.65);
            this.camLookAt = new THREE.Vector3(0.0, 1.85, -0.35);

            this.camera = new THREE.PerspectiveCamera(37, w / h, 0.1, 60);
            this.camera.position.copy(this.baseCamPos);
            this.camera.lookAt(this.camLookAt);

            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: false
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.setSize(w, h, false);
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 0.96;
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // 溫暖柑仔店屋簷燈光與午後陽光
            const hemi = new THREE.HemisphereLight(0xfff4df, 0x9b6538, 0.65);
            this.scene.add(hemi);

            const sun = new THREE.DirectionalLight(0xffe1ad, 0.8);
            sun.position.set(-3.8, 7.8, 5.4);
            sun.castShadow = true;
            sun.shadow.mapSize.width = 2048;
            sun.shadow.mapSize.height = 2048;
            sun.shadow.camera.near = 1;
            sun.shadow.camera.far = 25;
            const d = 5.8;
            sun.shadow.camera.left = -d;
            sun.shadow.camera.right = d;
            sun.shadow.camera.top = d;
            sun.shadow.camera.bottom = -d;
            sun.shadow.bias = -0.0008;
            sun.shadow.normalBias = 0.02;
            this.scene.add(sun);

            const rimLight = new THREE.DirectionalLight(0xffcf9e, 0.28);
            rimLight.position.set(6.0, 4.2, -3.5);
            this.scene.add(rimLight);

            const lanternGlowR = new THREE.PointLight(0xffb44c, 0.52, 11);
            lanternGlowR.position.set(2.8, 2.9, -1.5);
            this.scene.add(lanternGlowR);

            const lanternGlowL = new THREE.PointLight(0xffcb78, 0.36, 9);
            lanternGlowL.position.set(-2.8, 2.6, -1.5);
            this.scene.add(lanternGlowL);
        }

        toonMat(color, map = null, extra = {}) {
            const THREE = this.THREE;
            return new THREE.MeshToonMaterial({
                color,
                map,
                gradientMap: this.gradientMap,
                ...extra
            });
        }

        buildShopBackdrop() {
            const THREE = this.THREE;
            const floorWoodTex = createWatercolorTexture(THREE, '#bf844b', 'rgba(102, 56, 22, 0.25)', 'wood');
            floorWoodTex.repeat.set(3, 2);

            const wallWoodTex = createWatercolorTexture(THREE, '#7c4520', 'rgba(46, 24, 10, 0.28)', 'wood');
            wallWoodTex.repeat.set(2, 2);

            const plasterTex = createWatercolorTexture(THREE, '#e8cfa6', 'rgba(184, 146, 100, 0.26)', 'plaster');
            const rugTex = createWatercolorTexture(THREE, '#c92a22', 'rgba(145, 22, 16, 0.3)', 'rug');

            // 溫暖木地板
            const floor = new THREE.Mesh(
                new THREE.BoxGeometry(11.0, 0.2, 8.2),
                this.toonMat(0xffffff, floorWoodTex)
            );
            floor.position.set(0, -0.1, 0);
            floor.receiveShadow = true;
            this.scene.add(floor);

            // 機台下方復古紅金編織墊
            const rug = new THREE.Mesh(
                new THREE.BoxGeometry(2.35, 0.03, 2.85),
                this.toonMat(0xffffff, rugTex)
            );
            rug.position.set(0, 0.015, 0.65);
            rug.receiveShadow = true;
            this.scene.add(rug);

            // 後方開放店鋪木板牆 (-Z) 與左側暖色木牆 (-X)
            const backWall = new THREE.Mesh(
                new THREE.BoxGeometry(10.6, 4.6, 0.2),
                this.toonMat(0xffffff, wallWoodTex)
            );
            backWall.position.set(0, 2.3, -2.78);
            backWall.receiveShadow = true;
            this.scene.add(backWall);

            const leftWall = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 4.6, 7.6),
                this.toonMat(0xffffff, plasterTex)
            );
            leftWall.position.set(-4.55, 2.3, 0.3);
            leftWall.receiveShadow = true;
            this.scene.add(leftWall);

            const leftWainscot = new THREE.Mesh(
                new THREE.BoxGeometry(0.26, 1.15, 7.6),
                this.toonMat(0xffffff, wallWoodTex)
            );
            leftWainscot.position.set(-4.52, 0.575, 0.3);
            leftWainscot.receiveShadow = true;
            this.scene.add(leftWainscot);

            // 傳統木頭立柱與屋簷橫樑
            const beamMat = this.toonMat(0x5c3216);
            [-4.2, -1.6, 1.6, 4.2].forEach(px => {
                const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.4, 0.24), beamMat);
                post.position.set(px, 2.2, -2.62);
                post.castShadow = true;
                this.scene.add(post);
            });

            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.2, 0.36), beamMat);
            topBeam.position.set(0, 3.92, -2.42);
            this.scene.add(topBeam);

            // 傳統木造斜屋簷（仿台式柑仔店門口斜瓦／條紋遮雨簷）
            const eaveTex = createWatercolorTexture(THREE, '#2e5d40', '#1f442d', 'striped');
            const eaveRoof = new THREE.Mesh(
                new THREE.BoxGeometry(9.4, 0.14, 1.05),
                this.toonMat(0xffffff, eaveTex)
            );
            eaveRoof.position.set(0, 4.18, -2.18);
            eaveRoof.rotation.x = 0.25;
            eaveRoof.castShadow = true;
            this.scene.add(eaveRoof);

            // 屋簷下一字排開的台式復古鐵牌招牌
            const signSpecs = [
                { x: -2.75, round: false, bg: '#fff5e0', rim: '#26633b', title: '古早糖', sub: '雜貨鋪' },
                { x: -1.42, round: true,  bg: '#fff9ed', rim: '#d92316', title: '平興',   sub: '柑仔店' },
                { x: 0.0,   round: false, bg: '#fff7e6', rim: '#d92316', title: '榮冠果', sub: '數理汽水' },
                { x: 1.42,  round: true,  bg: '#fff9ed', rim: '#c43227', title: '黑松',   sub: '汽水' },
                { x: 2.75,  round: true,  bg: '#f7efd9', rim: '#1c64d1', title: '良心',   sub: '抽抽樂' }
            ];
            signSpecs.forEach(sp => {
                const tex = createVintageSignTexture(THREE, sp.bg, sp.rim, sp.title, sp.sub, sp.round);
                if (sp.round) {
                    const signGroup = new THREE.Group();
                    const disc = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.46, 0.46, 0.06, 24),
                        this.toonMat(sp.rim)
                    );
                    disc.rotation.x = Math.PI / 2;
                    disc.castShadow = true;
                    addInkOutline(THREE, disc, 1.03);

                    const face = new THREE.Mesh(
                        new THREE.CircleGeometry(0.45, 24),
                        this.toonMat(0xffffff, tex)
                    );
                    face.position.z = 0.032;

                    signGroup.add(disc, face);
                    signGroup.rotation.x = 0.08;
                    signGroup.position.set(sp.x, 3.52, -2.18);
                    this.scene.add(signGroup);
                } else {
                    const sign = new THREE.Mesh(
                        new THREE.BoxGeometry(1.06, 0.72, 0.06),
                        this.toonMat(0xffffff, tex)
                    );
                    sign.rotation.x = 0.08;
                    sign.position.set(sp.x, 3.52, -2.18);
                    sign.castShadow = true;
                    addInkOutline(THREE, sign, 1.03);
                    this.scene.add(sign);
                }
            });

            // 右側木柱上的直式紅底招牌布條
            const bannerTex = createWatercolorTexture(THREE, '#c92a22', 'rgba(130, 16, 12, 0.35)', 'vbanner', '古早柑仔');
            const banner = new THREE.Mesh(
                new THREE.BoxGeometry(0.36, 1.48, 0.05),
                this.toonMat(0xffffff, bannerTex)
            );
            banner.position.set(4.12, 2.08, -2.35);
            banner.rotation.y = -0.18;
            addInkOutline(THREE, banner, 1.04);
            this.scene.add(banner);
        }

        // 整齊開放式柑仔店貨架：上方兩層牆面開放長架 + 下方左右階梯式貨台 + 玻璃糖果罐
        buildStorefrontShelves() {
            const THREE = this.THREE;
            const shelfWoodTex = createWatercolorTexture(THREE, '#b9783e', 'rgba(72,38,14,0.24)', 'wood');
            const shelfMat = this.toonMat(0xffffff, shelfWoodTex);
            const darkWoodMat = this.toonMat(0x6e3a18);

            // 1. 上方牆面兩層開放長層架（橫貫後方，擺放整齊糖果罐與鐵盒）
            [2.68, 2.04].forEach(sy => {
                const plank = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.08, 0.62), shelfMat);
                plank.position.set(0, sy, -2.38);
                plank.castShadow = true;
                plank.receiveShadow = true;
                this.scene.add(plank);
            });

            const glassJarMat = new THREE.MeshStandardMaterial({
                color: 0xaad9eb,
                transparent: true,
                opacity: 0.36,
                roughness: 0.08,
                metalness: 0.08,
                depthWrite: false
            });

            const createCandyJar = (r, h, lidColor, candyColors) => {
                const jGroup = new THREE.Group();
                for (let c = 0; c < 14; c++) {
                    const ang = c * 2.1;
                    const rad = (c % 3) * (r * 0.28);
                    const cy = 0.06 + Math.floor(c / 4) * 0.07;
                    const sphere = new THREE.Mesh(
                        new THREE.SphereGeometry(0.046, 10, 8),
                        this.toonMat(candyColors[c % candyColors.length])
                    );
                    sphere.position.set(Math.cos(ang) * rad, cy, Math.sin(ang) * rad);
                    jGroup.add(sphere);
                }
                const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), glassJarMat);
                glass.position.y = h / 2;
                glass.renderOrder = 4;
                jGroup.add(glass);

                const rim = new THREE.Mesh(
                    new THREE.TorusGeometry(r, 0.011, 6, 16),
                    this.toonMat(0x5b7f91)
                );
                rim.rotation.x = Math.PI / 2;
                rim.position.y = h * 0.96;
                jGroup.add(rim);

                const lid = new THREE.Mesh(
                    new THREE.CylinderGeometry(r * 0.88, r * 0.92, 0.075, 16),
                    this.toonMat(lidColor)
                );
                lid.position.y = h + 0.03;
                addInkOutline(THREE, lid, 1.05);
                jGroup.add(lid);
                return jGroup;
            };

            // 上層 (y = 2.72)：左右整齊排列鐵盒餅乾與圓罐，中央預留與糖果罐整齊並排
            const topTins = [
                { x: -3.45, w: 0.42, h: 0.34, col: 0xd92316 },
                { x: -2.92, w: 0.42, h: 0.34, col: 0xffbe0b },
                { x: -2.40, w: 0.38, h: 0.32, col: 0x1ea85a },
                { x:  2.40, w: 0.38, h: 0.32, col: 0x1c64d1 },
                { x:  2.92, w: 0.42, h: 0.34, col: 0xd92316 },
                { x:  3.45, w: 0.42, h: 0.34, col: 0xff7b00 }
            ];
            topTins.forEach(t => {
                const tin = new THREE.Mesh(
                    new THREE.BoxGeometry(t.w, t.h, 0.34),
                    this.toonMat(t.col)
                );
                tin.position.set(t.x, 2.72 + t.h / 2, -2.36);
                tin.castShadow = true;
                addInkOutline(THREE, tin, 1.04);
                this.scene.add(tin);
            });

            // 上層中央整齊排列 6 罐玻璃糖果罐
            const upperJarXs = [-1.82, -1.28, -0.74, 0.74, 1.28, 1.82];
            const lidPalette = [0xe62929, 0x1c64d1, 0xffbe0b, 0x1ea85a, 0xe84393, 0xff7b00];
            upperJarXs.forEach((jx, idx) => {
                const jar = createCandyJar(0.16, 0.42, lidPalette[idx], [
                    CAPSULE_COLORS[idx],
                    CAPSULE_COLORS[(idx + 2) % CAPSULE_COLORS.length],
                    0xfff5d6
                ]);
                jar.position.set(jx, 2.72, -2.35);
                this.scene.add(jar);
            });

            // 中層 (y = 2.08)：整齊一排 10 罐彩色玻璃糖果罐＋彩色罐裝零食
            const midXs = [-3.4, -2.85, -2.3, -1.75, -1.2, 1.2, 1.75, 2.3, 2.85, 3.4];
            midXs.forEach((mx, idx) => {
                if (idx % 3 === 1) {
                    const can = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.16, 0.16, 0.38, 16),
                        this.toonMat(lidPalette[(idx + 1) % lidPalette.length])
                    );
                    can.position.set(mx, 2.08 + 0.19, -2.34);
                    can.castShadow = true;
                    addInkOutline(THREE, can, 1.04);
                    this.scene.add(can);
                } else {
                    const jar = createCandyJar(0.16, 0.4, lidPalette[idx % lidPalette.length], [
                        CAPSULE_COLORS[idx % CAPSULE_COLORS.length],
                        CAPSULE_COLORS[(idx + 3) % CAPSULE_COLORS.length]
                    ]);
                    jar.position.set(mx, 2.08, -2.34);
                    this.scene.add(jar);
                }
            });

            // 2. 下方左右兩側「階梯式開放陳列木台」（如同傳統柑仔店門口層層整齊擺滿糖果盒與餅乾盤）
            const buildSteppedCounterSide = (sideSign) => {
                const group = new THREE.Group();
                const centerX = sideSign * 2.55;
                group.position.set(centerX, 0, -1.35);

                // 後階高台 (z = -0.35, top y = 1.15)
                const backTier = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.15, 0.72), shelfMat);
                backTier.position.set(0, 0.575, -0.38);
                backTier.castShadow = true;
                backTier.receiveShadow = true;
                addInkOutline(THREE, backTier, 1.02);
                group.add(backTier);

                // 前階低台 (z = +0.28, top y = 0.68)
                const frontTier = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.68, 0.64), darkWoodMat);
                frontTier.position.set(0, 0.34, 0.28);
                frontTier.castShadow = true;
                frontTier.receiveShadow = true;
                addInkOutline(THREE, frontTier, 1.02);
                group.add(frontTier);

                // 後階台面 (y = 1.15)：整齊一排 5 盒彩色戳戳樂／糖果盒／零食包
                const boxPalettes = [
                    ['#ffe394', '#e62929'],
                    ['#d8f5e3', '#1ea85a'],
                    ['#dcebff', '#1c64d1'],
                    ['#ffdce8', '#e84393'],
                    ['#ffe7cc', '#ff7b00']
                ];
                for (let i = 0; i < 5; i++) {
                    const [bg, acc] = boxPalettes[(i + (sideSign > 0 ? 2 : 0)) % boxPalettes.length];
                    const tex = createWatercolorTexture(THREE, bg, acc, 'snack');
                    const box = new THREE.Mesh(
                        new THREE.BoxGeometry(0.42, 0.44, 0.34),
                        this.toonMat(0xffffff, tex)
                    );
                    box.position.set(-0.96 + i * 0.48, 1.15 + 0.22, -0.38);
                    box.castShadow = true;
                    addInkOutline(THREE, box, 1.03);
                    group.add(box);
                }

                // 前階台面 (y = 0.68)：整齊一排 4 個開放式糖果盤與玻璃罐
                for (let i = 0; i < 4; i++) {
                    const tx = -0.84 + i * 0.56;
                    if (sideSign < 0 && i === 3) {
                        // 左側靠中擺一筒彩色漩渦棒棒糖（不被機台遮擋）
                        const pot = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.14, 0.11, 0.26, 14),
                            this.toonMat(0x2c6e85)
                        );
                        pot.position.set(tx, 0.68 + 0.13, 0.30);
                        pot.castShadow = true;
                        addInkOutline(THREE, pot, 1.04);
                        group.add(pot);

                        const lolliCols = ['#e62929', '#1c64d1', '#1ea85a', '#e84393', '#ffbe0b'];
                        lolliCols.forEach((lc, li) => {
                            const lg = new THREE.Group();
                            lg.position.set(tx, 0.84, 0.30);
                            lg.rotation.z = (li - 2) * 0.2;
                            const stick = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.011, 0.011, 0.38, 8),
                                this.toonMat(0xfff5e4)
                            );
                            stick.position.y = 0.19;
                            const lTex = createWatercolorTexture(THREE, '#fffdf7', lc, 'lollipop');
                            const disc = new THREE.Mesh(
                                new THREE.CylinderGeometry(0.1, 0.1, 0.032, 16),
                                this.toonMat(0xffffff, lTex)
                            );
                            disc.rotation.x = Math.PI / 2;
                            disc.position.y = 0.4;
                            addInkOutline(THREE, disc, 1.06);
                            lg.add(stick, disc);
                            group.add(lg);
                        });
                    } else if (i % 2 === 0) {
                        // 開放木托盤裝滿彩色糖果球
                        const tray = new THREE.Mesh(
                            new THREE.BoxGeometry(0.46, 0.09, 0.42),
                            shelfMat
                        );
                        tray.position.set(tx, 0.68 + 0.045, 0.28);
                        tray.castShadow = true;
                        addInkOutline(THREE, tray, 1.03);
                        group.add(tray);

                        for (let c = 0; c < 8; c++) {
                            const cx = (c % 4 - 1.5) * 0.095;
                            const cz = (Math.floor(c / 4) - 0.5) * 0.12;
                            const candy = new THREE.Mesh(
                                new THREE.SphereGeometry(0.048, 10, 8),
                                this.toonMat(CAPSULE_COLORS[(c + i) % CAPSULE_COLORS.length])
                            );
                            candy.position.set(tx + cx, 0.77, 0.28 + cz);
                            group.add(candy);
                        }
                    } else {
                        // 小玻璃糖果罐
                        const jar = createCandyJar(0.15, 0.36, lidPalette[(i + 2) % lidPalette.length], [
                            CAPSULE_COLORS[i],
                            CAPSULE_COLORS[(i + 3) % CAPSULE_COLORS.length],
                            0xfff5d6
                        ]);
                        jar.position.set(tx, 0.68, 0.28);
                        group.add(jar);
                    }
                }

                this.scene.add(group);
            };

            buildSteppedCounterSide(-1);
            buildSteppedCounterSide(1);

            // 右前方地面：彈珠汽水木箱與 6 支藍綠玻璃瓶
            const crateGroup = new THREE.Group();
            crateGroup.position.set(2.35, 0, 0.35);
            crateGroup.rotation.y = -0.35;

            const crate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 0.68), darkWoodMat);
            crate.position.set(0, 0.17, 0);
            crate.castShadow = true;
            crate.receiveShadow = true;
            addInkOutline(THREE, crate, 1.03);
            crateGroup.add(crate);

            const bottleColors = [0x5bc0eb, 0x52c48c, 0x5bc0eb, 0x70d1ff, 0x52c48c, 0x5bc0eb];
            for (let r = 0; r < 2; r++) {
                for (let c = 0; c < 3; c++) {
                    const idx = r * 3 + c;
                    const bGroup = new THREE.Group();
                    bGroup.position.set(-0.26 + c * 0.26, 0.34, -0.14 + r * 0.28);

                    const bMat = new THREE.MeshStandardMaterial({
                        color: bottleColors[idx],
                        transparent: true,
                        opacity: 0.78,
                        roughness: 0.15
                    });
                    const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.26, 12), bMat);
                    bBody.position.y = 0.13;
                    bBody.castShadow = true;

                    const bNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.055, 0.13, 12), bMat);
                    bNeck.position.y = 0.31;

                    const cap = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.042, 0.042, 0.04, 12),
                        this.toonMat(0x1c64d1)
                    );
                    cap.position.y = 0.38;

                    bGroup.add(bBody, bNeck, cap);
                    crateGroup.add(bGroup);
                }
            }
            this.scene.add(crateGroup);
        }

        buildLanterns() {
            const THREE = this.THREE;
            const lanternPositions = [
                { x: -3.55, y: 3.12, z: -1.68, color: 0xe63928 },
                { x: 3.55,  y: 3.12, z: -1.68, color: 0xf4a836 }
            ];

            lanternPositions.forEach((lp, idx) => {
                const pivot = new THREE.Group();
                pivot.position.set(lp.x, lp.y + 0.55, lp.z);

                const cord = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6),
                    this.toonMat(0x3a2214)
                );
                cord.position.y = -0.275;
                pivot.add(cord);

                const bodyMat = new THREE.MeshToonMaterial({
                    color: lp.color,
                    gradientMap: this.gradientMap,
                    emissive: 0xff8a2b,
                    emissiveIntensity: 0.42
                });
                const lanternBody = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), bodyMat);
                lanternBody.scale.set(0.92, 1.22, 0.92);
                lanternBody.position.y = -0.84;
                lanternBody.castShadow = true;
                addInkOutline(THREE, lanternBody, 1.04);
                pivot.add(lanternBody);

                const capMat = this.toonMat(0x4a2c1a);
                const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 14), capMat);
                topCap.position.y = -0.5;
                const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.06, 14), capMat);
                botCap.position.y = -1.18;
                pivot.add(topCap, botCap);

                this.scene.add(pivot);
                this.swayables.push({ obj: pivot, phase: idx * 1.4, amp: 0.05, speed: 0.0021, axis: 'z' });
            });
        }

        buildGachaMachine() {
            const THREE = this.THREE;
            this.machineGroup = new THREE.Group();
            this.machineGroup.position.set(0, 0, 0.25);

            // 更鮮豔飽和的扭蛋機專屬配色
            const redMat = this.toonMat(0xd92316);
            const goldMat = this.toonMat(0xffb703);
            const walnutMat = this.toonMat(0x52311b);
            const creamMat = this.toonMat(0xfff7e6);
            const darkMat = this.toonMat(0x2c1a0e);

            // 1. 底座（胡桃木底盤 + 鮮明金色腰線）
            const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.24, 1.72), walnutMat);
            basePlinth.position.set(0, 0.12, 0);
            basePlinth.castShadow = true;
            basePlinth.receiveShadow = true;
            addInkOutline(THREE, basePlinth, 1.025);
            this.machineGroup.add(basePlinth);

            const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.08, 1.58), goldMat);
            baseTrim.position.set(0, 0.28, 0);
            baseTrim.castShadow = true;
            this.machineGroup.add(baseTrim);

            // 2. 下層鮮豔朱紅機身（+ 圓潤邊角柱）
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.38, 1.42), redMat);
            body.position.set(0, 1.01, 0);
            body.castShadow = true;
            body.receiveShadow = true;
            addInkOutline(THREE, body, 1.028);
            this.machineGroup.add(body);

            [
                [-0.66, -0.66], [0.66, -0.66],
                [-0.66, 0.66],  [0.66, 0.66]
            ].forEach(([cx, cz]) => {
                const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.38, 12), redMat);
                col.position.set(cx, 1.01, cz);
                this.machineGroup.add(col);
            });

            // 3. 正面 (+Z) 出蛋口與擋片
            const chuteFrame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.14), goldMat);
            chuteFrame.position.set(0, 0.62, 0.72);
            addInkOutline(THREE, chuteFrame, 1.04);
            this.machineGroup.add(chuteFrame);

            const chuteHole = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.16), darkMat);
            chuteHole.position.set(0, 0.62, 0.73);
            this.machineGroup.add(chuteHole);

            const chuteTray = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.24), goldMat);
            chuteTray.position.set(0, 0.41, 0.81);
            chuteTray.castShadow = true;
            this.machineGroup.add(chuteTray);

            this.chuteFlapPivot = new THREE.Group();
            this.chuteFlapPivot.position.set(0, 0.77, 0.8);
            const flapMesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.42, 0.28, 0.03),
                new THREE.MeshStandardMaterial({
                    color: 0xffeed6,
                    transparent: true,
                    opacity: 0.65,
                    roughness: 0.2
                })
            );
            flapMesh.position.y = -0.14;
            this.chuteFlapPivot.add(flapMesh);
            this.machineGroup.add(this.chuteFlapPivot);

            // 4. 正面 (+Z) 米白金屬銘牌與投幣口
            const plateBorder = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.56, 0.06), goldMat);
            plateBorder.position.set(0, 1.29, 0.72);
            addInkOutline(THREE, plateBorder, 1.03);
            this.machineGroup.add(plateBorder);

            const plateFace = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.46, 0.07), creamMat);
            plateFace.position.set(0, 1.29, 0.73);
            this.machineGroup.add(plateFace);

            const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.04), darkMat);
            coinSlot.position.set(0.35, 1.29, 0.76);
            this.machineGroup.add(coinSlot);

            // 5. 嚴格貼齊機台正面 (+Z) 的立體旋鈕
            this.knobGroup = new THREE.Group();
            this.knobGroup.position.set(-0.04, 1.29, 0.76);

            const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.06, 24), goldMat);
            bezel.rotation.x = Math.PI / 2;
            bezel.castShadow = true;
            addInkOutline(THREE, bezel, 1.05);
            this.knobGroup.add(bezel);

            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 20), this.toonMat(0xffe066));
            hub.rotation.x = Math.PI / 2;
            hub.position.z = 0.04;
            this.knobGroup.add(hub);

            const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.085, 0.075), this.toonMat(0xffd646));
            handleBar.position.z = 0.075;
            handleBar.castShadow = true;
            addInkOutline(THREE, handleBar, 1.06);
            this.knobGroup.add(handleBar);

            this.machineGroup.add(this.knobGroup);

            // 6. 圓形透明玻璃球罩 (center y = 2.60, R = 1.10) 與無縫貼合的上下接環/球冠上蓋
            this.globeCenterY = 2.60;
            this.globeRadius = 1.10;
            const capOffsetY = 0.76;
            const rimRadius = Math.sqrt(this.globeRadius * this.globeRadius - capOffsetY * capOffsetY); // ~0.795

            // 底部金色接環：上緣精準貼合球體 y = 2.60 - 0.76 = 1.84 的圓周半徑
            const collar = new THREE.Mesh(
                new THREE.CylinderGeometry(rimRadius + 0.015, 0.94, 0.16, 32),
                goldMat
            );
            collar.position.set(0, 1.77, 0);
            collar.castShadow = true;
            addInkOutline(THREE, collar, 1.03);
            this.machineGroup.add(collar);

            const bottomRim = new THREE.Mesh(
                new THREE.TorusGeometry(rimRadius + 0.01, 0.032, 10, 32),
                goldMat
            );
            bottomRim.rotation.x = Math.PI / 2;
            bottomRim.position.set(0, this.globeCenterY - capOffsetY + 0.01, 0);
            this.machineGroup.add(bottomRim);

            this.globeAnchor = new THREE.Group();
            this.globeAnchor.position.set(0, this.globeCenterY, 0);
            this.machineGroup.add(this.globeAnchor);

            // 自訂 Fresnel 玻璃球材質
            const glassMat = new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: false,
                vertexShader: `
                    varying vec3 vNormalView;
                    varying vec3 vViewPos;
                    void main() {
                        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                        vNormalView = normalize(normalMatrix * normal);
                        vViewPos = -mvPos.xyz;
                        gl_Position = projectionMatrix * mvPos;
                    }
                `,
                fragmentShader: `
                    varying vec3 vNormalView;
                    varying vec3 vViewPos;
                    void main() {
                        vec3 n = normalize(vNormalView);
                        vec3 v = normalize(vViewPos);
                        float rim = 1.0 - max(dot(n, v), 0.0);
                        float edge = pow(rim, 2.2);
                        float outline = smoothstep(0.75, 0.93, rim);
                        vec3 glassCol = mix(vec3(0.84, 0.95, 0.99), vec3(0.30, 0.52, 0.66), outline);
                        float alpha = 0.08 + edge * 0.44 + outline * 0.38;
                        gl_FragColor = vec4(glassCol, clamp(alpha, 0.0, 0.86));
                    }
                `
            });
            const glassGlobe = new THREE.Mesh(new THREE.SphereGeometry(this.globeRadius, 36, 26), glassMat);
            glassGlobe.renderOrder = 6;
            this.globeAnchor.add(glassGlobe);

            // 玻璃球左上角柔和反光弧
            const sheenMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.48,
                depthWrite: false
            });
            const sheen = new THREE.Mesh(
                new THREE.SphereGeometry(this.globeRadius * 1.004, 18, 12, 0.6, 0.34, 0.45, 0.68),
                sheenMat
            );
            sheen.renderOrder = 7;
            this.globeAnchor.add(sheen);

            // 7. 圓弧球冠頂蓋（與玻璃球同心同曲率，緊密貼合零縫隙！）
            const capAngle = Math.acos(capOffsetY / this.globeRadius);
            const topCap = new THREE.Mesh(
                new THREE.SphereGeometry(this.globeRadius + 0.018, 32, 16, 0, Math.PI * 2, 0, capAngle),
                redMat
            );
            topCap.position.set(0, this.globeCenterY, 0);
            topCap.castShadow = true;
            addInkOutline(THREE, topCap, 1.028);
            this.machineGroup.add(topCap);

            // 上蓋與玻璃球交界處的金色圓環飾條
            const capRim = new THREE.Mesh(
                new THREE.TorusGeometry(rimRadius + 0.012, 0.036, 10, 32),
                goldMat
            );
            capRim.rotation.x = Math.PI / 2;
            capRim.position.set(0, this.globeCenterY + capOffsetY, 0);
            addInkOutline(THREE, capRim, 1.04);
            this.machineGroup.add(capRim);

            // 頂部金色鎖蓋與球形把手
            const topLockPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.06, 20), goldMat);
            topLockPlate.position.set(0, 3.71, 0);
            topLockPlate.castShadow = true;
            addInkOutline(THREE, topLockPlate, 1.04);
            this.machineGroup.add(topLockPlate);

            const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), goldMat);
            finial.position.set(0, 3.81, 0);
            addInkOutline(THREE, finial, 1.06);
            this.machineGroup.add(finial);

            // 8. 掉落中扭蛋球群組（依抽出人數動態生成）
            this.dropCapsules = [];

            this.scene.add(this.machineGroup);
        }

        populateCapsules() {
            const THREE = this.THREE;
            const count = 40;
            this.capsuleRadius = 0.175;
            // 安全內半徑，確保球體（含接縫線）始終完整留在玻璃球內壁與上蓋下方 (1.10 - 0.175 - 0.095 = 0.83)
            this.safeRadius = this.globeRadius - this.capsuleRadius - 0.095;

            const positions = [];
            for (let i = 0; i < count; i++) {
                const layer = Math.floor(i / 9);
                const angle = (i % 9) * ((Math.PI * 2) / 9) + layer * 0.42;
                const rad = 0.2 + (i % 3) * 0.2;
                const y = -0.68 + layer * 0.24;
                const p = new THREE.Vector3(Math.cos(angle) * rad, y, Math.sin(angle) * rad);
                if (p.length() > this.safeRadius) p.setLength(this.safeRadius);
                positions.push(p);
            }

            const minDist = this.capsuleRadius * 2.04;
            for (let iter = 0; iter < 54; iter++) {
                for (let i = 0; i < count; i++) {
                    positions[i].y -= 0.015;
                    for (let j = i + 1; j < count; j++) {
                        const delta = new THREE.Vector3().subVectors(positions[j], positions[i]);
                        const dist = delta.length();
                        if (dist > 0.0001 && dist < minDist) {
                            const push = (minDist - dist) * 0.5;
                            delta.normalize().multiplyScalar(push);
                            positions[i].sub(delta);
                            positions[j].add(delta);
                        }
                    }
                    if (positions[i].length() > this.safeRadius) {
                        positions[i].setLength(this.safeRadius);
                    }
                    if (positions[i].y < -0.72) positions[i].y = -0.72;
                    if (positions[i].y > 0.65) positions[i].y = 0.65;
                }
            }

            for (let i = 0; i < count; i++) {
                const col = CAPSULE_COLORS[i % CAPSULE_COLORS.length];
                const mesh = createCapsuleMesh(THREE, this.capsuleRadius, col, this.gradientMap);
                mesh.position.copy(positions[i]);
                mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                this.globeAnchor.add(mesh);

                this.capsules.push({
                    mesh,
                    restPos: positions[i].clone(),
                    vel: new THREE.Vector3(),
                    phase: i * 1.37,
                    rotVel: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.14,
                        (Math.random() - 0.5) * 0.14,
                        (Math.random() - 0.5) * 0.14
                    )
                });
            }
        }

        buildDustMotes() {
            const THREE = this.THREE;
            const count = 36;
            const positions = new Float32Array(count * 3);
            this.dustSpeeds = [];

            for (let i = 0; i < count; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 7.5;
                positions[i * 3 + 1] = 0.4 + Math.random() * 4.0;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
                this.dustSpeeds.push({
                    vx: 0.001 + Math.random() * 0.0018,
                    vy: 0.0012 + Math.random() * 0.0022
                });
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const c = document.createElement('canvas');
            c.width = 32;
            c.height = 32;
            const ctx = c.getContext('2d');
            const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
            g.addColorStop(0, 'rgba(255, 248, 214, 0.9)');
            g.addColorStop(1, 'rgba(255, 248, 214, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 32, 32);

            const mat = new THREE.PointsMaterial({
                size: 0.13,
                map: new THREE.CanvasTexture(c),
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            this.dustPoints = new THREE.Points(geo, mat);
            this.scene.add(this.dustPoints);
        }

        bindEvents() {
            const parent = this.canvas.parentElement;
            if (parent && window.ResizeObserver) {
                this.resizeObserver = new ResizeObserver(() => this.handleResize());
                this.resizeObserver.observe(parent);
            }
            window.addEventListener('resize', () => this.handleResize());

            if (parent) {
                parent.addEventListener('pointermove', (e) => {
                    const rect = parent.getBoundingClientRect();
                    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
                    this.mouseTarget.x = nx;
                    this.mouseTarget.y = -ny;
                });
                parent.addEventListener('pointerleave', () => {
                    this.mouseTarget.x = 0;
                    this.mouseTarget.y = 0;
                });
            }
        }

        handleResize() {
            if (!this.renderer || !this.camera) return;
            const parent = this.canvas.parentElement;
            const w = parent ? parent.clientWidth : this.canvas.clientWidth;
            const h = parent ? parent.clientHeight : this.canvas.clientHeight;
            if (w <= 0 || h <= 0) return;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h, false);
        }

        clearDropCapsules() {
            if (!this.dropCapsules || !this.machineGroup) return;
            for (const dc of this.dropCapsules) {
                this.machineGroup.remove(dc.mesh);
            }
            this.dropCapsules = [];
        }

        triggerDraw(onComplete, count = 1) {
            if (this.state !== 'idle') return false;
            this.state = 'cranking';
            this.stateTimer = 0;
            this.settleTime = 0;
            this.onBurstComplete = onComplete;

            this.clearDropCapsules();
            const dropCount = Math.max(1, Math.min(30, parseInt(count, 10) || 1));

            // 洗牌顏色順序，確保連續掉出的扭蛋顏色豐富不單調
            const shuffledColors = [...CAPSULE_COLORS];
            for (let i = shuffledColors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
            }

            const staggerMs = dropCount === 1
                ? 0
                : Math.min(220, Math.max(70, Math.floor(1400 / dropCount)));

            const placed = [];
            for (let i = 0; i < dropCount; i++) {
                const color = shuffledColors[i % shuffledColors.length];
                const radius = dropCount > 8 ? 0.18 : 0.22;
                const mesh = createCapsuleMesh(this.THREE, radius, color, this.gradientMap);
                mesh.visible = false;
                mesh.position.set(0, 0.58, 0.74);
                this.machineGroup.add(mesh);

                // 在紅金地毯前方自然隨機散落（僅做防重疊間距檢查，不刻意排整齊）
                let targetX = 0;
                let targetZ = 1.65;
                if (dropCount > 1) {
                    const minSep = radius * 2.15;
                    let bestX = (Math.random() - 0.5) * 1.68;
                    let bestZ = 1.12 + Math.random() * 0.66;
                    for (let attempt = 0; attempt < 24; attempt++) {
                        const cx = (Math.random() - 0.5) * 1.68;
                        const cz = 1.12 + Math.random() * 0.66;
                        const overlaps = placed.some(p => {
                            const dx = p.x - cx;
                            const dz = p.z - cz;
                            return (dx * dx + dz * dz) < (minSep * minSep);
                        });
                        if (!overlaps) {
                            bestX = cx;
                            bestZ = cz;
                            break;
                        }
                    }
                    targetX = bestX;
                    targetZ = bestZ;
                }
                placed.push({ x: targetX, z: targetZ });

                this.dropCapsules.push({
                    mesh,
                    radius,
                    startDelay: i * staggerMs,
                    targetX,
                    targetZ,
                    landRotX: 0.22 + Math.random() * 0.42,
                    landRotY: (Math.random() - 0.5) * 0.9,
                    landRotZ: (Math.random() - 0.5) * 0.85,
                    started: false,
                    landed: false
                });
            }

            this.sparkles.forEach(s => this.scene.remove(s.mesh));
            this.sparkles = [];

            this.audio.playCrank();
            return true;
        }

        spawnSparkles(worldPos) {
            const THREE = this.THREE;
            const cols = [0xffe394, 0xf5b841, 0xff8566, 0xffffff, 0x6cc78a];
            for (let i = 0; i < 24; i++) {
                const mesh = new THREE.Mesh(
                    new THREE.OctahedronGeometry(0.055, 0),
                    new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true, opacity: 1 })
                );
                mesh.position.copy(worldPos);
                const ang = (Math.PI * 2 * i) / 24 + Math.random() * 0.25;
                const spd = 0.03 + Math.random() * 0.045;
                this.scene.add(mesh);
                this.sparkles.push({
                    mesh,
                    vel: new THREE.Vector3(Math.cos(ang) * spd, 0.04 + Math.random() * 0.05, Math.sin(ang) * spd),
                    life: 1
                });
            }
        }

        updateCapsules(dt, isCranking) {
            const THREE = this.THREE;
            const factor = dt / 16.67;
            const minDist = this.capsuleRadius * 2.0;

            for (const c of this.capsules) {
                const pos = c.mesh.position;
                if (isCranking) {
                    c.vel.x += (-pos.z * 0.014 + (Math.random() - 0.5) * 0.014) * factor;
                    c.vel.z += (pos.x * 0.014 + (Math.random() - 0.5) * 0.014) * factor;
                    const pulse = Math.sin(this.elapsed * 0.013 + c.phase);
                    if (pos.y < -0.25 && pulse > 0.25) {
                        c.vel.y += (0.014 + Math.random() * 0.016) * factor;
                    } else {
                        c.vel.y -= 0.013 * factor;
                    }
                    c.vel.multiplyScalar(0.94);
                    c.mesh.rotation.x += c.rotVel.x * factor;
                    c.mesh.rotation.y += c.rotVel.y * factor;
                    c.mesh.rotation.z += c.rotVel.z * factor;
                } else if (this.settleTime > 0) {
                    c.vel.y -= 0.012 * factor;
                    c.vel.multiplyScalar(0.88);
                    pos.lerp(c.restPos, 0.06 * factor);
                } else {
                    continue;
                }

                pos.addScaledVector(c.vel, factor);

                // 嚴格球內鉗制：絕不穿出玻璃外殼或頂蓋
                const dist = pos.length();
                if (dist > this.safeRadius) {
                    pos.setLength(this.safeRadius);
                    const normal = pos.clone().normalize();
                    const outDot = c.vel.dot(normal);
                    if (outDot > 0) c.vel.addScaledVector(normal, -1.55 * outDot);
                }
                if (pos.y < -0.74) {
                    pos.y = -0.74;
                    if (c.vel.y < 0) c.vel.y *= -0.35;
                }
                if (pos.y > 0.65) {
                    pos.y = 0.65;
                    if (c.vel.y > 0) c.vel.y *= -0.35;
                }
            }

            if (isCranking || this.settleTime > 0) {
                for (let i = 0; i < this.capsules.length; i++) {
                    for (let j = i + 1; j < this.capsules.length; j++) {
                        const p1 = this.capsules[i].mesh.position;
                        const p2 = this.capsules[j].mesh.position;
                        const delta = new THREE.Vector3().subVectors(p2, p1);
                        const d = delta.length();
                        if (d > 0.0001 && d < minDist) {
                            delta.normalize().multiplyScalar((minDist - d) * 0.45);
                            p1.sub(delta);
                            p2.add(delta);
                            if (p1.length() > this.safeRadius) p1.setLength(this.safeRadius);
                            if (p2.length() > this.safeRadius) p2.setLength(this.safeRadius);
                        }
                    }
                }
            }
        }

        update(dt) {
            this.elapsed += dt;

            // 微幅滑鼠視角視差
            this.mouseCurrent.x += (this.mouseTarget.x - this.mouseCurrent.x) * 0.06;
            this.mouseCurrent.y += (this.mouseTarget.y - this.mouseCurrent.y) * 0.06;
            this.camera.position.set(
                this.baseCamPos.x + this.mouseCurrent.x * 0.22,
                this.baseCamPos.y + this.mouseCurrent.y * 0.11,
                this.baseCamPos.z
            );
            this.camera.lookAt(this.camLookAt);

            // 燈籠微風輕晃
            for (const s of this.swayables) {
                s.obj.rotation[s.axis] = Math.sin(this.elapsed * s.speed + s.phase) * s.amp;
            }

            // 漂浮金色微塵
            if (this.dustPoints) {
                const posAttr = this.dustPoints.geometry.getAttribute('position');
                const arr = posAttr.array;
                for (let i = 0; i < this.dustSpeeds.length; i++) {
                    arr[i * 3] += this.dustSpeeds[i].vx;
                    arr[i * 3 + 1] += this.dustSpeeds[i].vy;
                    if (arr[i * 3 + 1] > 4.4) arr[i * 3 + 1] = 0.4;
                    if (arr[i * 3] > 4.0) arr[i * 3] = -4.0;
                }
                posAttr.needsUpdate = true;
            }

            // 爆裂星光更新
            for (let i = this.sparkles.length - 1; i >= 0; i--) {
                const sp = this.sparkles[i];
                sp.mesh.position.add(sp.vel);
                sp.vel.y -= 0.0022;
                sp.mesh.rotation.y += 0.12;
                sp.life -= 0.024;
                sp.mesh.material.opacity = Math.max(0, sp.life);
                if (sp.life <= 0) {
                    this.scene.remove(sp.mesh);
                    this.sparkles.splice(i, 1);
                }
            }

            this.stateTimer += dt;
            if (this.settleTime > 0) this.settleTime = Math.max(0, this.settleTime - dt);

            if (this.state === 'cranking') {
                // 正面 (+Z) 旋鈕在機台正面平面內順時針旋轉
                this.knobGroup.rotation.z -= dt * 0.0095;
                this.machineGroup.position.x = Math.sin(this.stateTimer * 0.065) * 0.03;
                this.machineGroup.position.z = 0.25 + Math.cos(this.stateTimer * 0.075) * 0.02;
                this.updateCapsules(dt, true);

                if (this.stateTimer >= 1350) {
                    this.state = 'dropping';
                    this.stateTimer = 0;
                    this.settleTime = 950;
                    this.machineGroup.position.set(0, 0, 0.25);
                    this.audio.playDrop();
                }
            } else if (this.state === 'dropping') {
                this.updateCapsules(dt, false);
                const dropDuration = 820;
                let flapKick = 0;
                let allLanded = true;

                for (let idx = 0; idx < this.dropCapsules.length; idx++) {
                    const dc = this.dropCapsules[idx];
                    const localTime = this.stateTimer - dc.startDelay;
                    if (localTime < 0) {
                        allLanded = false;
                        continue;
                    }

                    if (!dc.started) {
                        dc.started = true;
                        dc.mesh.visible = true;
                        if (idx > 0) {
                            this.audio.playTone(460 + (idx % 5) * 60, 0.08, 'sine', 0.06);
                        }
                    }

                    const t = Math.min(1, localTime / dropDuration);
                    if (t < 0.25) {
                        flapKick = Math.max(flapKick, Math.sin((t / 0.25) * Math.PI));
                    }

                    dc.mesh.position.x = dc.targetX * t;
                    dc.mesh.position.z = 0.74 + t * (dc.targetZ - 0.74);

                    const groundY = dc.radius + 0.03;
                    if (t < 1) {
                        allLanded = false;
                        dc.mesh.rotation.x += dt * 0.009;
                        dc.mesh.rotation.z += dt * 0.004 * (idx % 2 === 0 ? 1 : -1);
                        if (t < 0.45) {
                            const p = t / 0.45;
                            dc.mesh.position.y = 0.58 - p * p * (0.58 - groundY);
                        } else if (t < 0.75) {
                            const p = (t - 0.45) / 0.3;
                            dc.mesh.position.y = groundY + Math.sin(p * Math.PI) * 0.28;
                        } else {
                            const p = (t - 0.75) / 0.25;
                            dc.mesh.position.y = groundY + Math.sin(p * Math.PI) * 0.11;
                        }
                    } else {
                        dc.mesh.position.y = groundY;
                        dc.mesh.rotation.x = dc.landRotX;
                        dc.mesh.rotation.y = dc.landRotY;
                        dc.mesh.rotation.z = dc.landRotZ;
                        dc.landed = true;
                    }
                }

                this.chuteFlapPivot.rotation.x = -flapKick * 0.95;

                if (allLanded) {
                    this.state = 'burst';
                    this.stateTimer = 0;
                    this.chuteFlapPivot.rotation.x = 0;
                    const burstTargets = this.dropCapsules.slice(0, 6);
                    for (const dc of burstTargets) {
                        const worldPos = dc.mesh.getWorldPosition(new this.THREE.Vector3());
                        this.spawnSparkles(worldPos);
                    }
                    this.audio.playFanfare();
                }
            } else if (this.state === 'burst') {
                this.updateCapsules(dt, false);
                if (this.stateTimer >= 420) {
                    const cb = this.onBurstComplete;
                    this.onBurstComplete = null;
                    this.state = 'idle';
                    this.clearDropCapsules();
                    if (cb) cb();
                }
            } else {
                this.updateCapsules(dt, false);
            }
        }

        loop(now) {
            const dt = Math.min(50, now - this.lastTime);
            this.lastTime = now;

            this.update(dt);
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(this.loop);
        }
    }

    window.GachaScene = GachaScene;
})();
