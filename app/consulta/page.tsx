"use client";

// Pestaña de CONSULTA (referencia): reúne lo que Cata revisa "cuando necesita
// algo" pero que ya no vive en el menú principal — Dashboard, Gerentes y Black List.
import Dashboard from "../page";
import Gerentes from "../gerentes/page";
import BlackList from "../blacklist/page";

export default function Consulta() {
  return (
    <div className="space-y-12">
      <Dashboard />
      <div className="border-t border-[var(--color-line)] pt-8">
        <Gerentes />
      </div>
      <div className="border-t border-[var(--color-line)] pt-8">
        <BlackList />
      </div>
    </div>
  );
}
