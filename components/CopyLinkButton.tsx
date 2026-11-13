"use client";

import { useState } from "react";

export default function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <a href={path} target="_blank" className="text-brand-600 hover:underline">
        Open
      </a>
      <button className="btn-secondary px-2 py-1 text-xs" onClick={copy}>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </span>
  );
}
