"use client";

import { useState } from "react";

/** Shows the invite code with a copy button. */
export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked — the code is on screen to type manually.
    }
  }

  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-faint">Invite code</p>
        <p className="mt-0.5 font-mono text-lg font-semibold tracking-[0.25em]">{code}</p>
      </div>
      <button onClick={copy} className="btn btn-outline text-xs">{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}
