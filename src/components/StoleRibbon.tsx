import type { ReactNode } from "react";
import { useThemePalette } from "@/config/theme";

interface StoleRibbonProps {
  side: "left" | "right";
  children: ReactNode;
}

/**
 * Dải băng cử nhân sử dụng đúng hình học vector từ public/origin/SVG/Asset-2.svg (trái)
 * và public/origin/SVG/Asset-1.svg (phải), bổ sung đường viền trắng bên trong và hoa văn mũi nhọn.
 */
export function StoleRibbon({ side, children }: StoleRibbonProps) {
  const palette = useThemePalette();
  const isLeft = side === "left";

  const outerPolygon = isLeft
    ? "936.718,350.757 936.718,4549.351 776.503,4708.798 468.359,5015.534 160.215,4708.798 0,4549.351 0,0 13.308,4.991 48.116,18.043 160.215,60.016 776.503,290.741"
    : "936.718,0 936.718,4549.351 776.503,4708.798 468.359,5015.534 160.215,4708.798 0,4549.351 0,350.757 160.215,290.741 776.503,60.016 905.238,11.773 935.438,0.512";

  const innerBorder = isLeft
    ? "852,392 852,4512 468.359,4895 85,4512 85,112"
    : "852,112 852,4512 468.359,4895 85,4512 85,392";

  return (
    <div className="relative h-[400px] w-[46px] shrink-0 select-none sm:h-[440px] sm:w-[56px]">
      <svg
        viewBox="0 0 936.718 5015.534"
        preserveAspectRatio="none"
        className="h-full w-full drop-shadow-md"
        aria-hidden="true"
      >
        <polygon points={outerPolygon} fill={palette.primary} />
        <polyline
          points={innerBorder}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="22"
          strokeOpacity="0.9"
          strokeLinejoin="miter"
        />
        {/* Hoa văn mũi nhọn trắng ở chân dải băng */}
        <g transform="translate(468.359, 4630)" fill="#FFFFFF" fillOpacity="0.92">
          <path d="M0,-145 C32,-85 45,-30 0,30 C-45,-30 -32,-85 0,-145 Z" />
          <path d="M-28,-25 C-95,-75 -140,-45 -130,15 C-90,10 -55,-5 -28,-25 Z" />
          <path d="M28,-25 C95,-75 140,-45 130,15 C90,10 55,-5 28,-25 Z" />
          <circle cx="0" cy="65" r="18" />
        </g>
      </svg>

      {/* Nội dung nằm gọn bên trong dải băng */}
      <div className="absolute inset-x-1 bottom-11 top-5 flex flex-col items-center justify-between py-1.5 text-center sm:inset-x-1.5 sm:bottom-12 sm:top-6">
        {children}
      </div>
    </div>
  );
}
