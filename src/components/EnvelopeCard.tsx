import { useState } from "react";
import { Check, Copy, Edit3, Lock, MailOpen } from "lucide-react";
import type { EncryptedInvitationRecord } from "@/types/invitation";

interface EnvelopeCardProps {
  record: EncryptedInvitationRecord;
  isUnlocked: boolean;
  onSelect: (record: EncryptedInvitationRecord) => void;
  onEdit?: (record: EncryptedInvitationRecord) => void;
}

export function EnvelopeCard({ record, isUnlocked, onSelect, onEdit }: EnvelopeCardProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/${record.route_hash}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="group relative flex w-full flex-col justify-between border border-navy/20 bg-paper p-5 text-left transition-colors hover:border-gold">
      <button
        type="button"
        onClick={() => onSelect(record)}
        className="w-full text-left focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-medium text-sage">{record.relationship_tag}</span>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-navy transition-colors group-hover:bg-gold group-hover:text-navy"
            aria-hidden="true"
          >
            {isUnlocked ? <MailOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          </span>
        </div>

        <div className="mt-4">
          <h3 className="font-display text-2xl font-semibold leading-snug text-navy">
            {record.recipient_label}
          </h3>
          <p className="mt-1.5 text-xs text-sage">
            {isUnlocked ? "Đã mở khóa — Nhấn để xem thiệp" : "Nhấn để mở hoặc sao chép link riêng"}
          </p>
        </div>
      </button>

      <div className="mt-5 flex items-center justify-between border-t border-navy/10 pt-3 text-xs text-sage">
        <span className="font-mono text-[11px]">/{record.route_hash}</span>
        <div className="flex items-center gap-3">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(record);
              }}
              className="inline-flex items-center gap-1 font-medium text-sage hover:text-navy"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Sửa data
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 font-medium text-navy hover:text-gold"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-gold" />
                Đã chép link
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Chép link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
