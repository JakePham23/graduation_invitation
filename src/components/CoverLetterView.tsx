import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarPlus, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CEREMONY_INFO } from "@/config/ceremony";
import { useThemePalette } from "@/config/theme";
import { GraduationCardHero } from "@/components/GraduationCardHero";
import { GuestbookSection } from "@/components/GuestbookSection";
import { submitRsvp, isSheetsConfigured } from "@/services/sheetsApi";
import type {
  CoverLetterSecret,
  EncryptedInvitationRecord,
  WishEntry,
} from "@/types/invitation";

interface CoverLetterViewProps {
  record: EncryptedInvitationRecord;
  secret: CoverLetterSecret;
  isGuestMode?: boolean;
  hideTopCard?: boolean;
  onBack?: () => void;
  onReplay3D?: () => void;
  wishes: WishEntry[];
  wishesLoading: boolean;
  wishesError: string;
  onWishAdded: (wish: WishEntry) => void;
}

function detectIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPhoneIPad = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIPhoneIPad || isIPadOS;
}

function buildGoogleCalendarUrl(secret: CoverLetterSecret): string {
  const { title, startUtc, endUtc, location } = CEREMONY_INFO.calendarEvent;
  const details = `${secret.salutation}\n${secret.invitation_body}\nLễ trao bằng: ${secret.ceremony_time}\nChụp hình: ${secret.photo_time_slot}\nĐịa điểm: ${secret.venue_detail}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details,
    location: `${secret.venue_detail} — ${location}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIOSCalendarIcs(secret: CoverLetterSecret) {
  const { title, startUtc, endUtc, location } = CEREMONY_INFO.calendarEvent;
  const description = `${secret.invitation_body} | Chụp hình: ${secret.photo_time_slot} | Địa điểm: ${secret.venue_detail}`.replace(
    /\n/g,
    "\\n",
  );
  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PhamTanNghia//Graduation2026//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:grad-2026-${Date.now()}@hcmus.edu.vn`,
    `DTSTAMP:${startUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${secret.venue_detail} - ${location}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Nhắc lịch dự Lễ Tốt Nghiệp Phạm Tân Nghĩa",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const icsContent = icsLines.join("\r\n");
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "le-tot-nghiep-pham-tan-nghia-2026.ics");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function CoverLetterView({
  record,
  secret,
  isGuestMode = false,
  hideTopCard = false,
  onBack,
  onReplay3D,
  wishes,
  wishesLoading,
  wishesError,
  onWishAdded,
}: CoverLetterViewProps) {
  const palette = useThemePalette();
  const [selectedRsvp, setSelectedRsvp] = useState(secret.rsvp_status_options[0] || "");
  const [rsvpNote, setRsvpNote] = useState("");
  const [rsvpSaving, setRsvpSaving] = useState(false);
  const [rsvpDone, setRsvpDone] = useState(false);
  const [rsvpError, setRsvpError] = useState("");

  // Đồng hồ đếm ngược tới 28/11/2026 07:30:00 (GMT+7)
  const [countdown, setCountdown] = useState({ days: "00", hours: "00", mins: "00", secs: "00" });

  useEffect(() => {
    const targetTime = new Date("2026-11-28T07:30:00+07:00").getTime();
    const updateTimer = () => {
      const diff = Math.max(0, targetTime - Date.now());
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCountdown({
        days: String(d).padStart(2, "0"),
        hours: String(h).padStart(2, "0"),
        mins: String(m).padStart(2, "0"),
        secs: String(s).padStart(2, "0"),
      });
    };
    updateTimer();
    const id = window.setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, []);

  const isIOS = useMemo(() => detectIsIOS(), []);
  const googleCalUrl = useMemo(() => buildGoogleCalendarUrl(secret), [secret]);

  function handleCalendarClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isIOS) {
      e.preventDefault();
      downloadIOSCalendarIcs(secret);
    }
  }

  async function handleRsvpSubmit() {
    if (!selectedRsvp) return;
    setRsvpSaving(true);
    setRsvpError("");
    try {
      if (isSheetsConfigured()) {
        await submitRsvp({
          id: record.id,
          recipientLabel: record.recipient_label,
          rsvpStatus: selectedRsvp,
          note: rsvpNote,
        });
      }
      setRsvpDone(true);
    } catch (err) {
      setRsvpError(err instanceof Error ? err.message : "Không thể gửi xác nhận.");
    } finally {
      setRsvpSaving(false);
    }
  }

  return (
    <article
      className={
        isGuestMode
          ? "mx-auto w-full max-w-[480px] space-y-4 bg-transparent pb-12 pt-2"
          : "mx-auto max-w-[540px] space-y-5 bg-transparent py-5 sm:py-8"
      }
    >
      {!isGuestMode && onBack && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-white/20 bg-white/90 px-4 py-3 backdrop-blur-md">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <span className="font-mono text-xs text-sage">/{record.route_hash}</span>
        </div>
      )}

      {/* BÌA THIỆP TỐT NGHIỆP (Chỉ hiển thị khi không dùng chung tấm thiệp liên tục ở trang khách) */}
      {!hideTopCard && (
        <GraduationCardHero
          recipientLabel={record.recipient_label}
          showOpenButton={false}
          onReplay3D={onReplay3D}
        />
      )}

      {/* 1. KHỐI TRÍCH DẪN & TÂM THƯ (Thẻ nổi bo góc để lộ nền Vũ Trụ 3D xung quanh trên Mobile) */}
      <section
        aria-label="Tâm thư kỷ niệm"
        className="relative overflow-hidden rounded-[20px] border border-gold/35 px-5 py-8 text-center shadow-[0_12px_32px_rgba(10,16,36,0.45)] backdrop-blur-md sm:px-6"
        style={{
          background: palette.cardBg,
        }}
      >
        <div className="mx-auto max-w-[420px]">
          <div className="font-playfair text-3xl leading-none text-gold">❝</div>
          <h2 className="mt-2 font-playfair text-xl font-bold italic text-navy sm:text-2xl">
            {secret.salutation}
          </h2>
          <p className="mt-3 font-display text-[17.5px] italic leading-[1.75] text-slate-700 sm:text-[18.5px]">
            {secret.opening_story} {secret.heartfelt_message}
          </p>
          <div className="mt-2 font-playfair text-3xl leading-none text-gold">❞</div>
          {secret.closing_signature && (
            <p className="mt-3 font-calligraphy text-2xl text-navy sm:text-3xl">
              {secret.closing_signature}
            </p>
          )}
        </div>
      </section>

      {/* 2. THÔNG TIN LỄ TỐT NGHIỆP & THÂN MỜI */}
      <section
        aria-label="Thông tin lễ tốt nghiệp"
        className="relative overflow-hidden rounded-[20px] border border-gold/35 px-5 py-9 text-center shadow-[0_12px_32px_rgba(10,16,36,0.45)] backdrop-blur-md sm:px-7"
        style={{
          background: palette.cardBg,
        }}
      >
        <div className="font-playfair text-lg font-bold uppercase tracking-[3px] text-navy sm:text-xl">
          THÔNG TIN LỄ TỐT NGHIỆP
        </div>

        <p className="mt-5 font-display text-lg text-slate-600">Trân trọng kính mời</p>

        <div className="mt-2 inline-block rounded-full border border-gold/45 bg-navy px-7 py-2 font-script text-2xl font-bold text-gold shadow-md sm:text-3xl">
          {record.recipient_label}
        </div>

        <p className="mx-auto mt-3 max-w-[360px] font-display text-[17px] italic leading-relaxed text-slate-700">
          {secret.invitation_body}
        </p>

        {/* Đường phân cách hoa thị ✦ */}
        <div className="my-6 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-gold/50" />
          <span className="text-sm text-gold">✦</span>
          <div className="h-px w-16 bg-gold/50" />
        </div>

        {/* Tên Tân Cử Nhân chữ nghệ thuật lớn */}
        <div className="py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[3px] text-gold">
            TÂN CỬ NHÂN CÔNG NGHỆ THÔNG TIN • {CEREMONY_INFO.cohort}
          </div>
          <div className="mt-3 font-calligraphy text-5xl leading-tight text-navy sm:text-6xl">
            {CEREMONY_INFO.graduateName}
          </div>
          <div className="mt-1.5 font-lora text-xs italic text-slate-500">
            ({CEREMONY_INFO.university})
          </div>
        </div>
      </section>

      {/* 3. THỜI GIAN HYPERLINK ADD CALENDAR & ĐỊA ĐIỂM GOOGLE MAPS */}
      <section
        aria-label="Thời gian và Địa điểm"
        className="overflow-hidden rounded-[20px] border border-gold/35 px-4 py-7 shadow-[0_12px_32px_rgba(10,16,36,0.45)] backdrop-blur-md sm:px-6"
        style={{
          background: palette.cardBg,
        }}
      >
        <div className="mx-auto max-w-[500px]">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[3px] text-gold">
              ✦ LỊCH TRÌNH ĐÓN TIẾP ✦
            </p>
            <h3 className="mt-1 font-playfair text-2xl font-bold text-navy sm:text-3xl">
              Lễ Trao Bằng &amp; Chụp Hình
            </h3>
            {secret.event_date && (
              <p className="mt-1 font-display text-sm italic text-slate-600">
                {secret.event_date}
              </p>
            )}
          </div>

          {/* Bảng Ngày Tháng Sang Trọng (Bấm vào để Add Calendar iOS / Google Calendar) */}
          <div className="mt-6 text-center">
            <a
              href={isIOS ? "#add-ios-calendar" : googleCalUrl}
              target={isIOS ? undefined : "_blank"}
              rel={isIOS ? undefined : "noreferrer"}
              onClick={handleCalendarClick}
              className="group inline-flex items-center justify-center gap-5 rounded-2xl border border-gold/30 bg-white/90 px-6 py-4 text-navy shadow-[0_6px_24px_rgba(35,49,105,0.06)] transition hover:border-gold hover:shadow-md"
              title={
                isIOS
                  ? "Bấm để thêm vào Lịch iPhone/iOS (Apple Calendar)"
                  : "Bấm để thêm vào Google Calendar"
              }
            >
              <div className="text-right leading-tight">
                <div className="font-playfair text-sm font-bold tracking-wider sm:text-base">
                  <span className="cap-vn">T</span>HỨ
                </div>
                <div className="font-playfair text-sm font-bold tracking-wider sm:text-base">
                  <span className="cap-vn">B</span>ẢY
                </div>
              </div>

              <div className="h-10 w-px bg-navy/25" />

              <div className="font-playfair text-5xl font-bold leading-none text-navy transition group-hover:text-gold">
                28
              </div>

              <div className="h-10 w-px bg-navy/25" />

              <div className="text-left leading-tight">
                <div className="font-calligraphy text-2xl text-gold">Tháng 11</div>
                <div className="font-playfair text-sm font-bold tracking-[2px] text-navy sm:text-base">
                  2026
                </div>
              </div>
            </a>

            <div className="mt-3">
              <a
                href={isIOS ? "#add-ios-calendar" : googleCalUrl}
                target={isIOS ? undefined : "_blank"}
                rel={isIOS ? undefined : "noreferrer"}
                onClick={handleCalendarClick}
                className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-navy px-5 py-2 text-xs font-semibold tracking-wider text-white shadow-sm transition hover:bg-navy/90"
              >
                <CalendarPlus className="h-3.5 w-3.5 text-gold" />
                <span>
                  {isIOS
                    ? "Thêm vào Lịch iPhone (Apple Calendar)"
                    : "Thêm vào Google Calendar"}
                </span>
                <ExternalLink className="h-3 w-3 text-gold" />
              </a>
            </div>
          </div>

          {/* Thẻ Địa Điểm Tổ Chức (Bo góc 16px, Header xanh Navy, Nút Google Maps) */}
          <div className="mt-6 overflow-hidden rounded-[16px] border border-gold/25 bg-white shadow-[0_8px_30px_rgba(35,49,105,0.07)]">
            <div className="flex items-center gap-3.5 bg-navy px-5 py-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white p-0.5">
                <img
                  src="/logo_hcmus.png"
                  alt="HCMUS"
                  className="h-full w-full rounded-full object-contain"
                />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-semibold uppercase tracking-[2px] text-gold">
                  ĐỊA ĐIỂM TỔ CHỨC
                </div>
                <div className="mt-0.5 font-playfair text-base font-bold text-white sm:text-lg">
                  Trường ĐH Khoa Học Tự Nhiên
                </div>
              </div>
            </div>

            <div className="space-y-3.5 p-5 text-left text-sm">
              <div className="flex items-start gap-3">
                <span className="text-base leading-none">📍</span>
                <div>
                  <div className="font-playfair text-xs font-bold uppercase tracking-wider text-navy">
                    Địa điểm &amp; Điểm hẹn
                  </div>
                  <div className="mt-0.5 text-[13.5px] leading-relaxed text-slate-600">
                    {secret.venue_detail}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-base leading-none">⏰</span>
                <div>
                  <div className="font-playfair text-xs font-bold uppercase tracking-wider text-navy">
                    Khung giờ đón tiếp (Bấm để lưu lịch)
                  </div>
                  <a
                    href={isIOS ? "#add-ios-calendar" : googleCalUrl}
                    target={isIOS ? undefined : "_blank"}
                    rel={isIOS ? undefined : "noreferrer"}
                    onClick={handleCalendarClick}
                    className="mt-0.5 block text-[13.5px] font-semibold text-navy underline decoration-gold underline-offset-4"
                  >
                    Chụp hình giao lưu: {secret.photo_time_slot}
                  </a>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Lễ trong hội trường: {secret.ceremony_time}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-base leading-none">🛵</span>
                <div className="w-full">
                  <div className="font-playfair text-xs font-bold uppercase tracking-wider text-navy">
                    Gửi xe &amp; Di chuyển
                  </div>
                  <div className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed">
                    {String(secret.parking_and_map || "")
                      .split("|")
                      .map((part) => part.trim())
                      .filter(Boolean)
                      .map((optionText, idx, arr) =>
                        idx === 0 ? (
                          <div
                            key={idx}
                            className="rounded-lg border border-gold/35 bg-paper px-2.5 py-1.5 font-bold text-navy"
                          >
                            <span className="mr-1.5 inline-block rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                              Khuyến khích
                            </span>
                            <span>{optionText}</span>
                          </div>
                        ) : (
                          <div
                            key={idx}
                            className="pl-1 text-slate-600"
                          >
                            <span className="mr-1.5 font-semibold text-slate-500">
                              {arr.length > 2 ? `• Lựa chọn ${idx + 1}:` : "• Hoặc:"}
                            </span>
                            <span>{optionText}</span>
                          </div>
                        ),
                      )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2.5 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f8fafc] p-3 text-xs">
                  <div className="font-playfair font-bold text-navy">👔 Trang phục gợi ý</div>
                  <div className="mt-1 text-slate-600">{secret.dress_code}</div>
                </div>
                <div className="rounded-xl bg-[#f8fafc] p-3 text-xs">
                  <div className="font-playfair font-bold text-navy">📞 Liên hệ hỗ trợ</div>
                  <div className="mt-1 text-slate-600">{secret.emergency_contact}</div>
                </div>
              </div>

              <a
                href={CEREMONY_INFO.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-xs font-semibold uppercase tracking-[1.5px] text-white shadow-sm transition hover:bg-navy/90"
              >
                <span>🗺 XEM ĐƯỜNG ĐI (GOOGLE MAPS)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ĐẾM NGƯỢC NGÀY TỐT NGHIỆP (Tham khảo #countdown-section của ThiepCuoiTuMA) */}
      <section aria-label="Đếm ngược ngày tốt nghiệp">
        <div
          className="mx-auto max-w-[500px] rounded-[20px] border border-gold/35 px-5 py-7 text-center shadow-[0_12px_32px_rgba(10,16,36,0.45)] backdrop-blur-md"
          style={{
            background:
              "linear-gradient(145deg, rgba(240,248,255,0.95) 0%, rgba(255,255,255,0.96) 65%, rgba(254,252,245,0.95) 100%)",
          }}
        >
          <h3 className="font-playfair text-xl font-bold tracking-wide text-navy sm:text-2xl">
            Đếm Ngược Ngày Tốt Nghiệp
          </h3>
          <div className="mt-5 flex items-center justify-center gap-3 sm:gap-5">
            <div className="flex min-w-[60px] flex-col items-center rounded-xl bg-white px-3 py-2.5 shadow-sm border border-gold/20">
              <span className="font-playfair text-2xl font-bold text-gold sm:text-3xl">
                {countdown.days}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-navy">Ngày</span>
            </div>
            <span className="font-playfair text-xl font-bold text-navy">:</span>
            <div className="flex min-w-[60px] flex-col items-center rounded-xl bg-white px-3 py-2.5 shadow-sm border border-gold/20">
              <span className="font-playfair text-2xl font-bold text-gold sm:text-3xl">
                {countdown.hours}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-navy">Giờ</span>
            </div>
            <span className="font-playfair text-xl font-bold text-navy">:</span>
            <div className="flex min-w-[60px] flex-col items-center rounded-xl bg-white px-3 py-2.5 shadow-sm border border-gold/20">
              <span className="font-playfair text-2xl font-bold text-gold sm:text-3xl">
                {countdown.mins}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-navy">Phút</span>
            </div>
            <span className="font-playfair text-xl font-bold text-navy">:</span>
            <div className="flex min-w-[60px] flex-col items-center rounded-xl bg-white px-3 py-2.5 shadow-sm border border-gold/20">
              <span className="font-playfair text-2xl font-bold text-gold sm:text-3xl">
                {countdown.secs}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-navy">Giây</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. XÁC NHẬN THAM GIA (RSVP) */}
      {secret.rsvp_status_options.length > 0 && (
        <section aria-label="Xác nhận tham gia">
          <div
            className="mx-auto max-w-[500px] rounded-[20px] border border-gold/35 p-6 shadow-[0_12px_32px_rgba(10,16,36,0.45)] backdrop-blur-md sm:p-7"
            style={{
              background:
                "linear-gradient(155deg, rgba(255,255,255,0.96) 0%, rgba(244,248,255,0.95) 60%, rgba(253,250,242,0.95) 100%)",
            }}
          >
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[3px] text-gold">
                ✦ PHẢN HỒI THAM DỰ ✦
              </p>
              <h3 className="mt-1 font-playfair text-2xl font-bold text-navy">
                Xác Nhận Tham Gia
              </h3>
              <p className="mt-1 font-lora text-xs italic text-slate-600">
                Chọn khung giờ bạn sẽ đến để mình chuẩn bị đón tiếp chu đáo nhất nhé
              </p>
            </div>

            {rsvpDone ? (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 p-3.5 text-xs font-medium text-navy sm:text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
                <span>Đã ghi nhận phản hồi của bạn. Hẹn gặp bạn tại buổi lễ nhé!</span>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex flex-col gap-2">
                  {secret.rsvp_status_options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedRsvp(option)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-xs font-medium transition-all ${
                        selectedRsvp === option
                          ? "border-navy bg-navy text-white shadow-sm"
                          : "border-gold/30 bg-white text-slate-700 hover:border-navy"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={rsvpNote}
                  onChange={(e) => setRsvpNote(e.target.value)}
                  placeholder="Tên của bạn hoặc lời nhắn hẹn giờ (tùy chọn)..."
                  className="w-full rounded-xl border border-gold/35 bg-white px-4 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-navy focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleRsvpSubmit}
                  disabled={rsvpSaving}
                  className="w-full rounded-xl bg-gold py-3 text-xs font-semibold uppercase tracking-[2px] text-white shadow-md transition hover:bg-[#b08309] disabled:opacity-60"
                >
                  {rsvpSaving ? "ĐANG GỬI XÁC NHẬN..." : "XÁC NHẬN THAM GIA ✦"}
                </button>

                {rsvpError && (
                  <p className="text-center text-xs text-crimson">{rsvpError}</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6. LỜI MỜI ĂN UỐNG / TIỆC THÂN MẬT (Tham khảo #reception của ThiepCuoiTuMA) */}
      {secret.post_ceremony_party && (
        <section aria-label="Lời mời ăn uống">
          <div className="mx-auto max-w-[500px] overflow-hidden rounded-[20px] border border-gold/35 bg-white/95 shadow-[0_12px_32px_rgba(10,16,36,0.45)] backdrop-blur-md">
            <div className="bg-navy px-5 py-3.5 text-left">
              <div className="text-[10px] font-semibold uppercase tracking-[2px] text-gold">
                KHAI TIỆC THÂN MẬT • LỜI MỜI ĂN UỐNG
              </div>
              <div className="mt-0.5 font-playfair text-base font-bold text-white sm:text-lg">
                Tiệc Chung Vui Sau Lễ Tốt Nghiệp
              </div>
            </div>
            <div className="p-5 text-left">
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">🥂</span>
                <p className="font-lora text-sm leading-relaxed text-slate-700">
                  {secret.post_ceremony_party}
                </p>
              </div>
              <p className="mt-4 text-right font-calligraphy text-3xl text-navy">
                {secret.closing_signature}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 7. LỜI CHÚC GỬI ĐẾN & SHOW CÁC LỜI CHÚC GOOGLE SHEET ẨN DANH */}
      <GuestbookSection
        wishes={wishes}
        loading={wishesLoading}
        error={wishesError}
        onWishAdded={onWishAdded}
        compact
      />

      {/* 8. NÚT VÀO LẠI KHÔNG GIAN 3D INTRO Ở CUỐI THƯ MỜI */}
      {isGuestMode && onReplay3D && (
        <section aria-label="Trải nghiệm lại không gian 3D" className="pb-10 pt-2 text-center">
          <div className="mx-auto max-w-[500px] rounded-[20px] border border-white/25 bg-white/10 px-5 py-5 backdrop-blur-md">
            <button
              type="button"
              onClick={onReplay3D}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gold bg-navy px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-lg transition hover:scale-105 active:scale-95"
            >
              <span>✨</span>
              <span>Trải nghiệm lại không gian 3D Ký Ức</span>
            </button>
            <p className="mt-2.5 text-xs italic text-white/80">
              Lướt hoặc zoom để nhìn kĩ hình của mình nhé
            </p>
          </div>
        </section>
      )}
    </article>
  );
}
