import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Credenciales del distribuidor (igual que el panel de Ventas)
const USER = "ADMIN";
const PASS = "1234*";

export async function POST(req: Request) {
  const { usuario, password } = await req.json().catch(() => ({}));
  if (String(usuario || "").trim().toUpperCase() === USER && password === PASS) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("wh_auth", "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
    });
    return res;
  }
  return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
}
