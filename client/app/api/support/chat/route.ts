import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1200)
      })
    )
    .min(1)
    .max(12)
});

export async function POST(req: NextRequest) {
  try {
    const payload = chatSchema.parse(await req.json());
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    if (!apiKey) {
      return NextResponse.json({
        reply:
          "Terima kasih sudah menghubungi SinyalKita. Fitur AI support belum aktif karena GROQ_API_KEY belum diatur di environment."
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 360,
        messages: [
          {
            role: "system",
            content:
              "Anda adalah online support resmi SinyalKita, layanan WiFi untuk user aktif. Jawab dalam Bahasa Indonesia yang sopan, singkat, jelas, dan profesional. Bantu user terkait login, tagihan, pembayaran, bukti transfer, status layanan, atau report gangguan. Jangan mengarang data pribadi, nomor invoice, atau status pembayaran. Jika butuh pengecekan akun, arahkan user untuk login atau menghubungi admin SinyalKita."
          },
          ...payload.messages
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.error?.message || "Layanan AI support belum dapat merespons." },
        { status: response.status }
      );
    }

    const reply = data?.choices?.[0]?.message?.content || "Maaf, respons belum tersedia. Silakan coba lagi.";
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Format pesan belum sesuai." }, { status: 400 });
    }

    return NextResponse.json({ message: "Layanan support belum dapat digunakan." }, { status: 500 });
  }
}
