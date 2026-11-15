import { useEffect, useState } from "react";
import {
  Check,
  ClipboardPaste,
  CloudUpload,
  Copy,
  Download,
  Edit3,
  HelpCircle,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { encryptInvitation, toRouteSlug } from "@/lib/crypto";
import {
  deleteInvitationFromSheet,
  fetchInvitationsFromSheet,
  isSheetsConfigured,
  saveInvitationToSheet,
  syncInvitationsToSheet,
} from "@/services/sheetsApi";
import type {
  CoverLetterSecret,
  EncryptedInvitationRecord,
  PlainInvitationRecord,
} from "@/types/invitation";

const TSV_COLUMNS = [
  "id",
  "recipient_label",
  "relationship_tag",
  "password_hint",
  "salutation",
  "opening_story",
  "heartfelt_message",
  "invitation_body",
  "event_date",
  "ceremony_time",
  "photo_time_slot",
  "venue_detail",
  "parking_and_map",
  "dress_code",
  "emergency_contact",
  "closing_signature",
  "rsvp_status_options",
  "post_ceremony_party",
  "route_hash",
  "password",
] as const;

const DEFAULT_TEMPLATE: PlainInvitationRecord = {
  id: "inv-khach-moi",
  route_hash: "khachmoi",
  recipient_label: "Bạn Thân Yêu",
  relationship_tag: "Bạn bè",
  password_hint: "Mật khẩu mặc định: khachmoi2026",
  password: "khachmoi2026",
  private_pepper: "",
  auto_unlock_qr: true,
  salutation: "Chào người bạn tuyệt vời của mình,",
  opening_story:
    "Bốn năm đại học tại KHTN trôi qua thật nhanh với biết bao kỷ niệm đáng nhớ.",
  heartfelt_message:
    "Cảm ơn bạn đã luôn đồng hành, sẻ chia và tiếp thêm động lực cho mình trong suốt chặng đường thanh xuân vừa qua.",
  invitation_body:
    "Thân mời bạn tới dự Lễ Tốt Nghiệp của mình và cùng chụp những bức hình kỷ niệm thật rực rỡ nhé!",
  event_date: "Thứ Bảy, ngày 28 tháng 11 năm 2026",
  ceremony_time: "07:30 – 09:15 (Lễ trao bằng trong hội trường)",
  photo_time_slot: "09:30 – 11:00 (Đón khách & chụp hình tại sân chính)",
  venue_detail:
    "Sân chính Cơ sở 1 — Trường ĐH Khoa học Tự nhiên (227 Nguyễn Văn Cừ, Q.5)",
  parking_and_map:
    "Gửi xe cổng số 2 Nguyễn Văn Cừ (sát sân khu A) | Cổng phụ Nguyễn Trãi (Bãi xe khu B) | Bãi xe TTTM NowZone kế bên trường",
  dress_code: "Trang phục lịch sự, tông màu sáng (trắng, kem, xanh nhạt) để lên hình nổi bật",
  emergency_contact:
    "Gọi cho mình hoặc người nhà (090x.xxx.xxx) nếu bạn tới nơi mà mình chưa ra kịp nhé",
  closing_signature: "Thân mến, Phạm Tân Nghĩa",
  rsvp_status_options: [
    "Có mặt đúng khung giờ chụp 09:30",
    "Đến sau 10:15",
    "Bận không đến được nhưng gửi lời chúc từ xa",
  ],
  post_ceremony_party:
    "18:30 cùng ngày: Thân mời bạn dự bữa tiệc liên hoan ấm cúng mừng tốt nghiệp!",
};

interface AdminInvitationManagerProps {
  invitations: EncryptedInvitationRecord[];
  unlockedMap: Record<string, CoverLetterSecret>;
  editingRecordId?: string | null;
  onClearEditingRecord?: () => void;
  onUpdateInvitations: (
    nextEncrypted: EncryptedInvitationRecord[],
    nextUnlocked: Record<string, CoverLetterSecret>,
  ) => void;
}

export function AdminInvitationManager({
  invitations,
  unlockedMap,
  editingRecordId,
  onClearEditingRecord,
  onUpdateInvitations,
}: AdminInvitationManagerProps) {
  const [plainItems, setPlainItems] = useState<PlainInvitationRecord[]>([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showTsvModal, setShowTsvModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [formData, setFormData] = useState<PlainInvitationRecord>(DEFAULT_TEMPLATE);
  const [rsvpText, setRsvpText] = useState(DEFAULT_TEMPLATE.rsvp_status_options.join(" | "));
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const [tsvInput, setTsvInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Tải danh sách gốc từ API dev server (/api/admin/invitations) hoặc localStorage
  useEffect(() => {
    const savedLocal = localStorage.getItem("grad_admin_plain_invitations");
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlainItems(parsed);
        }
      } catch {
        // Bỏ qua lỗi parse
      }
    }

    fetch("/api/admin/invitations")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.items) && data.items.length > 0) {
          setPlainItems(data.items);
          localStorage.setItem("grad_admin_plain_invitations", JSON.stringify(data.items));
        }
      })
      .catch(() => {
        // Khi chạy bản build tĩnh không có middleware dev
      });
  }, []);

  // Mở form sửa khi người dùng bấm nút "Sửa" trên thẻ phong bì
  useEffect(() => {
    if (!editingRecordId) return;
    const foundPlain = plainItems.find((item) => item.id === editingRecordId);
    const foundEnc = invitations.find((item) => item.id === editingRecordId);
    const unlockedSecret = unlockedMap[editingRecordId];

    if (foundPlain) {
      setFormData({
        ...foundPlain,
        route_hash:
          foundPlain.route_hash ||
          foundEnc?.route_hash ||
          toRouteSlug(foundPlain.id.replace(/^inv-/, "")),
        auto_unlock_qr: foundPlain.auto_unlock_qr !== false,
      });
      setRsvpText(
        Array.isArray(foundPlain.rsvp_status_options)
          ? foundPlain.rsvp_status_options.join(" | ")
          : String(foundPlain.rsvp_status_options || ""),
      );
      setIsEditingExisting(true);
      setShowFormModal(true);
    } else if (foundEnc) {
      const baseSecret = unlockedSecret || DEFAULT_TEMPLATE;
      const merged: PlainInvitationRecord = {
        ...baseSecret,
        id: foundEnc.id,
        route_hash: foundEnc.route_hash,
        recipient_label: foundEnc.recipient_label,
        relationship_tag: foundEnc.relationship_tag,
        password_hint: foundEnc.password_hint,
        password: foundEnc.default_qr_key || `${foundEnc.route_hash}2026`,
        private_pepper: "",
        auto_unlock_qr: true,
      };
      setFormData(merged);
      setRsvpText(merged.rsvp_status_options.join(" | "));
      setIsEditingExisting(true);
      setShowFormModal(true);
    }
    onClearEditingRecord?.();
  }, [editingRecordId, plainItems, invitations, unlockedMap, onClearEditingRecord]);

  async function persistAll(
    nextPlainList: PlainInvitationRecord[],
    message: string,
    singleChangedRecord?: PlainInvitationRecord,
    syncSheet = true,
  ) {
    setSaving(true);
    setStatusMessage("");
    try {
      const nextEncrypted: EncryptedInvitationRecord[] = [];
      const nextUnlocked: Record<string, CoverLetterSecret> = { ...unlockedMap };

      for (const item of nextPlainList) {
        const enc = await encryptInvitation(item);
        nextEncrypted.push(enc);
        nextUnlocked[item.id] = {
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
          rsvp_status_options: Array.isArray(item.rsvp_status_options)
            ? item.rsvp_status_options
            : String(item.rsvp_status_options || "")
                .split("|")
                .map((s) => s.trim())
                .filter(Boolean),
          post_ceremony_party: item.post_ceremony_party || "",
        };
      }

      setPlainItems(nextPlainList);
      localStorage.setItem("grad_admin_plain_invitations", JSON.stringify(nextPlainList));
      localStorage.setItem("grad_admin_encrypted_invitations", JSON.stringify(nextEncrypted));
      onUpdateInvitations(nextEncrypted, nextUnlocked);

      // 1. Gửi dữ liệu 18 cột lên Google Sheets (nếu đã cấu hình VITE_APPS_SCRIPT_URL)
      let sheetNote = "";
      if (syncSheet && isSheetsConfigured()) {
        try {
          if (singleChangedRecord) {
            await saveInvitationToSheet(singleChangedRecord);
          } else {
            await syncInvitationsToSheet(nextPlainList);
          }
          sheetNote = " • Đã gửi & lưu lên Google Sheets";
        } catch {
          sheetNote =
            " • Lưu ý: Hãy cập nhật mã google-apps-script/Code.gs mới lên Apps Script để lưu vào Sheet";
        }
      }

      // 2. Ghi trực tiếp xuống file dự án nếu đang chạy dev server
      try {
        const res = await fetch("/api/admin/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plainItems: nextPlainList,
            encryptedItems: nextEncrypted,
          }),
        });
        if (res.ok) {
          setStatusMessage(
            `${message}${sheetNote} • Đã lưu file src/data/encrypted-invitations.json`,
          );
        } else {
          setStatusMessage(`${message}${sheetNote}`);
        }
      } catch {
        setStatusMessage(`${message}${sheetNote}`);
      }
    } catch (err) {
      setStatusMessage(
        `Lỗi mã hóa: ${err instanceof Error ? err.message : "Không xác định"}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePullFromSheet() {
    if (!isSheetsConfigured()) {
      setStatusMessage("Chưa cấu hình VITE_APPS_SCRIPT_URL trong .env.local.");
      return;
    }
    setSaving(true);
    setStatusMessage("");
    try {
      const sheetRows = await fetchInvitationsFromSheet();
      if (sheetRows.length === 0) {
        setStatusMessage(
          "Chưa có dòng dữ liệu 18 cột nào trên Google Sheet (hoặc chưa cập nhật google-apps-script/Code.gs).",
        );
        return;
      }
      await persistAll(
        sheetRows,
        `Đã tải ${sheetRows.length} thiệp mời từ Google Sheets về website!`,
        undefined,
        false,
      );
    } catch (err) {
      setStatusMessage(
        `Không thể tải từ Google Sheet: ${err instanceof Error ? err.message : "Hãy cập nhật Code.gs trên Apps Script"}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePushAllToSheet() {
    if (!isSheetsConfigured()) {
      setStatusMessage("Chưa cấu hình VITE_APPS_SCRIPT_URL trong .env.local.");
      return;
    }
    const listToSync =
      plainItems.length > 0
        ? plainItems
        : invitations.map((enc) => ({
            ...(unlockedMap[enc.id] || DEFAULT_TEMPLATE),
            id: enc.id,
            route_hash: enc.route_hash,
            recipient_label: enc.recipient_label,
            relationship_tag: enc.relationship_tag,
            password_hint: enc.password_hint,
            password: enc.default_qr_key || `${enc.route_hash}2026`,
            auto_unlock_qr: true,
          }));
    await persistAll(listToSync, `Đã đồng bộ ${listToSync.length} thiệp mời`, undefined, true);
  }

  function handleOpenCreateModal() {
    const nextNum = invitations.length + 1;
    const fresh: PlainInvitationRecord = {
      ...DEFAULT_TEMPLATE,
      id: `inv-khach-${nextNum}`,
      route_hash: `khach${nextNum}`,
      recipient_label: `Khách Mời ${nextNum}`,
      password: `khach${nextNum}2026`,
      password_hint: `Mật khẩu mẫu: khach${nextNum}2026`,
    };
    setFormData(fresh);
    setRsvpText(fresh.rsvp_status_options.join(" | "));
    setIsEditingExisting(false);
    setShowFormModal(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.id.trim() || !formData.recipient_label.trim()) {
      setStatusMessage("Vui lòng nhập tối thiểu ID và Tên người nhận (recipient_label).");
      return;
    }

    const rsvpOptions = rsvpText
      .split(/\||\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const cleanRecord: PlainInvitationRecord = {
      ...formData,
      id: formData.id.trim(),
      route_hash:
        formData.route_hash.trim() ||
        toRouteSlug(formData.id.replace(/^inv-/, "")) ||
        toRouteSlug(formData.recipient_label),
      recipient_label: formData.recipient_label.trim(),
      relationship_tag: formData.relationship_tag.trim() || "Khách mời",
      password:
        formData.password.trim() ||
        `${toRouteSlug(formData.route_hash || formData.id)}2026`,
      rsvp_status_options: rsvpOptions.length > 0 ? rsvpOptions : ["Sẽ tham dự đúng giờ"],
    };

    const baseList: PlainInvitationRecord[] =
      plainItems.length > 0
        ? [...plainItems]
        : invitations.map((enc) => ({
            ...(unlockedMap[enc.id] || DEFAULT_TEMPLATE),
            id: enc.id,
            route_hash: enc.route_hash,
            recipient_label: enc.recipient_label,
            relationship_tag: enc.relationship_tag,
            password_hint: enc.password_hint,
            password: enc.default_qr_key || `${enc.route_hash}2026`,
            auto_unlock_qr: true,
          }));

    const existingIdx = baseList.findIndex((item) => item.id === cleanRecord.id);
    if (existingIdx >= 0) {
      baseList[existingIdx] = cleanRecord;
    } else {
      baseList.push(cleanRecord);
    }

    await persistAll(
      baseList,
      existingIdx >= 0
        ? `Đã cập nhật thiệp "${cleanRecord.recipient_label}" (/${cleanRecord.route_hash})!`
        : `Đã tạo thiệp mới "${cleanRecord.recipient_label}" (/${cleanRecord.route_hash})!`,
      cleanRecord,
      true,
    );
    setShowFormModal(false);
  }

  async function handleDeleteInvitation(id: string, label: string) {
    if (!window.confirm(`Bạn có chắc muốn xóa thiệp của "${label}" (${id})?`)) return;
    const nextList = plainItems.filter((item) => item.id !== id);
    if (isSheetsConfigured()) {
      deleteInvitationFromSheet(id).catch(() => {});
    }
    await persistAll(nextList, `Đã xóa thiệp "${label}".`, undefined, false);
  }

  async function handleParseTsv() {
    const rawLines = tsvInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      setStatusMessage("Vui lòng dán ít nhất 1 dòng dữ liệu từ Excel / Google Sheets.");
      return;
    }

    const baseList = [...plainItems];
    let importedCount = 0;

    for (const line of rawLines) {
      const cols = line.split("\t");
      // Bỏ qua dòng tiêu đề nếu cột đầu tiên là "id" và cột thứ 2 là "recipient_label"
      if (
        cols[0]?.trim().toLowerCase() === "id" &&
        cols[1]?.trim().toLowerCase() === "recipient_label"
      ) {
        continue;
      }

      const [
        idRaw,
        recipient_label,
        relationship_tag,
        password_hint,
        salutation,
        opening_story,
        heartfelt_message,
        invitation_body,
        event_date,
        ceremony_time,
        photo_time_slot,
        venue_detail,
        parking_and_map,
        dress_code,
        emergency_contact,
        closing_signature,
        rsvp_status_options_raw,
        post_ceremony_party,
        route_hash_raw,
        password_raw,
      ] = cols.map((c) => (c ?? "").trim());

      if (!idRaw && !recipient_label) continue;

      const id = idRaw || `inv-${toRouteSlug(recipient_label)}`;
      const routeHash =
        toRouteSlug(route_hash_raw) ||
        toRouteSlug(id.replace(/^inv-/, "")) ||
        toRouteSlug(recipient_label) ||
        "thiepmoi";
      const passwordFromHint = password_hint.match(/:\s*([a-zA-Z0-9_-]{4,})/)?.[1];
      const password = password_raw || passwordFromHint || `${routeHash}2026`;

      const rsvpOptions = (rsvp_status_options_raw || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);

      const record: PlainInvitationRecord = {
        id,
        route_hash: routeHash,
        recipient_label: recipient_label || "Khách Quý",
        relationship_tag: relationship_tag || "Bạn bè",
        password_hint: password_hint || `Mật khẩu mẫu: ${password}`,
        password,
        private_pepper: "",
        auto_unlock_qr: true,
        salutation: salutation || DEFAULT_TEMPLATE.salutation,
        opening_story: opening_story || DEFAULT_TEMPLATE.opening_story,
        heartfelt_message: heartfelt_message || DEFAULT_TEMPLATE.heartfelt_message,
        invitation_body: invitation_body || DEFAULT_TEMPLATE.invitation_body,
        event_date: event_date || DEFAULT_TEMPLATE.event_date,
        ceremony_time: ceremony_time || DEFAULT_TEMPLATE.ceremony_time,
        photo_time_slot: photo_time_slot || DEFAULT_TEMPLATE.photo_time_slot,
        venue_detail: venue_detail || DEFAULT_TEMPLATE.venue_detail,
        parking_and_map: parking_and_map || DEFAULT_TEMPLATE.parking_and_map,
        dress_code: dress_code || DEFAULT_TEMPLATE.dress_code,
        emergency_contact: emergency_contact || DEFAULT_TEMPLATE.emergency_contact,
        closing_signature: closing_signature || DEFAULT_TEMPLATE.closing_signature,
        rsvp_status_options:
          rsvpOptions.length > 0 ? rsvpOptions : DEFAULT_TEMPLATE.rsvp_status_options,
        post_ceremony_party: post_ceremony_party ?? "",
      };

      const existingIdx = baseList.findIndex((item) => item.id === record.id);
      if (existingIdx >= 0) {
        baseList[existingIdx] = record;
      } else {
        baseList.push(record);
      }
      importedCount += 1;
    }

    if (importedCount === 0) {
      setStatusMessage("Không tìm thấy dòng dữ liệu hợp lệ (hãy dán dòng chứa dữ liệu bên dưới tiêu đề).");
      return;
    }

    await persistAll(baseList, `Đã nhập và mã hóa thành công ${importedCount} thiệp mời từ TSV!`);
    setTsvInput("");
    setShowTsvModal(false);
  }

  function handleDownloadEncryptedJson() {
    const blob = new Blob([JSON.stringify(invitations, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "encrypted-invitations.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopyHeaderRow() {
    await navigator.clipboard.writeText(TSV_COLUMNS.join("\t"));
    setCopiedSlug("header-tsv");
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  return (
    <div className="mb-8 rounded-2xl border border-navy/20 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-navy/10 pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-navy">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Quản lý dữ liệu &amp; Tạo thiệp mới (18 trường chuẩn)
          </div>
          <h3 className="mt-2 font-display text-2xl font-semibold text-navy">
            Trình tạo &amp; Chỉnh sửa Thiệp mời (Admin)
          </h3>
          <p className="mt-0.5 text-xs text-sage">
            Tạo mới bằng Form, sửa trực tiếp từng thiệp hoặc copy-paste dòng dữ liệu 18 cột từ Excel / Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={handleOpenCreateModal}>
            <Plus className="h-4 w-4" />
            Tạo thiệp mới
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTsvModal(true)}
          >
            <ClipboardPaste className="h-4 w-4" />
            Dán từ Excel / Sheet (18 cột)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePushAllToSheet}
            disabled={saving}
            title="Đẩy toàn bộ danh sách thiệp 18 cột hiện tại lên Google Sheets"
          >
            <CloudUpload className="h-4 w-4" />
            Đẩy lên Google Sheet
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePullFromSheet}
            disabled={saving}
            title="Tải danh sách thiệp 18 cột từ Google Sheets về website"
          >
            <RefreshCw className="h-4 w-4" />
            Tải từ Google Sheet
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadEncryptedJson}
            title="Tải file src/data/encrypted-invitations.json"
          >
            <Download className="h-4 w-4" />
            Tải JSON
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowGuide((v) => !v)}
          >
            <HelpCircle className="h-4 w-4 text-gold" />
            {showGuide ? "Ẩn giải thích cấu trúc" : "Phân biệt Intro • Thiệp • Lời mời"}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gold/50 bg-gold/10 px-4 py-2.5 text-xs font-medium text-navy">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage("")}
            className="ml-2 text-sage hover:text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* BẢNG PHÂN BIỆT RÕ RÀNG: INTRO vs THIỆP vs LỜI MỜI & DATA */}
      {showGuide && (
        <div className="mt-4 grid gap-3 rounded-xl border border-navy/15 bg-paper/70 p-4 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-navy/10 bg-white p-3.5">
            <div className="font-display text-base font-bold text-navy">
              1. Intro 3D (Cảnh 1 &amp; Cảnh 2)
            </div>
            <p className="mt-1 leading-relaxed text-slate-600">
              • <strong>Dùng chung hiệu ứng vũ trụ sao 3D</strong>, 12 tấm ảnh kỷ niệm (cấu hình tại{" "}
              <code className="rounded bg-slate-100 px-1 text-navy">src/config/ceremony.ts</code>{" "}
              mục <code className="rounded bg-slate-100 px-1">memoryPhotos</code>) và lời chúc từ Google Sheets bay từ dưới lên.
              <br />• <strong>Điểm riêng theo từng khách</strong>: Tấm thiệp 3D đặc bay từ dưới lên ở giữa cảnh 2 tự động khắc tên{" "}
              <code className="rounded bg-amber-100 px-1 font-semibold text-navy">
                recipient_label
              </code>{" "}
              của đúng khách đó.
            </p>
          </div>

          <div className="rounded-lg border border-navy/10 bg-white p-3.5">
            <div className="font-display text-base font-bold text-navy">
              2. Tấm Thiệp Bìa (Cảnh đầu &amp; Đỉnh Cảnh 3)
            </div>
            <p className="mt-1 leading-relaxed text-slate-600">
              • <strong>Cố định khung chuẩn ĐH KHTN</strong>: Logo trường, dải lụa{" "}
              <code className="rounded bg-slate-100 px-1">HCMUS 2022–2026</code> và{" "}
              <code className="rounded bg-slate-100 px-1">K22 - Phạm Tân Nghĩa - CNTT</code>.
              <br />• <strong>Thay đổi theo data</strong>: Dòng chữ nghệ thuật ở chính giữa thiệp hiển thị{" "}
              <code className="rounded bg-amber-100 px-1 font-semibold text-navy">
                recipient_label
              </code>{" "}
              (VD: <em>Hội Bạn Đại Học</em>, <em>Ba Mẹ &amp; Gia đình</em>, hoặc tên riêng).
            </p>
          </div>

          <div className="rounded-lg border border-navy/10 bg-white p-3.5">
            <div className="font-display text-base font-bold text-navy">
              3. Các Thẻ Lời Mời (Cảnh 3 bên dưới thiệp)
            </div>
            <p className="mt-1 leading-relaxed text-slate-600">
              • <strong>Khác nhau 100% theo từng khách (18 trường data)</strong>:
              <br />- <strong>Thẻ 1 (Tâm thư)</strong>: <code className="text-navy">salutation</code>,{" "}
              <code className="text-navy">opening_story</code>,{" "}
              <code className="text-navy">heartfelt_message</code>,{" "}
              <code className="text-navy">closing_signature</code>.
              <br />- <strong>Thẻ 2 (Thân mời)</strong>:{" "}
              <code className="text-navy">recipient_label</code>,{" "}
              <code className="text-navy">invitation_body</code>.
              <br />- <strong>Thẻ 3 (Lịch trình &amp; Điểm hẹn)</strong>:{" "}
              <code className="text-navy">event_date</code>,{" "}
              <code className="text-navy">ceremony_time</code>,{" "}
              <code className="text-navy">photo_time_slot</code>,{" "}
              <code className="text-navy">venue_detail</code>,{" "}
              <code className="text-navy">parking_and_map</code>,{" "}
              <code className="text-navy">dress_code</code>,{" "}
              <code className="text-navy">emergency_contact</code>.
              <br />- <strong>Thẻ 5 &amp; 6 (RSVP &amp; Tiệc)</strong>:{" "}
              <code className="text-navy">rsvp_status_options</code>,{" "}
              <code className="text-navy">post_ceremony_party</code>.
            </p>
          </div>
        </div>
      )}

      {/* BẢNG TÓM TẮT NHANH CÁC THIỆP HIỆN CÓ ĐỂ SỬA / XÓA / COPY LINK */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-navy/15 text-[11px] uppercase tracking-wider text-sage">
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 px-3">Người nhận (recipient_label)</th>
              <th className="py-2 px-3">Nhóm (relationship_tag)</th>
              <th className="py-2 px-3">Link QR riêng</th>
              <th className="py-2 pl-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {invitations.map((item) => (
              <tr key={item.id} className="hover:bg-paper/50">
                <td className="py-2.5 pr-3 font-mono font-medium text-navy">{item.id}</td>
                <td className="py-2.5 px-3 font-semibold text-navy">{item.recipient_label}</td>
                <td className="py-2.5 px-3 text-sage">{item.relationship_tag}</td>
                <td className="py-2.5 px-3 font-mono text-navy">
                  <span className="rounded bg-navy/5 px-2 py-0.5">/{item.route_hash}</span>
                </td>
                <td className="py-2.5 pl-3 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const foundPlain = plainItems.find((p) => p.id === item.id);
                        if (foundPlain) {
                          setFormData(foundPlain);
                          setRsvpText(
                            Array.isArray(foundPlain.rsvp_status_options)
                              ? foundPlain.rsvp_status_options.join(" | ")
                              : String(foundPlain.rsvp_status_options || ""),
                          );
                        } else {
                          const sec = unlockedMap[item.id] || DEFAULT_TEMPLATE;
                          setFormData({
                            ...sec,
                            id: item.id,
                            route_hash: item.route_hash,
                            recipient_label: item.recipient_label,
                            relationship_tag: item.relationship_tag,
                            password_hint: item.password_hint,
                            password: item.default_qr_key || `${item.route_hash}2026`,
                            auto_unlock_qr: true,
                          });
                          setRsvpText(sec.rsvp_status_options.join(" | "));
                        }
                        setIsEditingExisting(true);
                        setShowFormModal(true);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-navy/20 bg-white px-2.5 py-1 text-xs font-medium text-navy hover:border-navy"
                    >
                      <Edit3 className="h-3 w-3" />
                      Sửa 18 trường
                    </button>
                    {plainItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteInvitation(item.id, item.recipient_label)}
                        className="inline-flex items-center gap-1 rounded border border-crimson/30 bg-white px-2 py-1 text-xs text-crimson hover:bg-crimson/5"
                        title="Xóa thiệp này"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: FORM TẠO MỚI / CHỈNH SỬA ĐẦY ĐỦ 18 TRƯỜNG */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/65 p-3 backdrop-blur-sm sm:p-5">
          <div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gold/40 bg-paper p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-navy/15 pb-3">
              <div>
                <h3 className="font-display text-2xl font-bold text-navy">
                  {isEditingExisting
                    ? `Chỉnh sửa thiệp: ${formData.recipient_label}`
                    : "Tạo thiệp mời mới (Đầy đủ 18 trường)"}
                </h3>
                <p className="text-xs text-sage">
                  Điền hoặc chỉnh sửa các trường bên dưới. Khi bấm Lưu, thiệp sẽ tự động được mã hóa AES-256-GCM và tạo đường dẫn QR.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="rounded-full p-1.5 text-sage hover:bg-navy/10 hover:text-navy"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-5 space-y-6 text-xs">
              {/* NHÓM 1: ĐỊNH DANH & LINK QR */}
              <div className="rounded-xl border border-navy/15 bg-white p-4">
                <h4 className="font-display text-base font-bold text-navy">
                  I. Định danh Thiệp, Đường dẫn QR &amp; Mật khẩu
                </h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="font-semibold text-navy">
                      1. id <span className="text-crimson">*</span>
                    </label>
                    <Input
                      value={formData.id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          id: val,
                          route_hash:
                            prev.route_hash || toRouteSlug(val.replace(/^inv-/, "")),
                        }));
                      }}
                      placeholder="VD: inv-ban-dai-hoc"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-navy">
                      2. recipient_label (Tên trên Thiệp) <span className="text-crimson">*</span>
                    </label>
                    <Input
                      value={formData.recipient_label}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recipient_label: e.target.value,
                        }))
                      }
                      placeholder="VD: Hội Bạn Đại Học"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-navy">
                      3. relationship_tag (Nhóm khách)
                    </label>
                    <Input
                      value={formData.relationship_tag}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          relationship_tag: e.target.value,
                        }))
                      }
                      placeholder="VD: Tri kỷ / Gia đình / Bạn cấp 3"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-navy">
                      Đường dẫn QR (route_hash)
                    </label>
                    <Input
                      value={formData.route_hash}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          route_hash: toRouteSlug(e.target.value),
                        }))
                      }
                      placeholder="VD: bandaihoc -> /bandaihoc"
                      className="mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-navy">
                      Mật khẩu mã hóa (password)
                    </label>
                    <Input
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="VD: bandaihoc2026"
                      className="mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-navy">
                      4. password_hint (Gợi ý mật khẩu)
                    </label>
                    <Input
                      value={formData.password_hint}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password_hint: e.target.value,
                        }))
                      }
                      placeholder="VD: Mật khẩu mẫu: bandaihoc2026"
                      className="mt-1"
                    />
                  </div>
                </div>

                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-navy">
                  <input
                    type="checkbox"
                    checked={formData.auto_unlock_qr !== false}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        auto_unlock_qr: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-navy"
                  />
                  <span>
                    Cho phép khách có link QR (<code>/{formData.route_hash || "link"}</code>) bấm{" "}
                    <strong>&ldquo;MỞ THƯ MỜI&rdquo;</strong> là vào thẳng hiệu ứng 3D không cần gõ mật khẩu
                  </span>
                </label>
              </div>

              {/* NHÓM 2: TÂM THƯ & LỜI MỜI CHÍNH */}
              <div className="rounded-xl border border-navy/15 bg-white p-4">
                <h4 className="font-display text-base font-bold text-navy">
                  II. Tâm Thư Kỷ Niệm &amp; Lời Mời Chính (Thẻ 1 &amp; Thẻ 2)
                </h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="font-semibold text-navy">
                      5. salutation (Lời chào đầu thư)
                    </label>
                    <Input
                      value={formData.salutation}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, salutation: e.target.value }))
                      }
                      placeholder="VD: Chào những người anh em cùng chạy đồ án,"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-navy">
                      16. closing_signature (Chữ ký kết thư)
                    </label>
                    <Input
                      value={formData.closing_signature}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          closing_signature: e.target.value,
                        }))
                      }
                      placeholder="VD: Thân mến, Phạm Tân Nghĩa"
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-navy">
                      6. opening_story (Câu chuyện mở đầu)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.opening_story}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          opening_story: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-navy/20 bg-paper/40 p-2.5 text-xs text-ink focus:border-navy focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-navy">
                      7. heartfelt_message (Lời nhắn nhủ chân thành)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.heartfelt_message}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          heartfelt_message: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-navy/20 bg-paper/40 p-2.5 text-xs text-ink focus:border-navy focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-navy">
                      8. invitation_body (Lời mời chính dưới tên khách ở Thẻ 2)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.invitation_body}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          invitation_body: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-navy/20 bg-paper/40 p-2.5 text-xs text-ink focus:border-navy focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* NHÓM 3: THỜI GIAN & ĐỊA ĐIỂM ĐÓN TIẾP */}
              <div className="rounded-xl border border-navy/15 bg-white p-4">
                <h4 className="font-display text-base font-bold text-navy">
                  III. Lịch Trình, Địa Điểm, Gửi Xe &amp; Trang Phục (Thẻ 3)
                </h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="font-semibold text-navy">
                      9. event_date (Ngày sự kiện)
                    </label>
                    <Input
                      value={formData.event_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, event_date: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-navy">
                      10. ceremony_time (Giờ lễ trong hội trường)
                    </label>
                    <Input
                      value={formData.ceremony_time}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ceremony_time: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-navy">
                      11. photo_time_slot (Khung giờ chụp hình)
                    </label>
                    <Input
                      value={formData.photo_time_slot}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          photo_time_slot: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="font-semibold text-navy">
                      12. venue_detail (Địa điểm &amp; Vị trí hẹn cụ thể)
                    </label>
                    <Input
                      value={formData.venue_detail}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          venue_detail: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="font-semibold text-navy">
                      13. parking_and_map (Hướng dẫn gửi xe — ngăn cách bằng dấu{" "}
                      <code className="rounded bg-slate-100 px-1">|</code>: phần 1 là{" "}
                      <strong>Khuyến khích in đậm</strong>, phần 2, 3... là các lựa chọn phụ)
                    </label>
                    <Input
                      value={formData.parking_and_map}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          parking_and_map: e.target.value,
                        }))
                      }
                      placeholder="Bãi xe khuyến khích (in đậm) | Lựa chọn 2 | Lựa chọn 3..."
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="font-semibold text-navy">
                      14. dress_code (Trang phục gợi ý)
                    </label>
                    <Input
                      value={formData.dress_code}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dress_code: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-navy">
                      15. emergency_contact (Liên hệ hỗ trợ khi đang làm lễ)
                    </label>
                    <Input
                      value={formData.emergency_contact}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          emergency_contact: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* NHÓM 4: RSVP & TIỆC THÂN MẬT */}
              <div className="rounded-xl border border-navy/15 bg-white p-4">
                <h4 className="font-display text-base font-bold text-navy">
                  IV. Lựa chọn Xác nhận tham gia (RSVP) &amp; Tiệc Sau Lễ (Thẻ 5 &amp; Thẻ 6)
                </h4>
                <div className="mt-3 grid gap-3">
                  <div>
                    <label className="font-semibold text-navy">
                      17. rsvp_status_options (Ngăn cách các lựa chọn bằng dấu{" "}
                      <code className="rounded bg-slate-100 px-1">|</code>)
                    </label>
                    <Input
                      value={rsvpText}
                      onChange={(e) => setRsvpText(e.target.value)}
                      placeholder="Có mặt đúng khung giờ chụp 09:30 | Đến trễ sau 10:30 | Bận không đến được"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-navy">
                      18. post_ceremony_party (Lời mời ăn uống / tiệc thân mật — để trống nếu không hiện thẻ này)
                    </label>
                    <Input
                      value={formData.post_ceremony_party || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          post_ceremony_party: e.target.value,
                        }))
                      }
                      placeholder="VD: 19:00 cùng ngày: Tiệc liên hoan nhóm bạn thân..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowFormModal(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? "Đang mã hóa & lưu..." : "Lưu & Mã hóa Thiệp"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DÁN NHANH TỪ EXCEL / GOOGLE SHEETS (18 CỘT TSV) */}
      {showTsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/65 p-3 backdrop-blur-sm sm:p-5">
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gold/40 bg-paper p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-navy/15 pb-3">
              <div>
                <h3 className="font-display text-2xl font-bold text-navy">
                  Dán dữ liệu 18 cột từ Excel / Google Sheets
                </h3>
                <p className="text-xs text-sage">
                  Copy 1 hoặc nhiều hàng từ bảng tính theo đúng thứ tự 18 cột rồi dán vào ô bên dưới.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTsvModal(false)}
                className="rounded-full p-1.5 text-sage hover:bg-navy/10 hover:text-navy"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-navy/15 bg-white p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-navy">
                  Thứ tự 18 cột chuẩn (ngăn cách bằng phím Tab):
                </span>
                <button
                  type="button"
                  onClick={handleCopyHeaderRow}
                  className="inline-flex items-center gap-1 rounded border border-navy/20 px-2 py-1 text-[11px] font-medium text-navy hover:bg-navy/5"
                >
                  {copiedSlug === "header-tsv" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-700" />
                      Đã copy dòng tiêu đề
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy dòng tiêu đề sang Excel/Sheet
                    </>
                  )}
                </button>
              </div>
              <div className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 font-mono text-[11px] text-navy">
                {TSV_COLUMNS.join(" \t ")}
              </div>
            </div>

            <textarea
              rows={8}
              value={tsvInput}
              onChange={(e) => setTsvInput(e.target.value)}
              placeholder={`Dán các dòng bạn vừa copy từ Google Sheets / Excel vào đây...\nVí dụ:\ninv-ban-cap-3\tHội Bạn Cấp 3\tBạn cấp 3\tMật khẩu: bancap32026\tChào hội bạn cấp 3,\tNhớ những ngày học chung dưới mái trường THPT...\tCảm ơn tụi mình vẫn giữ liên lạc...\tSáng 28/11 ghé trường KHTN chụp hình cùng mình nhé!\tThứ Bảy, 28/11/2026\t07:30 – 09:15\t09:30 – 11:00\tSân chính cơ sở 227 Nguyễn Văn Cừ\tGửi xe cổng chính\tĐồ sáng màu\tGọi Bảo 090x.xxx.xxx\tThân mến, Phạm Tân Nghĩa\tCó mặt lúc 09:30 | Đến sau 10:30\t19:00 dự tiệc liên hoan`}
              className="mt-4 w-full rounded-xl border border-navy/25 bg-white p-3 font-mono text-xs text-ink focus:border-navy focus:outline-none"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowTsvModal(false)}
              >
                Đóng
              </Button>
              <Button type="button" onClick={handleParseTsv} disabled={saving}>
                <ClipboardPaste className="h-4 w-4" />
                {saving ? "Đang xử lý..." : "Nhập & Mã hóa ngay"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
