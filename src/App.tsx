import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, GraduationCap, LogOut, MapPin, Search, ShieldCheck } from "lucide-react";
import { CEREMONY_INFO } from "@/config/ceremony";
import { decryptInvitation, encryptInvitation, sha256Hex } from "@/lib/crypto";
import {
  fetchInvitationsFromSheet,
  fetchThemePresetFromSheet,
  fetchWishes,
  isSheetsConfigured,
  saveThemePresetToSheet,
  verifyServerPepper,
} from "@/services/sheetsApi";
import type { ThemePreset } from "@/config/theme";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { UnlockDialog } from "@/components/UnlockDialog";
import { BlurPasswordGate } from "@/components/BlurPasswordGate";
import { CoverLetterView } from "@/components/CoverLetterView";
import { GuestbookSection } from "@/components/GuestbookSection";
import { GraduationCardHero } from "@/components/GraduationCardHero";
import { Universe3DTransition, type ExperiencePhase } from "@/components/Universe3DTransition";
import { FloatingMusicPlayer } from "@/components/FloatingMusicPlayer";
import { AdminInvitationManager } from "@/components/AdminInvitationManager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type {
  CoverLetterSecret,
  EncryptedInvitationRecord,
  WishEntry,
} from "@/types/invitation";

const fallbackInvitationModules = import.meta.glob<EncryptedInvitationRecord[]>(
  "./data/encrypted-invitations.json",
  { eager: true, import: "default" },
);
const INITIAL_INVITATIONS: EncryptedInvitationRecord[] =
  Object.values(fallbackInvitationModules)[0] ?? [];
const ADMIN_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH?.trim() || "";

const ROUTE_ALIASES: Record<string, string> = {
  "hoi-ban-dai-hoc-e127b36c": "bandaihoc",
  "ba-me-gia-dinh-b94e5498": "giadinh",
};

function loadInitialInvitations(): EncryptedInvitationRecord[] {
  try {
    const saved = localStorage.getItem("grad_admin_encrypted_invitations");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Bỏ qua lỗi đọc localStorage
  }
  return isSheetsConfigured() ? [] : INITIAL_INVITATIONS;
}

