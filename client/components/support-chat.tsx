"use client";

import { MessageCircle, Send, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const openingMessage: ChatMessage = {
  role: "assistant",
  content: "Halo Kak. Ada yang bisa kami bantu seputar layanan SinyalKita?"
};

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([openingMessage]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-10)
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Support belum dapat membalas.");
      }

      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Maaf, support belum dapat merespons. Silakan coba lagi."
        }
      ]);
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  return (
    <>
      {open ? (
        <section className="fixed inset-x-3 bottom-24 top-20 z-40 flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lift sm:inset-auto sm:bottom-24 sm:right-4 sm:top-auto sm:h-[min(620px,calc(100vh-7rem))] sm:w-[calc(100vw-2rem)] sm:max-w-[380px] lg:bottom-6 lg:right-6">
          <div className="flex items-center justify-between bg-[#2446B8] px-4 py-3.5 text-white sm:py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
                <Image src="/images/logoSinyalKita.png" alt="Logo SinyalKita" width={44} height={44} className="h-11 w-11 object-contain" />
              </span>
              <div>
                <p className="font-heading text-base font-bold">SinyalKita</p>
                <p className="text-xs font-semibold text-white/80">Online Support</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl px-2 py-1 text-sm font-bold hover:bg-white/10"
              aria-label="Tutup online support"
            >
              <span className="hidden sm:inline">Close</span>
              <X className="h-5 w-5 sm:hidden" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#ECF4FF] px-3 py-4 sm:px-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[82%] rounded-2xl rounded-br-md bg-[#2446B8] px-4 py-3 text-sm font-semibold leading-6 text-white shadow-soft"
                      : "max-w-[82%] rounded-2xl rounded-tl-md border border-line bg-white px-4 py-3 text-sm font-semibold leading-6 text-ink-soft shadow-soft"
                  }
                >
                  {message.role === "assistant" && index === 0 ? (
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft/70">SinyalKita</p>
                  ) : null}
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-md border border-line bg-white px-4 py-3 text-sm font-bold text-ink-soft shadow-soft">
                  Mengetik...
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-line bg-white p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tulis pesan..."
              className="min-h-12 min-w-0 flex-1 rounded-xl border-line bg-white px-4 text-sm font-semibold text-ink placeholder:text-ink-soft/50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#2446B8] text-white shadow-soft hover:bg-ocean disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Kirim pesan"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </section>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#2446B8] text-white shadow-lift hover:-translate-y-0.5 hover:bg-ocean sm:h-16 sm:w-16 lg:bottom-6 lg:right-6"
          aria-label="Buka online support"
        >
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
        </button>
      ) : null}
    </>
  );
}
