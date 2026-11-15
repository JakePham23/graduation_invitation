import { useEffect, useRef, useState } from "react";
import { CEREMONY_INFO } from "@/config/ceremony";
import { useThemePalette } from "@/config/theme";

interface FloatingMusicPlayerProps {
  playTrigger: number;
}

export function FloatingMusicPlayer({ playTrigger }: FloatingMusicPlayerProps) {
  const palette = useThemePalette();
  const tracks = CEREMONY_INFO.soundTracks;
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = tracks[currentTrackIndex] || tracks[0];

  // Khi người dùng bấm "MỞ THƯ MỜI", playTrigger tăng lên và tự động phát nhạc nền
  useEffect(() => {
    if (playTrigger <= 0) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        setIsPlaying(false);
      });
  }, [playTrigger]);

  function handleTogglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }

  function handleSelectTrack(idx: number) {
    const audio = audioRef.current;
    if (!audio) return;
    if (idx === currentTrackIndex) {
      handleTogglePlay();
      return;
    }
    setCurrentTrackIndex(idx);
    audio.src = tracks[idx].src;
    audio.load();
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
    setMenuOpen(false);
  }

  return (
    <div className="fixed bottom-5 right-4 z-[60] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      <audio
        ref={audioRef}
        src={currentTrack.src}
        loop
        preload="auto"
        onEnded={() => {
          const nextIdx = (currentTrackIndex + 1) % tracks.length;
          handleSelectTrack(nextIdx);
        }}
      />

      {/* Bảng chọn bài nhạc (/sound/1.mp3, /sound/2.mp3) */}
      {menuOpen && (
        <div
          className="mb-1 w-52 overflow-hidden rounded-2xl border bg-white/95 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur-md"
          style={{ borderColor: `rgba(${palette.accentRgb}, 0.6)` }}
        >
          <div className="mb-1.5 flex items-center justify-between border-b border-slate-100 px-2 pb-1.5">
            <span
              className="font-playfair text-[11px] font-bold uppercase tracking-wider"
              style={{ color: palette.primary }}
            >
              Chọn Nhạc Nền
            </span>
            <button
              type="button"
              onClick={handleTogglePlay}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: palette.primary, color: palette.accent }}
            >
              {isPlaying ? "Tạm dừng" : "Phát nhạc"}
            </button>
          </div>

          <div className="space-y-1">
            {tracks.map((track, idx) => {
              const active = idx === currentTrackIndex;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleSelectTrack(idx)}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                    active
                      ? "font-medium text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  style={active ? { backgroundColor: palette.primary } : undefined}
                >
                  <span className="truncate">{track.label}</span>
                  <span className="ml-2 text-[10px]" style={{ color: palette.accent }}>
                    {active ? (isPlaying ? "♫ Đang phát" : "⏸ Dừng") : `Bài ${idx + 1}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nút tròn Equalizer */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="rounded-full border bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide shadow-md backdrop-blur-sm transition hover:bg-white"
          style={{
            borderColor: `rgba(${palette.accentRgb}, 0.6)`,
            color: palette.primary,
          }}
          title="Chọn bài nhạc nền"
        >
          ♫ Bài {currentTrackIndex + 1}/{tracks.length}
        </button>

        <button
          type="button"
          onClick={handleTogglePlay}
          title={isPlaying ? "Bấm để tắt nhạc" : "Bấm để bật nhạc"}
          aria-label="Bật hoặc tắt nhạc nền"
          className="group relative flex h-12 w-12 items-center justify-center rounded-full border-[2.5px] transition-transform duration-200 hover:scale-105 active:scale-95"
          style={{
            borderColor: palette.accent,
            backgroundColor: palette.primary,
            boxShadow: `0 6px 22px rgba(${palette.primaryRgb}, 0.45)`,
          }}
        >
          <div className="flex h-4 items-end justify-center gap-[3px]">
            {(
              [
                { cls: "eq-bar-1", idle: "h-[4px]" },
                { cls: "eq-bar-2", idle: "h-[9px]" },
                { cls: "eq-bar-3", idle: "h-[6px]" },
                { cls: "eq-bar-4", idle: "h-[12px]" },
              ] as const
            ).map((bar, i) => (
              <span
                key={i}
                className={`w-[3px] rounded-full transition-all ${
                  isPlaying ? bar.cls : bar.idle
                }`}
                style={{
                  backgroundImage: `linear-gradient(to top, ${palette.accentGradientFrom}, ${palette.accentGradientTo})`,
                }}
              />
            ))}
          </div>
        </button>
      </div>
    </div>
  );
}
