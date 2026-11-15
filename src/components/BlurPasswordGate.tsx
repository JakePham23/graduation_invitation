import { useState, type FormEvent } from "react";
import { KeyRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BlurPasswordGateProps {
  badge: string;
  title: string;
  description: string;
  hint?: string;
  submitLabel: string;
  loading?: boolean;
  error?: string;
  onSubmit: (password: string) => Promise<void> | void;
}

export function BlurPasswordGate({
  badge,
  title,
  description,
  hint,
  submitLabel,
  loading = false,
  error = "",
  onSubmit,
}: BlurPasswordGateProps) {
  const [password, setPassword] = useState("");

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    await onSubmit(password.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-paper/75 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto border border-navy/25 bg-paper p-5 shadow-2xl sm:p-7">
        <div className="mb-3 flex items-center gap-2 text-gold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/60 bg-navy text-gold">
            <Lock className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-sage">{badge}</span>
        </div>

        <h1 id="gate-title" className="font-display text-3xl font-semibold text-navy">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-sage">{description}</p>

        {hint && (
          <div className="mt-4 border-l-2 border-gold bg-navy/[0.04] px-3 py-2 text-xs text-ink">
            <span className="font-semibold text-navy">Gợi ý: </span>
            {hint}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="gate-password" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-navy">
              <KeyRound className="h-3.5 w-3.5 text-gold" />
              Mật khẩu mở khóa
            </label>
            <Input
              id="gate-password"
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

          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Đang xác thực & giải mã..." : submitLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}
