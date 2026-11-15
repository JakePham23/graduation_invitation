import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decryptInvitation } from "@/lib/crypto";
import { verifyServerPepper } from "@/services/sheetsApi";
import type { CoverLetterSecret, EncryptedInvitationRecord } from "@/types/invitation";

interface UnlockDialogProps {
  record: EncryptedInvitationRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: (id: string, secret: CoverLetterSecret) => void;
}

export function UnlockDialog({
  record,
  open,
  onOpenChange,
  onUnlocked,
}: UnlockDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!record) return;
    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu để giải mã thư mời.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let privatePepper = "";
      if (record.uses_server_pepper) {
        privatePepper = await verifyServerPepper(record.id, password.trim());
      }
      const secret = await decryptInvitation(record, password.trim(), privatePepper);
      setPassword("");
      onUnlocked(record.id, secret);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Google Sheets") || msg.includes("kết nối")) {
        setError(msg);
      } else {
        setError("Mật khẩu chưa chính xác hoặc không khớp khóa giải mã.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPassword("");
          setError("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-gold">
            <KeyRound className="h-4 w-4" />
            <span className="text-xs font-medium text-sage">{record?.relationship_tag}</span>
          </div>
          <DialogTitle>Mở niêm phong: {record?.recipient_label}</DialogTitle>
          <DialogDescription>
            Thư mời được mã hóa riêng tư bằng AES-256-GCM. Nhập mật khẩu của bạn để giải mã trực tiếp trên trình duyệt.
          </DialogDescription>
        </DialogHeader>

        {record?.password_hint && (
          <div className="mt-3 border-l-2 border-gold bg-navy/[0.03] px-3 py-2 text-xs text-ink">
            <span className="font-semibold text-navy">Gợi ý: </span>
            {record.password_hint}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="unlock-password" className="mb-1.5 block text-xs font-medium text-navy">
              Mật khẩu mở thư
            </label>
            <Input
              id="unlock-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              disabled={loading}
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-crimson">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Đóng
            </Button>
            <Button type="submit" variant="gold" disabled={loading}>
              {loading ? "Đang giải mã..." : "Mở thư mời"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