function extractRouteSlug(): string | null {
  const hash = window.location.hash;
  const hashMatch = hash.match(/^#\/(?:i\/)?([a-zA-Z0-9_-]+)/);
  if (hashMatch && hashMatch[1]) {
    const raw = hashMatch[1];
    return ROUTE_ALIASES[raw] || raw;
  }

  const pathname = window.location.pathname.replace(/\/+$/, "");
  if (pathname && pathname !== "/" && pathname !== "/index.html") {
    const pathMatch = pathname.match(/^\/(?:i\/)?([a-zA-Z0-9_-]+)$/);
    if (pathMatch && pathMatch[1]) {
      const raw = pathMatch[1];
      return ROUTE_ALIASES[raw] || raw;
    }
  }

  return null;
}

export function App() {
  const [routeHash, setRouteHash] = useState<string | null>(() => extractRouteSlug());
  const [guestStage, setGuestStage] = useState<ExperiencePhase>("cover");
  const [passwordGateOpen, setPasswordGateOpen] = useState(false);
  const [musicPlayTrigger, setMusicPlayTrigger] = useState(0);
  const timersRef = useRef<number[]>([]);

  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(
    () => sessionStorage.getItem("grad_admin_ok") === "1",
  );
  const [themePreset, setThemePreset] = useState<"classic" | "pastel">(() => {
    const saved = localStorage.getItem("grad_theme_preset");
    return saved === "pastel" ? "pastel" : "classic";
  });
  const [adminError, setAdminError] = useState("");
  const [sheetAdminHashes, setSheetAdminHashes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("grad_admin_sheet_hashes");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((h) => typeof h === "string" && h.trim()) : [];
    } catch {
      return [];
    }
  });

  const [invitationsList, setInvitationsList] = useState<EncryptedInvitationRecord[]>(
    () => loadInitialInvitations(),
  );
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<EncryptedInvitationRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unlockedMap, setUnlockedMap] = useState<Record<string, CoverLetterSecret>>({});
  const [activeLetterId, setActiveLetterId] = useState<string | null>(null);

  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [sheetsInvitationsLoading, setSheetsInvitationsLoading] = useState<boolean>(() =>
    isSheetsConfigured(),
  );

  const [wishes, setWishes] = useState<WishEntry[]>([]);
  const [wishesLoading, setWishesLoading] = useState(false);
  const [wishesError, setWishesError] = useState("");

  function clearSequenceTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }

  /**
   * Kịch bản chuyển cảnh 3D liền 1 mạch:
   * 1. "flying" (0s -> 7.2s): Ảnh & lời chúc từ Google Sheets bay từ dưới lên; tấm thiệp đặc 3D từ từ chậm rãi hiện dần và lướt từ đáy sâu lên tâm
   * 2. "gallery" (7.2s -> 14.5s): Các tấm ảnh đang bay tự động uốn vào xoay vòng tròn xung quanh tấm thiệp đặc ở giữa
   * 3. "focus" (14.5s -> 19.2s): Vẫn là tấm thiệp đó từ từ di chuyển sát lại màn hình tới đúng vị trí phù hợp ở đầu trang (#hero-card-anchor)
   * 4. "letter" (19.2s+): Sau khi tấm thiệp đã yên vị ở vị trí phù hợp, các thẻ lời mời bên dưới mới từ từ hiện ra lần lượt và lướt nhẹ lên
   */
  function start3DSequence() {
    clearSequenceTimers();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setGuestStage("flying");

    const t1 = window.setTimeout(() => {
      setGuestStage("gallery");
    }, 7200);

    const t2 = window.setTimeout(() => {
      setGuestStage("focus");
    }, 14500);

    const t3 = window.setTimeout(() => {
      setGuestStage("letter");
    }, 19200);

    const t4 = window.setTimeout(() => {
      window.scrollTo({ top: Math.min(window.innerHeight * 0.28, 220), behavior: "smooth" });
    }, 20200);

    timersRef.current = [t1, t2, t3, t4];
  }

  function handleChangeThemePreset(next: ThemePreset) {
    setThemePreset(next);
    if (isSheetsConfigured()) {
      void saveThemePresetToSheet(next).catch(() => {
        // Bỏ qua nếu Apps Script chưa cập nhật action=setTheme
      });
    }
  }

  useEffect(() => {
    if (themePreset === "pastel") {
      document.documentElement.dataset.theme = "pastel";
    } else {
      delete document.documentElement.dataset.theme;
    }
    localStorage.setItem("grad_theme_preset", themePreset);
  }, [themePreset]);

  useEffect(() => {
    return () => clearSequenceTimers();
  }, []);

  useEffect(() => {
    const onLocationChange = () => {
      clearSequenceTimers();
      const next = extractRouteSlug();
      setRouteHash(next);
      setGuestStage("cover");
      setPasswordGateOpen(false);
      if (!next) {
        setActiveLetterId(null);
      }
      setGuestError("");
    };
    window.addEventListener("hashchange", onLocationChange);
    window.addEventListener("popstate", onLocationChange);
    return () => {
      window.removeEventListener("hashchange", onLocationChange);
      window.removeEventListener("popstate", onLocationChange);
    };
  }, []);

  useEffect(() => {
    if (!isSheetsConfigured()) return;
    fetchThemePresetFromSheet()
      .then((remotePreset) => {
        if (remotePreset) {
          setThemePreset(remotePreset);
        }
      })
      .catch(() => {
        // Bỏ qua nếu Apps Script chưa bật action=getTheme
      });
    setWishesLoading(true);
    fetchWishes()
      .then((list) => setWishes(list))
      .catch((err) =>
        setWishesError(err instanceof Error ? err.message : "Không thể tải lời chúc."),
      )
      .finally(() => setWishesLoading(false));

    // Tự động đồng bộ danh sách thiệp 18 cột từ Google Sheets (nếu có)
    fetchInvitationsFromSheet()
      .then(async (sheetPlainList) => {
        if (!sheetPlainList || sheetPlainList.length === 0) return;
        const encryptedFromSheet: EncryptedInvitationRecord[] = [];
        const secretsFromSheet: Record<string, CoverLetterSecret> = {};
        for (const item of sheetPlainList) {
          const enc = await encryptInvitation(item);
          encryptedFromSheet.push(enc);
          secretsFromSheet[item.id] = {
            salutation: item.salutation,
            opening_story: item.opening_story,
            heartfelt_message: item.heartfelt_message,
            invitation_body: item.invitation_body,
            event_date: item.event_date,
            ceremony_time: item.ceremony_time,
            photo_time_slot: item.photo_time_slot,
            venue_detail: item.venue_detail,
            parking_and_map: item.parking_and_map,
            dress_code: item.dress_code,
            emergency_contact: item.emergency_contact,
            closing_signature: item.closing_signature,
            rsvp_status_options: item.rsvp_status_options,
            post_ceremony_party: item.post_ceremony_party || "",
          };
        }
        setInvitationsList(encryptedFromSheet);
        localStorage.setItem(
          "grad_admin_encrypted_invitations",
          JSON.stringify(encryptedFromSheet),
        );
        if (!extractRouteSlug()) {
          setUnlockedMap(secretsFromSheet);
        }
        localStorage.setItem("grad_admin_plain_invitations", JSON.stringify(sheetPlainList));

        const extractedHashes = Array.from(
          new Set(
            sheetPlainList
              .map((item) => item.admin_password_hash?.trim().toLowerCase() || "")
              .filter(Boolean),
          ),
        );
        if (extractedHashes.length > 0) {
          setSheetAdminHashes(extractedHashes);
          localStorage.setItem("grad_admin_sheet_hashes", JSON.stringify(extractedHashes));
        }
      })
      .catch(() => {
        // Bỏ qua nếu Apps Script chưa bật action=invitations
      })
      .finally(() => {
        setSheetsInvitationsLoading(false);
      });
  }, []);

  const guestRouteRecord = useMemo(
    () =>
      routeHash
        ? invitationsList.find(
            (i) => i.route_hash.toLowerCase() === routeHash.toLowerCase(),
          ) ?? null
        : null,
    [routeHash, invitationsList],
  );

  const filteredInvitations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return invitationsList;
    return invitationsList.filter(
      (item) =>
        item.recipient_label.toLowerCase().includes(q) ||
        item.relationship_tag.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.route_hash.toLowerCase().includes(q),
    );
  }, [searchQuery, invitationsList]);

  async function handleAdminLogin(password: string) {
    setAdminError("");
    const inputHash = (await sha256Hex(password)).toLowerCase();
    let validHashes = Array.from(
      new Set([ADMIN_HASH.toLowerCase(), ...sheetAdminHashes].filter(Boolean)),
    );

    if (!validHashes.includes(inputHash) && isSheetsConfigured()) {
      try {
        const freshSheetList = await fetchInvitationsFromSheet();
        const freshHashes = Array.from(
          new Set(
            freshSheetList
              .map((item) => item.admin_password_hash?.trim().toLowerCase() || "")
              .filter(Boolean),
          ),
        );
        if (freshHashes.length > 0) {
          setSheetAdminHashes(freshHashes);
          localStorage.setItem("grad_admin_sheet_hashes", JSON.stringify(freshHashes));
          validHashes = Array.from(new Set([ADMIN_HASH.toLowerCase(), ...freshHashes].filter(Boolean)));
        }
      } catch {
        // Bỏ qua nếu không kết nối được Google Sheets
      }
    }

    if (validHashes.length === 0) {
      setAdminError(
        "Chưa cấu hình VITE_ADMIN_PASSWORD_HASH trong .env.local hoặc cột admin_password_hash trên Google Sheet.",
      );
      return;
    }
    if (!validHashes.includes(inputHash)) {
      setAdminError("Mật khẩu quản trị không chính xác.");
      return;
    }
    sessionStorage.setItem("grad_admin_ok", "1");
    setAdminUnlocked(true);
  }

  function handleAdminLogout() {
    sessionStorage.removeItem("grad_admin_ok");
    setAdminUnlocked(false);
    setActiveLetterId(null);
  }

  async function handleOpenInvitationClick() {
    if (!guestRouteRecord) return;
    setMusicPlayTrigger((prev) => prev + 1);

    if (unlockedMap[guestRouteRecord.id]) {
      start3DSequence();
      return;
    }

    setGuestError("");
    setPasswordGateOpen(true);
  }

  async function handleGuestGateSubmit(password: string) {
    if (!guestRouteRecord) return;
    setGuestLoading(true);
    setGuestError("");
    try {
      let privatePepper = "";
      if (guestRouteRecord.uses_server_pepper) {
        privatePepper = await verifyServerPepper(guestRouteRecord.id, password);
      }
      const secret = await decryptInvitation(guestRouteRecord, password, privatePepper);
      setUnlockedMap((prev) => ({ ...prev, [guestRouteRecord.id]: secret }));
      setPasswordGateOpen(false);
      start3DSequence();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setGuestError(
        msg.includes("Google Sheets") || msg.includes("kết nối")
          ? msg
          : "Mật khẩu chưa chính xác hoặc không khớp khóa giải mã.",
      );
    } finally {
      setGuestLoading(false);
    }
  }

  function handleEnvelopeClick(record: EncryptedInvitationRecord) {
    if (unlockedMap[record.id]) {
      setActiveLetterId(record.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSelectedRecord(record);
    setDialogOpen(true);
  }

  function handleUnlocked(id: string, secret: CoverLetterSecret) {
    setUnlockedMap((prev) => ({ ...prev, [id]: secret }));
    setActiveLetterId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToGuestbook() {
    setActiveLetterId(null);
    setTimeout(() => {
      document.getElementById("guestbook")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  // ============================================================================
  // CHẾ ĐỘ 1: KHÁCH MỞ ĐƯỜNG DẪN QR (Ví dụ: /bandaihoc)
  // ============================================================================
  if (routeHash) {
    if (!guestRouteRecord && sheetsInvitationsLoading) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-5 text-center">
          <div className="max-w-md border border-navy/20 p-8">
            <h1 className="font-display text-2xl font-semibold text-navy">
              Đang tải thiệp mời...
            </h1>
            <p className="mt-2 text-sm text-sage">
              Vui lòng chờ giây lát trong khi đồng bộ dữ liệu từ Google Sheets.
            </p>
          </div>
        </div>
      );
    }

    if (!guestRouteRecord) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-5 text-center">
          <div className="max-w-md border border-navy/20 p-8">
            <h1 className="font-display text-3xl font-semibold text-navy">
              Đường dẫn thiệp mời không hợp lệ
            </h1>
            <p className="mt-2 text-sm text-sage">
              Liên kết <span className="font-mono text-navy">/{routeHash}</span> không tồn tại. Vui
              lòng kiểm tra lại mã QR hoặc đường dẫn mà {CEREMONY_INFO.graduateName} đã gửi cho bạn.
            </p>
          </div>
        </div>
      );
    }

    const guestSecret = unlockedMap[guestRouteRecord.id] ?? null;

    // Chỉ hiển thị tấm thiệp HTML ở trang bìa ban đầu ("cover").
    // Từ Cảnh 2 sang Cảnh 3, chính tấm thiệp 3D từ Cảnh 2 đã di chuyển gần màn hình đến vị trí cố định luôn,
    // nên tấm thiệp HTML ở Cảnh 3 KHÔNG xuất hiện nữa (chỉ giữ khung neo trong suốt #hero-card-anchor để các thẻ lời mời bên dưới nằm ngay dưới tấm thiệp 3D).
    let cardTransformClass = "";
    if (guestStage === "cover") {
      cardTransformClass =
        "cover-card-slow-appear translate-y-[10vh] scale-100 opacity-100 transition-all duration-1000 ease-out";
    } else {
      cardTransformClass =
        "pointer-events-none translate-y-[2vh] scale-100 opacity-0";
    }

    const isLetterVisible = guestStage === "letter" && Boolean(guestSecret);

    return (
      <div
        className={`relative min-h-[100dvh] w-full text-ink ${
          isLetterVisible ? "overflow-x-hidden" : "h-[100dvh] overflow-hidden"
        }`}
      >
        {/* Nền Vũ Trụ Sao 3D cố định xuyên suốt phía sau */}
        <Universe3DTransition
          phase={guestStage}
          recipientLabel={guestRouteRecord.recipient_label}
          wishes={wishes}
        />

        {/* Nút nhạc nền Equalizer */}
        <FloatingMusicPlayer playTrigger={musicPlayTrigger} />

        {/* Cột nội dung chính trên điện thoại: chừa viền hai bên & khoảng hở giữa các thẻ để thấy rõ nền Vũ Trụ Sao 3D */}
        <main className="relative z-10 mx-auto min-h-[100dvh] w-full max-w-[460px] px-3.5 py-3 sm:px-0">
          <div id="hero-card-anchor" className={cardTransformClass}>
            <GraduationCardHero
              recipientLabel={guestRouteRecord.recipient_label}
              showOpenButton={guestStage === "cover"}
              openButtonLoading={guestLoading}
              shimmering={guestStage !== "cover"}
              onOpenClick={handleOpenInvitationClick}
              onReplay3D={isLetterVisible ? start3DSequence : undefined}
            />
          </div>

          {/* Sau khi tấm thiệp đã di chuyển sát màn hình về vị trí phù hợp, các thẻ lời mời bên dưới mới từ từ hiện ra lần lượt */}
          {guestSecret && (
            <div
              className={`origin-top transition-all duration-[1800ms] ease-out ${
                isLetterVisible
                  ? "letter-sections-stagger mt-5 translate-y-0 opacity-100"
                  : "pointer-events-none h-0 translate-y-16 overflow-hidden opacity-0"
              }`}
            >
              <CoverLetterView
                record={guestRouteRecord}
                secret={guestSecret}
                isGuestMode
                hideTopCard
                onReplay3D={start3DSequence}
                wishes={wishes}
                wishesLoading={wishesLoading}
                wishesError={wishesError}
                onWishAdded={(wish) => setWishes((prev) => [wish, ...prev])}
              />
            </div>
          )}
        </main>

        {passwordGateOpen && (
          <BlurPasswordGate
            badge={guestRouteRecord.relationship_tag}
            title={`Thiệp gửi: ${guestRouteRecord.recipient_label}`}
            description="Vui lòng nhập mật khẩu để mở niêm phong và bước vào không gian thư mời 3D."
            hint={guestRouteRecord.password_hint}
            submitLabel="Mở thư mời 3D"
            loading={guestLoading}
            error={guestError}
            onSubmit={handleGuestGateSubmit}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // CHẾ ĐỘ 2: TRANG CHỦ (/) — CHỈ DÀNH CHO CHỦ NHÂN (ADMIN)
  // ============================================================================
  const activeRecord = activeLetterId
    ? invitationsList.find((i) => i.id === activeLetterId) ?? null
    : null;
  const activeSecret = activeLetterId ? unlockedMap[activeLetterId] ?? null : null;

  return (
    <div className="min-h-screen bg-paper text-ink">
      {!adminUnlocked && (
        <BlurPasswordGate
          badge="Khu vực riêng tư (Admin)"
          title="Trang quản trị thiệp mời"
          description="Trang chủ chứa danh sách khách mời và các đường dẫn QR riêng tư (như /bandaihoc), chỉ dành cho chủ nhân buổi lễ truy cập."
          submitLabel="Đăng nhập quản trị"
          error={adminError}
          onSubmit={handleAdminLogin}
        />
      )}

      <div className={adminUnlocked ? "" : "pointer-events-none select-none blur-md"}>
        <header className="border-b border-navy/15">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <button
              type="button"
              onClick={() => setActiveLetterId(null)}
              className="flex items-center gap-2.5 text-left focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold bg-navy text-gold">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="font-display text-lg font-semibold text-navy">
                Kỷ yếu &amp; Thiệp mời 2026
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 rounded-full border border-navy/15 bg-paper p-0.5 text-xs"
                role="group"
                aria-label="Chọn bảng màu thiệp"
              >
                <button
                  type="button"
                  onClick={() => handleChangeThemePreset("classic")}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
                    themePreset === "classic"
                      ? "bg-navy text-paper shadow-sm"
                      : "text-sage hover:text-navy"
                  }`}
                  title="Bảng màu Navy & Gold cổ điển"
                >
                  <span className="h-2.5 w-2.5 rounded-full border border-paper/40 bg-[#14213D]" />
                  <span className="hidden sm:inline">Navy</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeThemePreset("pastel")}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
                    themePreset === "pastel"
                      ? "bg-navy text-paper shadow-sm"
                      : "text-sage hover:text-navy"
                  }`}
                  title="Bảng màu Hồng Pastel"
                >
                  <span className="h-2.5 w-2.5 rounded-full border border-paper/40 bg-[#D9779B]" />
                  <span className="hidden sm:inline">Hồng Pastel</span>
                </button>
              </div>
              <span className="hidden items-center gap-1 text-xs text-sage md:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5 text-gold" />
                Admin
              </span>
              <Button variant="outline" size="sm" onClick={scrollToGuestbook}>
                Sổ lưu bút
              </Button>
              <Button variant="ghost" size="sm" onClick={handleAdminLogout} title="Khóa trang chủ">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5">
          {activeRecord && activeSecret ? (
            <CoverLetterView
              record={activeRecord}
              secret={activeSecret}
              onBack={() => setActiveLetterId(null)}
              wishes={wishes}
              wishesLoading={wishesLoading}
              wishesError={wishesError}
              onWishAdded={(wish) => setWishes((prev) => [wish, ...prev])}
            />
          ) : (
            <>
              <section className="grid gap-8 border-b border-navy/15 py-12 lg:grid-cols-12 lg:items-end">
                <div className="lg:col-span-7">
                  <p className="text-sm font-medium text-gold">{CEREMONY_INFO.degreeTitle}</p>
                  <h1 className="mt-2 font-display text-4xl font-semibold leading-[1.12] text-navy sm:text-6xl">
                    {CEREMONY_INFO.graduateName}
                  </h1>
                  <p className="mt-2 text-sm text-sage">{CEREMONY_INFO.university}</p>
                  <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-ink">
                    {CEREMONY_INFO.quote}
                  </p>
                </div>

                <aside className="border border-navy/20 bg-navy p-6 text-paper lg:col-span-5">
                  <h2 className="font-display text-2xl font-semibold text-gold">
                    Thông tin buổi lễ
                  </h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex items-start gap-2.5">
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      <div>
                        <dt className="text-xs text-paper/70">Ngày &amp; Giờ</dt>
                        <dd className="font-medium">{CEREMONY_INFO.dateDisplay}</dd>
                        <dd className="text-xs text-paper/80">{CEREMONY_INFO.ceremonyTime}</dd>
                        <dd className="text-xs text-paper/80">{CEREMONY_INFO.photoTime}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      <div>
                        <dt className="text-xs text-paper/70">Địa điểm</dt>
                        <dd className="font-medium">{CEREMONY_INFO.venue}</dd>
                      </div>
                    </div>
                  </dl>
                </aside>
              </section>

              <section className="py-12">
                <AdminInvitationManager
                  invitations={invitationsList}
                  unlockedMap={unlockedMap}
                  editingRecordId={editingRecordId}
                  onClearEditingRecord={() => setEditingRecordId(null)}
                  onUpdateInvitations={(nextEnc, nextUnlocked) => {
                    setInvitationsList(nextEnc);
                    setUnlockedMap(nextUnlocked);
                  }}
                />

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="font-display text-3xl font-semibold text-navy">
                      Danh sách phong bì &amp; Link QR riêng
                    </h2>
                    <p className="mt-1 text-sm text-sage">
                      Sao chép đường dẫn (ví dụ: <span className="font-mono text-navy">/bandaihoc</span>) để tạo mã QR hoặc gửi trực tiếp cho bạn bè.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm tên hoặc đường dẫn..."
                      className="pl-9"
                    />
                  </div>
                </div>

                {filteredInvitations.length === 0 ? (
                  <p className="mt-6 text-sm text-sage">
                    Không tìm thấy phong bì phù hợp với từ khóa “{searchQuery}”.
                  </p>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredInvitations.map((record) => (
                      <EnvelopeCard
                        key={record.id}
                        record={record}
                        isUnlocked={Boolean(unlockedMap[record.id])}
                        onSelect={handleEnvelopeClick}
                        onEdit={(rec) => setEditingRecordId(rec.id)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <GuestbookSection
                wishes={wishes}
                loading={wishesLoading}
                error={wishesError}
                onWishAdded={(wish) => setWishes((prev) => [wish, ...prev])}
              />
            </>
          )}
        </main>

        <footer className="border-t border-navy/15 py-6 text-center text-xs text-sage">
          {CEREMONY_INFO.graduateName} — Thiệp mời tốt nghiệp 2026
        </footer>

        <UnlockDialog
          record={selectedRecord}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onUnlocked={handleUnlocked}
        />
      </div>
    </div>
  );
}

export default App;
