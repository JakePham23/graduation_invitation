import { useState, type FormEvent } from "react";
import { CheckCircle2, EyeOff } from "lucide-react";
import { CEREMONY_INFO } from "@/config/ceremony";
import { useThemePalette } from "@/config/theme";
import { isSheetsConfigured, submitWish } from "@/services/sheetsApi";
import type { WishEntry } from "@/types/invitation";

interface GuestbookSectionProps {
  wishes: WishEntry[];
  loading: boolean;
  error: string;
  onWishAdded: (wish: WishEntry) => void;
  compact?: boolean;
}

export function GuestbookSection({
  wishes,
  loading,
  error,
  onWishAdded,
  compact = false,
}: GuestbookSectionProps) {
  const palette = useThemePalette();
  const [relationship, setRelationship] = useState("Hội Bạn Đại Học");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const displayWishes: WishEntry[] =
    wishes.length > 0
      ? wishes
      : CEREMONY_INFO.defaultFlyingWishes.slice(0, 5).map((msg, idx) => ({
          id: `sample-${idx}`,
          name: "Bạn ẩn danh",
          relationship: "Hội Bạn Đại Học",
          message: msg,
          createdAt: "11/2026",
        }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setFormError("");
    setSubmittedSuccess(false);

    try {
      if (isSheetsConfigured()) {
        const created = await submitWish({
          name: "Bạn ẩn danh",
          relationship: relationship.trim() || "Hội Bạn Đại Học",
          message: message.trim(),
        });
        onWishAdded(created);
      } else {
        const localWish: WishEntry = {
          id: `local-${Date.now()}`,
          name: "Bạn ẩn danh",
          relationship: relationship.trim() || "Hội Bạn Đại Học",
          message: message.trim(),
          createdAt: new Date().toLocaleDateString("vi-VN"),
        };
        onWishAdded(localWish);
      }
      setMessage("");
      setSubmittedSuccess(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không thể gửi lời chúc.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="guestbook"
      className={compact ? "pb-6 pt-0" : "py-10"}
    >
      <div
        className="mx-auto max-w-[500px] overflow-hidden rounded-[20px] border border-gold/35 p-6 shadow-[0_12px_32px_rgba(10,16,36,0.45)] backdrop-blur-md sm:p-8"
        style={{
          background: palette.cardBg,
        }}
      >
        {/* Tiêu đề theo phong cách ThiepCuoiTuMA */}
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[3px] text-gold">
            ✦ SỔ LƯU BÚT KỶ YẾU ✦
          </p>
          <h3 className="mt-1.5 font-playfair text-2xl font-bold tracking-wide text-navy sm:text-3xl">
            Lời Chúc Mừng
          </h3>
          <div className="my-3 flex items-center justify-center gap-2.5">
            <span className="h-px w-12 bg-gold/45" />
            <span className="text-xs text-gold">✦</span>
            <span className="h-px w-12 bg-gold/45" />
          </div>
          <p className="font-lora text-xs italic text-slate-600">
            Mọi lời chúc đều được lưu ẩn danh trên Google Sheets
          </p>
        </div>

        {/* Form gửi lời chúc */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <input
              type="text"
              maxLength={60}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="Nhóm bạn / Kỷ niệm (hiển thị ẩn danh tên)..."
              className="w-full rounded-xl border border-gold/35 bg-white/95 px-4 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-navy focus:outline-none"
            />
          </div>

          <div>
            <textarea
              required
              maxLength={500}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Gửi lời chúc tốt nghiệp tới ${CEREMONY_INFO.graduateName}...`}
              className="w-full rounded-xl border border-gold/35 bg-white/95 px-4 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-navy focus:outline-none"
            />
          </div>

          {formError && (
            <p role="alert" className="text-center text-xs font-medium text-crimson">
              {formError}
            </p>
          )}

          {submittedSuccess && (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-navy/5 p-2.5 text-xs font-medium text-navy">
              <CheckCircle2 className="h-4 w-4 text-gold" />
              <span>Lời chúc ẩn danh của bạn đã được lưu thành công!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-navy py-3 text-xs font-semibold uppercase tracking-[2px] text-white shadow-md transition hover:bg-navy/90 disabled:opacity-60"
          >
            {submitting ? "ĐANG GỬI LỜI CHÚC..." : "GỬI LỜI CHÚC ✦"}
          </button>
        </form>

        {/* Danh sách các lời chúc ẩn danh từ Google Sheets */}
        <div className="mt-7 space-y-3">
          <div className="flex items-center justify-between border-b border-gold/20 pb-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-medium text-navy">
              <EyeOff className="h-3.5 w-3.5 text-gold" />
              Lời chúc từ Google Sheets (Ẩn danh)
            </span>
            <span>{displayWishes.length} lời chúc</span>
          </div>

          {loading && (
            <p className="py-4 text-center text-xs text-gold">
              Đang tải lời chúc từ Google Sheets...
            </p>
          )}
          {error && <p className="py-2 text-center text-xs text-crimson">{error}</p>}

          <div className="max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
            {displayWishes.map((wish, idx) => (
              <div
                key={wish.id || idx}
                className="rounded-xl border border-gold/20 bg-white/90 p-3.5 shadow-sm"
              >
                <p className="font-lora text-sm italic leading-relaxed text-slate-700">
                  “{wish.message}”
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-navy">
                    ✦ Bạn ẩn danh #{displayWishes.length - idx}
                    {wish.relationship ? ` • ${wish.relationship}` : ""}
                  </span>
                  {wish.createdAt && <span>{wish.createdAt}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
