import { MailOpen, Sparkles } from "lucide-react";
import { CEREMONY_INFO } from "@/config/ceremony";
import { useThemePalette } from "@/config/theme";
import { StoleRibbon } from "@/components/StoleRibbon";

interface GraduationCardHeroProps {
  recipientLabel: string;
  showOpenButton?: boolean;
  openButtonLoading?: boolean;
  shimmering?: boolean;
  onOpenClick?: () => void;
  onReplay3D?: () => void;
}

export function GraduationCardHero({
  recipientLabel,
  showOpenButton = false,
  openButtonLoading = false,
  shimmering = false,
  onOpenClick,
  onReplay3D,
}: GraduationCardHeroProps) {
  const palette = useThemePalette();

  return (
    <section
      className={`relative w-full overflow-hidden pb-5 transition-shadow duration-700 ${
        shimmering ? "border-2" : "border shadow-2xl"
      }`}
      style={{
        background: palette.cardBg,
        borderColor: shimmering
          ? `rgba(${palette.accentRgb}, 0.85)`
          : `rgba(${palette.primaryRgb}, 0.2)`,
        boxShadow: shimmering
          ? `0 0 45px rgba(${palette.accentRgb}, 0.45), 0 20px 50px rgba(${palette.primaryRgb}, 0.45)`
          : undefined,
      }}
    >
      {/* Lớp ánh sáng đánh bóng (Shimmer Polish Sweep) và hạt lấp lánh khi thiệp bay lên */}
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
        <div className="card-polish-sheen absolute -inset-y-10 left-0 w-1/2" />
        <span
          className="sparkle-star absolute left-14 top-3 text-base"
          style={{
            animationDelay: "0.1s",
            color: palette.accent,
            filter: `drop-shadow(0 0 8px rgba(${palette.accentRgb}, 0.9))`,
          }}
        >
          ✦
        </span>
        <span
          className="sparkle-star absolute right-14 top-5 text-sm"
          style={{
            animationDelay: "0.8s",
            color: palette.accent,
            filter: `drop-shadow(0 0 8px rgba(${palette.accentRgb}, 0.9))`,
          }}
        >
          ✨
        </span>
        <span
          className="sparkle-star absolute bottom-8 left-16 text-sm"
          style={{
            animationDelay: "1.3s",
            color: palette.accent,
            filter: `drop-shadow(0 0 8px rgba(${palette.accentRgb}, 0.9))`,
          }}
        >
          ✦
        </span>
        <span
          className="sparkle-star absolute bottom-10 right-16 text-base"
          style={{
            animationDelay: "0.4s",
            color: palette.accent,
            filter: `drop-shadow(0 0 8px rgba(${palette.accentRgb}, 0.9))`,
          }}
        >
          ✨
        </span>
      </div>
      {/* Sóng lụa nền nhẹ giống ảnh mẫu */}
      <svg
        viewBox="0 0 600 500"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
      >
        <path
          d="M0,120 C160,60 320,210 600,90 L600,260 C380,340 200,190 0,290 Z"
          fill="#ffffff"
          fillOpacity="0.7"
        />
        <path
          d="M0,330 C210,250 410,410 600,300 L600,500 L0,500 Z"
          fill={palette.waveFill}
          fillOpacity="0.28"
        />
      </svg>

      {/* Bố cục Flexbox 3 cột: [Stole Trái] - [Nội dung trung tâm] - [Stole Phải] đảm bảo KHÔNG BAO GIỜ chồng lấp */}
      <div className="relative z-10 flex w-full items-start justify-between gap-1.5 px-2 sm:gap-2.5 sm:px-3.5">
        {/* CỘT 1: Dải băng Stole Trái */}
        <div className="pointer-events-none shrink-0">
          <StoleRibbon side="left">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/90 bg-white shadow sm:h-9 sm:w-9">
                <img
                  src="/logo_hcmus.png"
                  alt="Logo HCMUS"
                  className="h-full w-full scale-105 object-cover"
                />
              </div>
              <div className="flex items-center gap-0.5">
                <span className="h-px w-2 bg-white/60 sm:w-2.5" />
                <span className="h-1 w-1 rounded-full bg-white/80" />
                <span className="h-px w-2 bg-white/60 sm:w-2.5" />
              </div>
            </div>

            <div
              className="flex flex-col items-center gap-1 font-display text-xs font-bold tracking-widest sm:gap-1.5 sm:text-sm"
              style={{ color: palette.accent }}
            >
              <span>H</span>
              <span>C</span>
              <span>M</span>
              <span>U</span>
              <span>S</span>
            </div>

            <div className="font-display text-[10px] font-semibold italic leading-tight tracking-wider text-white sm:text-xs">
              <div>2022</div>
              <div className="text-[9px]" style={{ color: palette.accent }}>—</div>
              <div>2026</div>
            </div>
          </StoleRibbon>
        </div>

        {/* CỘT 2: Phần trung tâm thiệp mời */}
        <div className="flex min-h-[400px] min-w-0 flex-1 flex-col items-center justify-between py-6 text-center sm:min-h-[440px] sm:py-8">
          {/* Header trường (căn giữa gọn gàng, không chạm 2 dải băng) */}
          <div className="flex items-center justify-center gap-2">
            <img
              src="/logo_hcmus.png"
              alt="HCMUS"
              className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
            />
            <div className="text-left leading-tight">
              <p
                className="text-[9px] font-bold tracking-wide sm:text-[10.5px]"
                style={{ color: palette.primary }}
              >
                {CEREMONY_INFO.universityVi}
              </p>
              <p
                className="text-[8px] font-medium tracking-wide sm:text-[9.5px]"
                style={{ color: palette.subText }}
              >
                {CEREMONY_INFO.universityEn}
              </p>
            </div>
          </div>

          {/* Tiêu đề Graduation Ceremony + Mũ cử nhân */}
          <div className="relative my-3 select-none px-4 sm:my-5">
            <svg
              viewBox="0 0 64 48"
              aria-hidden="true"
              className="absolute -right-2 -top-5 h-8 w-10 rotate-12 drop-shadow sm:-right-3 sm:-top-6 sm:h-9 sm:w-11"
            >
              <polygon
                points="32,4 62,16 32,28 2,16"
                fill="#1f2937"
                stroke="#111827"
                strokeWidth="1.5"
              />
              <path d="M16,22 L16,34 C16,38 48,38 48,34 L48,22 L32,28 Z" fill="#111827" />
              <path
                d="M32,16 L52,22 L52,36"
                fill="none"
                stroke={palette.accent}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="52" cy="37" r="2.8" fill={palette.accent} />
            </svg>

            <h1
              className="font-display text-[34px] font-semibold leading-none tracking-tight drop-shadow-sm sm:text-[42px]"
              style={{ color: palette.bodyText }}
            >
              <span
                className="font-calligraphy pr-0.5 text-[52px] font-normal sm:text-[64px]"
                style={{ color: palette.primary }}
              >
                G
              </span>
              raduation
            </h1>
            <p
              className="-mt-1 font-display text-[26px] font-medium tracking-wide drop-shadow-sm sm:text-[32px]"
              style={{ color: palette.bodyText }}
            >
              Ceremon
              <span
                className="font-calligraphy pl-0.5 text-[44px] font-normal sm:text-[52px]"
                style={{ color: palette.primary }}
              >
                y
              </span>
            </p>
          </div>

          {/* Khối Trân trọng kính mời */}
          <div className="w-full max-w-[230px] space-y-1.5 sm:max-w-[260px]">
            <p className="font-display text-base italic sm:text-lg" style={{ color: palette.bodyText }}>
              Trân trọng kính mời
            </p>
            <div
              className="border-b border-dashed pb-1"
              style={{ borderColor: `rgba(${palette.primaryRgb}, 0.6)` }}
            >
              <p
                className="font-script text-2xl font-bold sm:text-[28px]"
                style={{ color: palette.primary }}
              >
                {recipientLabel}
              </p>
            </div>
            <p className="font-display text-sm italic sm:text-base" style={{ color: palette.bodyText }}>
              Tới dự Lễ Tốt Nghiệp
            </p>
          </div>

          {/* Nút MỞ THƯ MỜI ở màn hình đầu tiên hoặc nút Xem lại 3D khi đã mở */}
          {showOpenButton && onOpenClick && (
            <div className="mt-4 w-full pt-1">
              <button
                type="button"
                onClick={onOpenClick}
                disabled={openButtonLoading}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 sm:px-7 sm:py-3"
                style={{
                  borderColor: palette.accent,
                  backgroundColor: palette.primary,
                  boxShadow: `0 8px 25px rgba(${palette.primaryRgb}, 0.38)`,
                }}
              >
                <MailOpen
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-12"
                  style={{ color: palette.accent }}
                />
                <span>{openButtonLoading ? "ĐANG MỞ THƯ..." : "MỞ THƯ MỜI"}</span>
                <Sparkles className="h-3.5 w-3.5 animate-pulse" style={{ color: palette.accent }} />
              </button>
            </div>
          )}

          {!showOpenButton && onReplay3D && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onReplay3D}
                className="inline-flex items-center gap-1.5 rounded-full border bg-white/85 px-3.5 py-1.5 text-[11px] font-medium shadow-sm transition hover:bg-white"
                style={{
                  borderColor: `rgba(${palette.primaryRgb}, 0.25)`,
                  color: palette.primary,
                }}
              >
                <span>✨</span>
                <span>Xem lại hiệu ứng 3D Ký Ức</span>
              </button>
            </div>
          )}
        </div>

        {/* CỘT 3: Dải băng Stole Phải */}
        <div className="pointer-events-none shrink-0">
          <StoleRibbon side="right">
            <div className="flex flex-col items-center gap-1">
              <span
                className="font-calligraphy text-lg font-bold sm:text-xl"
                style={{ color: palette.accent }}
              >
                {CEREMONY_INFO.cohort}
              </span>
              <div className="flex items-center gap-0.5">
                <span className="h-px w-2 bg-white/60 sm:w-2.5" />
                <span className="h-1 w-1 rounded-full bg-white/80" />
                <span className="h-px w-2 bg-white/60 sm:w-2.5" />
              </div>
            </div>

            <p
              className="whitespace-nowrap font-script text-base font-semibold tracking-[0.12em] text-white sm:text-lg"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {CEREMONY_INFO.graduateName}
            </p>

            <div className="font-display text-[9.5px] font-semibold italic uppercase leading-tight tracking-widest text-white sm:text-[11px]">
              <div>NGÀNH</div>
              <div style={{ color: palette.accent }}>{CEREMONY_INFO.major}</div>
            </div>
          </StoleRibbon>
        </div>
      </div>
    </section>
  );
}
