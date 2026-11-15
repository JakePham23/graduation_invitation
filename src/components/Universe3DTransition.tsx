import { useEffect, useRef } from "react";
import { CEREMONY_INFO } from "@/config/ceremony";
import { getThemePalette, useThemePalette } from "@/config/theme";
import type { WishEntry } from "@/types/invitation";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    THREE?: any;
  }
}

export type ExperiencePhase = "cover" | "flying" | "gallery" | "focus" | "letter";

interface Universe3DTransitionProps {
  phase: ExperiencePhase;
  recipientLabel: string;
  wishes: WishEntry[];
}

function easeInOutCubic(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Vẽ tấm thiệp 3D với hiệu ứng tia sáng đánh bóng (Shimmer) quét ngang mặt thiệp
 */
function draw3DGraduationCard(
  canvas: HTMLCanvasElement,
  recipientLabel: string,
  logoImg: HTMLImageElement | undefined,
  sheenProgress: number,
) {
  const W = 1000;
  const H = 820;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const palette = getThemePalette();

  // 1. Nền lụa theo preset
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, palette.cardBgStops[0]);
  bg.addColorStop(0.32, palette.cardBgStops[1]);
  bg.addColorStop(0.55, palette.cardBgStops[2]);
  bg.addColorStop(0.82, palette.cardBgStops[3]);
  bg.addColorStop(1, palette.cardBgStops[4]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Sóng lụa nền
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 190);
  ctx.bezierCurveTo(260, 95, 530, 340, W, 145);
  ctx.lineTo(W, 420);
  ctx.bezierCurveTo(630, 550, 330, 310, 0, 470);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.bezierCurveTo(350, 410, 680, 670, W, 490);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = "rgba(203, 213, 225, 0.28)";
  ctx.fill();
  ctx.restore();

  const drawFleurDeLis = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";

    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.bezierCurveTo(6, -14, 8, -5, 0, 5);
    ctx.bezierCurveTo(-8, -5, -6, -14, 0, -24);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-5, -4);
    ctx.bezierCurveTo(-16, -13, -24, -8, -22, 3);
    ctx.bezierCurveTo(-15, 2, -9, -1, -5, -4);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.bezierCurveTo(16, -13, 24, -8, 22, 3);
    ctx.bezierCurveTo(15, 2, 9, -1, 5, -4);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 11, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const ribbonW = 114;
  const ribbonBottomY = 785;
  const ribbonPointY = 712;

  const drawRibbonPolygon = (x: number, side: "left" | "right") => {
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.22)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    if (side === "left") {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + ribbonW, 54);
      ctx.lineTo(x + ribbonW, ribbonPointY);
      ctx.lineTo(x + ribbonW / 2, ribbonBottomY);
      ctx.lineTo(x, ribbonPointY);
    } else {
      ctx.moveTo(x, 54);
      ctx.lineTo(x + ribbonW, 0);
      ctx.lineTo(x + ribbonW, ribbonPointY);
      ctx.lineTo(x + ribbonW / 2, ribbonBottomY);
      ctx.lineTo(x, ribbonPointY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const pad = 11;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    if (side === "left") {
      ctx.moveTo(x + pad, 18);
      ctx.lineTo(x + pad, ribbonPointY - 6);
      ctx.lineTo(x + ribbonW / 2, ribbonBottomY - 18);
      ctx.lineTo(x + ribbonW - pad, ribbonPointY - 6);
      ctx.lineTo(x + ribbonW - pad, 60);
    } else {
      ctx.moveTo(x + pad, 60);
      ctx.lineTo(x + pad, ribbonPointY - 6);
      ctx.lineTo(x + ribbonW / 2, ribbonBottomY - 18);
      ctx.lineTo(x + ribbonW - pad, ribbonPointY - 6);
      ctx.lineTo(x + ribbonW - pad, 18);
    }
    ctx.stroke();
    ctx.restore();

    drawFleurDeLis(x + ribbonW / 2, ribbonBottomY - 58);
  };

  const leftX = 34;
  const rightX = W - 34 - ribbonW;
  drawRibbonPolygon(leftX, "left");
  drawRibbonPolygon(rightX, "right");

  const leftCx = leftX + ribbonW / 2;
  const rightCx = rightX + ribbonW / 2;

  // Dải băng Trái
  ctx.save();
  ctx.beginPath();
  ctx.arc(leftCx, 110, 34, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.stroke();
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCx, 110, 32, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, leftCx - 33, 110 - 33, 66, 66);
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftCx - 24, 160);
  ctx.lineTo(leftCx - 6, 160);
  ctx.moveTo(leftCx + 6, 160);
  ctx.lineTo(leftCx + 24, 160);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(leftCx, 160, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.font = 'bold 28px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ["H", "C", "M", "U", "S"].forEach((ch, idx) => {
    ctx.fillText(ch, leftCx, 240 + idx * 54);
  });

  ctx.fillStyle = "#ffffff";
  ctx.font = 'italic 600 21px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("2022", leftCx, 575);
  ctx.fillStyle = palette.accent;
  ctx.fillText("—", leftCx, 602);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("2026", leftCx, 629);
  ctx.restore();

  // Dải băng Phải
  ctx.save();
  ctx.fillStyle = palette.accent;
  ctx.font = 'bold 40px "Great Vibes", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(CEREMONY_INFO.cohort, rightCx, 112);

  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rightCx - 24, 152);
  ctx.lineTo(rightCx - 6, 152);
  ctx.moveTo(rightCx + 6, 152);
  ctx.lineTo(rightCx + 24, 152);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(rightCx, 152, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(rightCx, 365);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = '600 36px "Dancing Script", "Cormorant Garamond", cursive';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(CEREMONY_INFO.graduateName, 0, 0);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = 'italic bold 19px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = "center";
  ctx.fillText("NGÀNH", rightCx, 588);
  ctx.fillStyle = palette.accent;
  ctx.font = 'italic bold 22px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(CEREMONY_INFO.major, rightCx, 618);
  ctx.restore();

  // Trung tâm Thiệp
  const centerX = W / 2;

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.drawImage(logoImg, centerX - 235, 118, 62, 62);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = palette.primary;
  ctx.font = 'bold 18px "Be Vietnam Pro", sans-serif';
  ctx.fillText(CEREMONY_INFO.universityVi, centerX - 160, 144);
  ctx.fillStyle = palette.subText;
  ctx.font = '500 15.5px "Be Vietnam Pro", sans-serif';
  ctx.fillText(CEREMONY_INFO.universityEn, centerX - 160, 170);

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = palette.primary;
  ctx.font = 'normal 124px "Great Vibes", Georgia, serif';
  ctx.fillText("G", centerX - 150, 340);

  ctx.fillStyle = palette.bodyText;
  ctx.font = '600 82px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("raduation", centerX + 42, 330);

  ctx.fillStyle = palette.bodyText;
  ctx.font = '500 64px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("Ceremon", centerX - 18, 415);

  ctx.fillStyle = palette.primary;
  ctx.font = 'normal 104px "Great Vibes", Georgia, serif';
  ctx.fillText("y", centerX + 125, 420);

  ctx.save();
  ctx.translate(centerX + 180, 228);
  ctx.rotate((12 * Math.PI) / 180);
  ctx.fillStyle = "#1f2937";
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(48, -4);
  ctx.lineTo(0, 16);
  ctx.lineTo(-48, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.moveTo(-25, 6);
  ctx.lineTo(-25, 24);
  ctx.quadraticCurveTo(0, 32, 25, 24);
  ctx.lineTo(25, 6);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(32, 6);
  ctx.lineTo(32, 28);
  ctx.stroke();
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(32, 30, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = palette.bodyText;
  ctx.font = 'italic 34px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("Trân trọng kính mời", centerX, 515);

  ctx.fillStyle = palette.primary;
  ctx.font = 'bold 54px "Dancing Script", "Cormorant Garamond", cursive';
  ctx.fillText(recipientLabel, centerX, 585);

  ctx.save();
  ctx.strokeStyle = `rgba(${palette.primaryRgb}, 0.55)`;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(centerX - 220, 612);
  ctx.lineTo(centerX + 220, 612);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = palette.bodyText;
  ctx.font = 'italic 32px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("Tới dự Lễ Tốt Nghiệp", centerX, 662);

  // 5. HIỆU ỨNG ĐÁNH BÓNG ÁNH KIM (SHIMMER POLISH SWEEP) TRÊN BỀ MẶT 3D
  const sweepX = -400 + (sheenProgress % 1) * (W + 800);
  ctx.save();
  const sheenGrad = ctx.createLinearGradient(sweepX - 180, 0, sweepX + 180, 140);
  sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
  sheenGrad.addColorStop(0.4, "rgba(255, 255, 255, 0.45)");
  sheenGrad.addColorStop(0.5, palette.sheenRgba);
  sheenGrad.addColorStop(0.6, "rgba(255, 255, 255, 0.45)");
  sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Viền ánh kim lấp lánh
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);
}

function createGradientCanvas(index: number): HTMLCanvasElement {
  const palette = getThemePalette();
  const canvas = document.createElement("canvas");
  canvas.width = 250;
  canvas.height = 400;
  const ctx = canvas.getContext("2d")!;

  const gradients = palette.wishGradients;

  const [color1, color2] = gradients[index % gradients.length];
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  const icons = ["🎓", "📸", "✨", "🌟", "🎉", "💫"];
  ctx.font = "64px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText(icons[index % icons.length], canvas.width / 2, canvas.height / 2 - 20);

  ctx.font = "bold 22px Georgia, serif";
  ctx.fillStyle = "#fbb719";
  ctx.fillText("HCMUS • K22", canvas.width / 2, canvas.height / 2 + 45);

  ctx.font = "italic 18px Georgia, serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`Kỷ niệm #${index + 1}`, canvas.width / 2, canvas.height - 36);

  return canvas;
}

export function Universe3DTransition({
  phase,
  recipientLabel,
  wishes,
}: Universe3DTransitionProps) {
  const palette = useThemePalette();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<ExperiencePhase>(phase);
  const phaseStartTimeRef = useRef<number>(0);

  const anonymousWishMessages =
    wishes.length > 0
      ? wishes.map((w) => {
          const clean = w.message.trim();
          return clean.length > 44 ? `“${clean.slice(0, 44)}…” ✨` : `“${clean}” ✨`;
        })
      : CEREMONY_INFO.defaultFlyingWishes;

  useEffect(() => {
    const prevPhase = phaseRef.current;
    phaseRef.current = phase;
    if (phase === "flying" && prevPhase !== "flying") {
      phaseStartTimeRef.current = performance.now() / 1000;
    }
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanupFn: (() => void) | undefined;
    let waitTimer: number | undefined;

    const initThreeScene = () => {
      const THREE = window.THREE;
      if (!THREE) {
        waitTimer = window.setTimeout(initThreeScene, 120);
        return;
      }

      const getViewportSize = () => ({
        w: Math.max(320, window.innerWidth || document.documentElement.clientWidth || 375),
        h: Math.max(480, window.innerHeight || document.documentElement.clientHeight || 667),
      });

      const { w: initW, h: initH } = getViewportSize();
      const isMobileViewport = initW < 640;

      const activePalette = getThemePalette();

      // ===== 1. SCENE & CAMERA TỐI ƯU CHO CẢ IPHONE / MOBILE DỌC & DESKTOP =====
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(activePalette.fogHex, 0.005);

      const camera = new THREE.PerspectiveCamera(60, initW / initH, 0.1, 1000);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobileViewport,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(initW, initH);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(activePalette.fogHex, 0);

      // ===== 2. BẦU TRỜI VŨ TRỤ SAO 3D RÕ NÉT TRÊN MOBILE (DÙNG GLOW TEXTURE + 2 LỚP SAO GẦN/XA) =====
      const starGlowCanvas = document.createElement("canvas");
      starGlowCanvas.width = 64;
      starGlowCanvas.height = 64;
      const sgCtx = starGlowCanvas.getContext("2d")!;
      const sgGrad = sgCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
      sgGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
      sgGrad.addColorStop(0.35, "rgba(253, 230, 138, 0.9)");
      sgGrad.addColorStop(0.7, activePalette.starGlowRgba);
      sgGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
      sgCtx.fillStyle = sgGrad;
      sgCtx.fillRect(0, 0, 64, 64);
      const starGlowTex = new THREE.CanvasTexture(starGlowCanvas);

      const starCount = 1800;
      const starGeo = new THREE.BufferGeometry();
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);

      const colorOptions = activePalette.starColors.map((hex) => new THREE.Color(hex));

      for (let i = 0; i < starCount; i++) {
        // Đặt sao ở khoảng cách gần hơn (14 -> 95) để hiển thị to, sáng rõ trên màn hình điện thoại
        const radius = i < 600 ? 14 + Math.random() * 32 : 35 + Math.random() * 65;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = radius * Math.cos(phi);

        const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        starColors[i * 3] = color.r;
        starColors[i * 3 + 1] = color.g;
        starColors[i * 3 + 2] = color.b;
      }

      starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

      const starMat = new THREE.PointsMaterial({
        size: isMobileViewport ? 2.6 : 1.9,
        map: starGlowTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const starsParticles = new THREE.Points(starGeo, starMat);
      scene.add(starsParticles);

      // Lớp sao lớn lấp lánh (Nebula Star Sprites) luôn hiển thị trên cả mobile ở mọi giai đoạn
      const ambientStarsGroup = new THREE.Group();
      scene.add(ambientStarsGroup);
      const ambientStarSprites: any[] = [];
      for (let i = 0; i < 45; i++) {
        const spMat = new THREE.SpriteMaterial({
          map: starGlowTex,
          color: i % 2 === 0 ? activePalette.starColors[0] : activePalette.starColors[2],
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
        });
        const sp = new THREE.Sprite(spMat);
        const s = 0.8 + Math.random() * 1.6;
        sp.scale.set(s, s, 1);
        const angle = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * 24;
        const y = (Math.random() - 0.5) * 36;
        sp.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r - 6);
        sp.userData = { baseScale: s, phase: Math.random() * Math.PI * 2, speed: 0.02 + Math.random() * 0.03 };
        ambientStarSprites.push(sp);
        ambientStarsGroup.add(sp);
      }

      // Tải ảnh của người dùng từ CEREMONY_INFO.memoryPhotos
      const loader = new THREE.TextureLoader();
      const sharedTextures: any[] = [];
      const imagesToUse = CEREMONY_INFO.memoryPhotos;

      for (let i = 0; i < imagesToUse.length; i++) {
        const fallbackCanvas = createGradientCanvas(i);
        const tex = new THREE.CanvasTexture(fallbackCanvas);
        sharedTextures.push(tex);

        loader.load(
          imagesToUse[i],
          (loadedTex: any) => {
            sharedTextures[i] = loadedTex;
          },
          undefined,
          () => {
            // Giữ fallback nếu ảnh chưa có
          },
        );
      }

      // ===== 3. DUY NHẤT 1 HỆ THỐNG THẺ ẢNH 3D LIỀN MẠCH (TỪ BAY DƯỚI LÊN -> TỰ HỘI TỤ XOAY VÒNG QUANH THIỆP) =====
      const flyingGroup = new THREE.Group();
      scene.add(flyingGroup);
      const flySpeed = 0.6;
      const flyingCards: any[] = [];
      const totalFlyingCards = 44;

      for (let i = 0; i < totalFlyingCards; i++) {
        const scale = 0.65 + (i % 4) * 0.14;
        const geometry = new THREE.PlaneGeometry(3.2 * scale, 4.0 * scale);
        const material = new THREE.MeshBasicMaterial({
          map: sharedTextures[i % sharedTextures.length],
          transparent: true,
          opacity: 0.94,
          side: THREE.DoubleSide,
        });

        const card = new THREE.Mesh(geometry, material);
        const angle = (i / totalFlyingCards) * Math.PI * 2 + Math.random() * 0.35;
        // Thu gọn bán kính xoáy trên màn hình dọc mobile để toàn bộ ảnh bay nằm trọn trong khung hình điện thoại
        const radius = isMobileViewport ? 3.2 + Math.random() * 13 : 6.5 + Math.random() * 20;
        const startY = -14 - Math.random() * 28;

        card.position.x = Math.cos(angle) * radius;
        card.position.z = Math.sin(angle) * radius;
        card.position.y = startY;

        const speedFactor = 1 - Math.min(1, Math.max(0, (radius - 4) / 20));
        card.userData = {
          texIndex: i % sharedTextures.length,
          baseSpeed: 0.09 + speedFactor * 0.05 + Math.random() * 0.02,
          swayPhase: Math.random() * Math.PI * 2,
          angle,
          radius,
          startY,
          flyY: startY,
          // Tham số quỹ đạo xoay vòng tròn quanh thiệp (liền 1 mạch từ lúc đang bay)
          orbitAngle: (i / totalFlyingCards) * Math.PI * 2,
          orbitRadius: (isMobileViewport ? 11.2 : 13.5) + (i % 3) * 1.9,
          orbitHeight: ((i % 7) - 3) * 1.45,
          orbitSpeed: 0.24 + (i % 4) * 0.05,
        };

        flyingCards.push(card);
        flyingGroup.add(card);
      }

      // Dùng chung 8 CanvasTexture cho các biểu tượng bay để tiết kiệm bộ nhớ WebGL trên iPhone/Android
      const heartParticles: any[] = [];
      const symbols = ["🎓", "✨", "🌟", "🎉", "💫", "📜", "🏆", "💖"];
      const symbolTextures = symbols.map((sym) => {
        const sCanvas = document.createElement("canvas");
        sCanvas.width = 128;
        sCanvas.height = 128;
        const ctx = sCanvas.getContext("2d")!;
        ctx.font = "80px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sym, 64, 64);
        return new THREE.CanvasTexture(sCanvas);
      });

      for (let i = 0; i < 56; i++) {
        const spriteMat = new THREE.SpriteMaterial({
          map: symbolTextures[i % symbolTextures.length],
          transparent: true,
          opacity: 0.85,
        });
        const sprite = new THREE.Sprite(spriteMat);
        const scale = 0.65 + Math.random() * 1.05;
        sprite.scale.set(scale, scale, 1);

        const angle = Math.random() * Math.PI * 2;
        const radius = isMobileViewport ? 2.5 + Math.random() * 14 : 5 + Math.random() * 24;
        const startY = -15 - Math.random() * 30;

        sprite.position.set(Math.cos(angle) * radius, startY, Math.sin(angle) * radius);
        sprite.userData = {
          baseSpeed: 0.14 + Math.random() * 0.05,
          swayPhase: Math.random() * Math.PI * 2,
          rotateSpeed: (Math.random() - 0.5) * 0.01,
          angle,
          radius,
        };

        heartParticles.push(sprite);
        flyingGroup.add(sprite);
      }

      // Dùng chung Texture cho các lời chúc Google Sheets bay lên
      const textSprites: any[] = [];
      const uniqueMessages = anonymousWishMessages.slice(0, 12);
      const wishTextures = uniqueMessages.map((message) => {
        const tCanvas = document.createElement("canvas");
        tCanvas.width = 512;
        tCanvas.height = 128;
        const ctx = tCanvas.getContext("2d")!;

        ctx.shadowColor = activePalette.accent;
        ctx.shadowBlur = 18;
        ctx.font = 'bold 32px "Be Vietnam Pro", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const gradient = ctx.createLinearGradient(0, 0, tCanvas.width, 0);
        gradient.addColorStop(0, activePalette.accent);
        gradient.addColorStop(0.5, "#ffffff");
        gradient.addColorStop(1, activePalette.accentGradientTo);
        ctx.fillStyle = gradient;
        ctx.fillText(message, 256, 64);

        return new THREE.CanvasTexture(tCanvas);
      });

      for (let i = 0; i < 24; i++) {
        const spriteMat = new THREE.SpriteMaterial({
          map: wishTextures[i % wishTextures.length],
          transparent: true,
          opacity: 0.95,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(isMobileViewport ? 4.8 : 6, isMobileViewport ? 1.2 : 1.5, 1);

        const angle = Math.random() * Math.PI * 2;
        const radius = isMobileViewport ? 3.5 + Math.random() * 11 : 8 + Math.random() * 18;
        const startY = -15 - Math.random() * 35;

        sprite.position.set(Math.cos(angle) * radius, startY, Math.sin(angle) * radius);
        sprite.userData = {
          baseSpeed: 0.08 + Math.random() * 0.03,
          swayPhase: Math.random() * Math.PI * 2,
          angle,
          radius,
        };

        textSprites.push(sprite);
        flyingGroup.add(sprite);
      }

      // ===== 4. TẤM THIỆP ĐẶC 3D Ở CHÍNH GIỮA (KHỐI HỘP ĐẶC CÓ ĐỘ DÀY VIỀN VÀNG ÁNH KIM) =====
      const card3DGroup = new THREE.Group();
      card3DGroup.visible = false;
      scene.add(card3DGroup);

      const card3DCanvas = document.createElement("canvas");
      let hcmusLogoImg: HTMLImageElement | undefined;
      draw3DGraduationCard(card3DCanvas, recipientLabel, undefined, 0.45);
      const card3DTex = new THREE.CanvasTexture(card3DCanvas);

      // Khối hộp 3D đặc (BoxGeometry có độ dày 0.34) với 4 cạnh bên màu vàng ánh kim đặc và 2 mặt trước/sau là mặt thiệp
      const cardFaceMat = new THREE.MeshBasicMaterial({
        map: card3DTex,
        transparent: true,
        opacity: 1,
      });
      const cardEdgeMat = new THREE.MeshBasicMaterial({
        color: activePalette.accentHex,
        transparent: true,
        opacity: 1,
      });
      const card3DGeo = new THREE.BoxGeometry(11.5, 9.43, 0.34);
      const card3DMesh = new THREE.Mesh(card3DGeo, [
        cardEdgeMat,
        cardEdgeMat,
        cardEdgeMat,
        cardEdgeMat,
        cardFaceMat,
        cardFaceMat,
      ]);
      card3DGroup.add(card3DMesh);

      // Các hạt sao vàng 3D lấp lánh bay quanh mép tấm thiệp đặc 3D (dùng chung 2 texture)
      const sparkleTextures = ["✨", "✦"].map((sym) => {
        const spCanvas = document.createElement("canvas");
        spCanvas.width = 64;
        spCanvas.height = 64;
        const sctx = spCanvas.getContext("2d")!;
        sctx.font = "44px serif";
        sctx.textAlign = "center";
        sctx.textBaseline = "middle";
        sctx.fillText(sym, 32, 32);
        return new THREE.CanvasTexture(spCanvas);
      });

      const cardSparkles: any[] = [];
      for (let i = 0; i < 24; i++) {
        const spMat = new THREE.SpriteMaterial({
          map: sparkleTextures[i % 2],
          transparent: true,
          opacity: 0.9,
        });
        const sp = new THREE.Sprite(spMat);
        sp.scale.set(0.9, 0.9, 1);
        const a = (i / 24) * Math.PI * 2;
        sp.position.set(Math.cos(a) * 6.4, Math.sin(a) * 5.2, 0.3);
        sp.userData = { angle: a, speed: 0.8 + (i % 3) * 0.3 };
        cardSparkles.push(sp);
        card3DGroup.add(sp);
      }

      const logoLoader = new Image();
      logoLoader.crossOrigin = "anonymous";
      logoLoader.onload = () => {
        hcmusLogoImg = logoLoader;
        draw3DGraduationCard(card3DCanvas, recipientLabel, hcmusLogoImg, 0.45);
        card3DTex.needsUpdate = true;
      };
      logoLoader.src = "/logo_hcmus.png";

      // ===== 5. ĐIỀU KHIỂN CAMERA (TỰ ĐỘNG CÂN CHỈNH TỶ LỆ MÀN HÌNH DỌC MOBILE & NGANG DESKTOP) =====
      const getPortraitScale = () => {
        const { w, h } = getViewportSize();
        const asp = w / Math.max(1, h);
        return asp < 1 ? Math.min(2.05, 0.92 / Math.max(0.38, asp)) : 1;
      };

      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };
      let pinchStartDist = 0;
      const initPScale = getPortraitScale();
      const cameraAngle = { x: 0, y: 0.78 };
      const targetCameraAngle = { x: 0, y: 0.78 };
      const userAngleOffset = { x: 0, y: 0 };
      let userZoomOffset = 0;
      let cameraDistance = 13 * initPScale;
      let targetCameraDistance = 13 * initPScale;

      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        userAngleOffset.x -= deltaX * 0.006;
        userAngleOffset.y = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, userAngleOffset.y + deltaY * 0.006),
        );
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };
      const onMouseUp = () => {
        isDragging = false;
      };
      const onWheel = (e: WheelEvent) => {
        if (phaseRef.current === "cover" || phaseRef.current === "letter") return;
        userZoomOffset = Math.max(-10, Math.min(22, userZoomOffset + e.deltaY * 0.012));
      };
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isDragging = true;
          previousMousePosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        } else if (e.touches.length === 2) {
          isDragging = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          pinchStartDist = Math.hypot(dx, dy);
        }
      };
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist > 0) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          const delta = pinchStartDist - dist;
          userZoomOffset = Math.max(-10, Math.min(22, userZoomOffset + delta * 0.04));
          pinchStartDist = dist;
          return;
        }
        if (!isDragging || e.touches.length !== 1) return;
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;
        userAngleOffset.x -= deltaX * 0.0065;
        userAngleOffset.y = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, userAngleOffset.y + deltaY * 0.0065),
        );
        previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      };

      const onResize = () => {
        const { w, h } = getViewportSize();
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      canvas.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("wheel", onWheel, { passive: true });
      canvas.addEventListener("touchstart", onTouchStart, { passive: true });
      canvas.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onMouseUp);
      window.addEventListener("resize", onResize);

      const clock = new THREE.Clock();
      let animId = 0;
      let lastSheenUpdate = 0;

      const animate = () => {
        animId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        const nowSec = performance.now() / 1000;
        const seqElapsed = Math.max(0, nowSec - phaseStartTimeRef.current);
        const currentPhase = phaseRef.current;

        // Cập nhật texture ảnh thật nếu vừa tải xong
        flyingCards.forEach((c) => {
          if (c.material.map !== sharedTextures[c.userData.texIndex]) {
            c.material.map = sharedTextures[c.userData.texIndex];
            c.material.needsUpdate = true;
          }
        });

        // Cập nhật bầu trời sao 3D & các ngôi sao lớn lấp lánh (hiển thị xuyên suốt trên cả mobile)
        starsParticles.rotation.y = time * 0.03;
        starsParticles.rotation.x = Math.sin(time * 0.015) * 0.12;
        ambientStarSprites.forEach((sp) => {
          const pulse = 0.65 + Math.sin(time * 2.5 + sp.userData.phase) * 0.35;
          sp.material.opacity = pulse * 0.85;
          const s = sp.userData.baseScale * (0.85 + pulse * 0.3);
          sp.scale.set(s, s, 1);
          sp.position.y += sp.userData.speed;
          if (sp.position.y > 20) sp.position.y = -20;
        });

        const pScale = getPortraitScale();

        if (currentPhase === "cover") {
          flyingGroup.visible = false;
          card3DGroup.visible = false;
          userAngleOffset.x = 0;
          userAngleOffset.y = 0;
          userZoomOffset = 0;
          cameraAngle.x = Math.sin(time * 0.15) * 0.12;
          cameraAngle.y = 0.78;
          targetCameraAngle.x = cameraAngle.x;
          targetCameraAngle.y = 0.78;
          cameraDistance = 13 * pScale;
          targetCameraDistance = 13 * pScale;
          flyingCards.forEach((c) => {
            c.userData.flyY = c.userData.startY;
          });
        } else {
          // =========================================================================
          // KỊCH BẢN 3D LIỀN 1 MẠCH TRÊN CẢ MOBILE & DESKTOP:
          // - 0.0s -> 8.0s: Góc nhìn từ trên xuống (cameraAngle.y = +0.78), ảnh & lời chúc
          //                 từ dưới bay lên; từ 1.8s tấm thiệp đặc ở giữa CHẬM RÃI hiện dần
          //                 và từ từ bay lướt từ dưới đáy sâu lên tâm (trong suốt 6.2s).
          // - 7.2s -> 14.5s: Mấy tấm ảnh đang bay tự động uốn vào quỹ đạo xoay vòng tròn
          //                  quanh tấm thiệp đặc ở giữa (orbitBlend: 0 -> 1), camera hạ dần
          //                  xuống góc nhìn ngang và lượn quanh thiệp. Người dùng kéo/xoay/zoom
          //                  tự do 360 độ để xem 3D mà không bị khóa cứng.
          // - 14.5s -> 19.2s: VẪN LÀ TẤM THIỆP 3D ĐÓ từ từ di chuyển sát lại màn hình tới đúng
          //                   vị trí cố định ở đầu trang (#hero-card-anchor) và ĐỨNG YÊN LUÔN Ở ĐÓ
          //                   (không hiện thêm tấm thiệp thứ 2 nào ở cảnh 3).
          // - 19.2s+: Sau khi tấm thiệp đã về vị trí cố định, các thẻ lời mời ở dưới mới từ từ hiện ra.
          // =========================================================================
          const cardAppearAlpha = easeInOutCubic((seqElapsed - 1.8) / 3.4);
          const cardRiseP = easeInOutCubic((seqElapsed - 1.8) / 6.2);
          const orbitBlend = easeInOutCubic((seqElapsed - 7.2) / 3.0);
          const focusBlend =
            currentPhase === "letter" ? 1 : easeInOutCubic((seqElapsed - 14.5) / 4.5);

          const { w, h } = getViewportSize();
          const anchorEl = document.getElementById("hero-card-anchor");
          const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null;

          const targetDomWidth =
            anchorRect && anchorRect.width > 100 ? anchorRect.width : Math.min(w - 28, 460);
          const targetDomHeight =
            anchorRect && anchorRect.height > 100 ? anchorRect.height : targetDomWidth * 0.88;
          const targetCenterY =
            anchorRect && anchorRect.height > 100
              ? anchorRect.top + anchorRect.height / 2
              : h * 0.36;

          const tanHalfFov = Math.tan((60 * Math.PI) / 360);
          // Khoảng cách camera để mặt trước tấm thiệp (z = +0.17, rộng 11.5) khớp chính xác chiều rộng targetDomWidth
          const fitDistance = (11.5 * h) / (2 * tanHalfFov * targetDomWidth) + 0.17;
          // Tọa độ Y trong không gian 3D để tâm tấm thiệp khớp chính xác với targetCenterY trên màn hình
          const fitWorldY = 2.0 + ((h / 2 - targetCenterY) * 11.5) / targetDomWidth;
          // Tỷ lệ chiều dọc để khớp chiều cao thẻ ở cuối pha focus
          const fitScaleY = (targetDomHeight / targetDomWidth) * (11.5 / 9.43);

          // Góc nhìn cơ sở cộng với góc xoay tự do của người dùng (userAngleOffset) để không bị fix cứng khi kéo xem 3D
          const baseCamY = 0.78 * (1 - orbitBlend) + 0.1 * orbitBlend;
          const baseCamX =
            (orbitBlend > 0 ? Math.sin(Math.max(0, seqElapsed - 7.2) * 0.42) * 0.82 : 0) *
            orbitBlend;

          const clampedFreeY = Math.max(
            -Math.PI / 2.2,
            Math.min(Math.PI / 2.2, baseCamY + userAngleOffset.y),
          );

          targetCameraAngle.x = (baseCamX + userAngleOffset.x) * (1 - focusBlend);
          targetCameraAngle.y = clampedFreeY * (1 - focusBlend);

          const flyDist = 13 * pScale;
          const orbitDist = 22.5 * pScale;
          const baseDist = flyDist * (1 - orbitBlend) + orbitDist * orbitBlend;
          const freeDist = Math.max(7, baseDist + userZoomOffset);
          targetCameraDistance = freeDist * (1 - focusBlend) + fitDistance * focusBlend;

          // Khi đang trong giai đoạn focus (14.5s -> 19.2s), nội suy mượt mà để tấm thiệp 3D
          // di chuyển sát màn hình và neo cố định ở đúng vị trí đích
          if (focusBlend > 0.01) {
            cameraAngle.x =
              cameraAngle.x * (1 - focusBlend * 0.25) + targetCameraAngle.x * (focusBlend * 0.25);
            cameraAngle.y =
              cameraAngle.y * (1 - focusBlend * 0.25) + targetCameraAngle.y * (focusBlend * 0.25);
            cameraDistance =
              cameraDistance * (1 - focusBlend * 0.25) + targetCameraDistance * (focusBlend * 0.25);
          }

          // 1. CẬP NHẬT CÁC TẤM ẢNH 3D (TỪ BAY DƯỚI LÊN -> TỰ CUỐN VÀO XOAY VÒNG QUANH THIỆP -> DẠT RA KHI FOCUS)
          flyingGroup.visible = focusBlend < 0.98;
          flyingCards.forEach((card, i) => {
            const data = card.userData;

            data.flyY += data.baseSpeed * flySpeed * (1 - orbitBlend * 0.85);
            if (data.flyY > 36 && orbitBlend < 0.5) {
              data.flyY = -22 - Math.random() * 18;
            }
            const flySwayAngle = data.angle + Math.sin(time * 0.25 + data.swayPhase) * 0.04;
            const flyX = Math.cos(flySwayAngle) * data.radius;
            const flyZ = Math.sin(flySwayAngle) * data.radius;
            const flyY = data.flyY;

            const curOrbitAngle = data.orbitAngle + time * data.orbitSpeed;
            const expandRadius =
              data.orbitRadius + Math.sin(time + data.swayPhase) * 1.4 + focusBlend * 14;
            const orbitX = Math.cos(curOrbitAngle) * expandRadius;
            const orbitZ = Math.sin(curOrbitAngle) * expandRadius;
            const orbitY = 2.0 + data.orbitHeight + Math.sin(time * 0.7 + data.swayPhase) * 0.8;

            card.position.x = flyX * (1 - orbitBlend) + orbitX * orbitBlend;
            card.position.y = flyY * (1 - orbitBlend) + orbitY * orbitBlend;
            card.position.z = flyZ * (1 - orbitBlend) + orbitZ * orbitBlend;

            const lookTargetY =
              (card.position.y + 8) * (1 - orbitBlend) +
              (2.0 + data.orbitHeight * 0.4) * orbitBlend;
            card.lookAt(0, lookTargetY, 0);
            card.rotation.z += Math.sin(time + i) * 0.04 * orbitBlend;

            card.material.opacity = Math.max(0, 0.94 * (1 - focusBlend * 1.35));
          });

          // 2. CẬP NHẬT HẠT BIỂU TƯỢNG & LỜI CHÚC GOOGLE SHEETS BAY LÊN
          const particleAlpha = Math.max(0, 1 - easeInOutCubic((seqElapsed - 7.8) / 4.2));
          heartParticles.forEach((heart) => {
            const data = heart.userData;
            heart.visible = particleAlpha > 0.02;
            if (!heart.visible) return;
            heart.position.y += data.baseSpeed * flySpeed;
            const spiralAngle = data.angle + time * 0.1;
            heart.position.x = Math.cos(spiralAngle) * data.radius;
            heart.position.z = Math.sin(spiralAngle) * data.radius;
            heart.material.rotation += data.rotateSpeed;
            heart.material.opacity = 0.85 * particleAlpha;

            if (heart.position.y > 40) {
              heart.position.y = -20 - Math.random() * 20;
            }
          });

          textSprites.forEach((text) => {
            const data = text.userData;
            text.visible = particleAlpha > 0.02;
            if (!text.visible) return;
            text.position.y += data.baseSpeed * flySpeed;
            const swayAngle = data.angle + Math.sin(time * 0.15 + data.swayPhase) * 0.1;
            text.position.x = Math.cos(swayAngle) * data.radius;
            text.position.z = Math.sin(swayAngle) * data.radius;
            text.material.opacity =
              (0.75 + Math.sin(time * 2 + data.swayPhase) * 0.2) * particleAlpha;

            if (text.position.y > 38) {
              text.position.y = -18 - Math.random() * 22;
            }
          });

          // 3. CẬP NHẬT TẤM THIỆP ĐẶC Ở GIỮA:
          // Hiện lên từ từ ở cảnh 2 -> di chuyển gần màn hình đến vị trí cố định luôn ở cảnh 3
          // (không ẩn đi và không cần hiện thêm tấm thiệp HTML nào khác ở cảnh 3)
          if (seqElapsed < 1.8) {
            card3DGroup.visible = false;
          } else {
            const finalCardAlpha = cardAppearAlpha;

            card3DGroup.visible = finalCardAlpha > 0.01;
            cardFaceMat.opacity = finalCardAlpha;
            cardEdgeMat.opacity = finalCardAlpha;

            // Từ dưới sâu (-22) chậm rãi lướt lên tâm (2.0), sau đó ở pha focus từ từ di chuyển tới đúng vị trí fitWorldY
            const risingY = -22 + cardRiseP * 24;
            const floatOffset = Math.sin(time * 1.6) * 0.18 * (1 - focusBlend);
            const currentY = (risingY + floatOffset) * (1 - focusBlend) + fitWorldY * focusBlend;
            card3DGroup.position.set(0, currentY, 0);

            // Chiều cao tấm thiệp 3D từ từ khớp với khung thiệp đích khi tiến sát màn hình
            const currentScaleY = 1 * (1 - focusBlend) + fitScaleY * focusBlend;
            card3DGroup.scale.set(1, currentScaleY, 1);

            const tiltUpWhenRising = -0.58 * (1 - orbitBlend);
            const gentleRockX = Math.cos(time * 0.8) * 0.06 * (1 - focusBlend);
            const spinWhenRising = (1 - cardRiseP) * Math.PI * 0.65;
            const gentleRockY = Math.sin(time * 0.85) * 0.22 * (1 - focusBlend);

            card3DGroup.rotation.x = (tiltUpWhenRising + gentleRockX) * (1 - focusBlend);
            card3DGroup.rotation.y = (spinWhenRising + gentleRockY) * (1 - focusBlend);
            card3DGroup.rotation.z = Math.sin(time * 0.6) * 0.025 * (1 - focusBlend);

            if (time - lastSheenUpdate > 0.08) {
              lastSheenUpdate = time;
              draw3DGraduationCard(card3DCanvas, recipientLabel, hcmusLogoImg, time * 0.38);
              card3DTex.needsUpdate = true;
            }

            cardSparkles.forEach((sp, idx) => {
              const a = sp.userData.angle + time * 0.4;
              sp.position.x = Math.cos(a) * 6.35;
              sp.position.y = Math.sin(a) * 5.05;
              sp.position.z = 0.35 + Math.sin(time * 2 + idx) * 0.25;
              sp.material.opacity =
                (0.45 + Math.sin(time * 3.5 + idx) * 0.5) * finalCardAlpha * (1 - focusBlend * 0.85);
            });
          }
        }

        const lerpFactor = 0.065;
        cameraAngle.x += (targetCameraAngle.x - cameraAngle.x) * lerpFactor;
        cameraAngle.y += (targetCameraAngle.y - cameraAngle.y) * lerpFactor;
        cameraDistance += (targetCameraDistance - cameraDistance) * lerpFactor;

        const x = cameraDistance * Math.sin(cameraAngle.x) * Math.cos(cameraAngle.y);
        const y = cameraDistance * Math.sin(cameraAngle.y);
        const z = cameraDistance * Math.cos(cameraAngle.x) * Math.cos(cameraAngle.y);

        camera.position.set(x, y + 2.0, z);
        camera.lookAt(0, 2.0, 0);

        renderer.render(scene, camera);
      };

      animate();

      cleanupFn = () => {
        cancelAnimationFrame(animId);
        canvas.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        canvas.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onMouseUp);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
      };
    };

    initThreeScene();

    return () => {
      if (waitTimer) window.clearTimeout(waitTimer);
      if (cleanupFn) cleanupFn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishes.length, recipientLabel, palette.preset]);

  return (
    <div
      className={`fixed inset-0 w-screen overflow-hidden select-none ${
        phase === "flying" || phase === "gallery"
          ? "z-30"
          : "pointer-events-none z-0"
      }`}
      style={{
        width: "100vw",
        height: "100dvh",
        minHeight: "100vh",
        background: palette.universeBg,
      }}
    >
      <canvas
        ref={canvasRef}
        id="canvas3d"
        className="block h-full w-full"
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
      />
      {(phase === "flying" || phase === "gallery") && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <p className="rounded-full border border-white/20 bg-black/35 px-4 py-1.5 text-center text-[11px] italic text-white/90 backdrop-blur-sm">
            Lướt hoặc zoom để nhìn kĩ hình của mình nhé
          </p>
        </div>
      )}
    </div>
  );
}
