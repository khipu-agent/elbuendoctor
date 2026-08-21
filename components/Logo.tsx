// Logotipo: estrella de 5 puntas fusionada con burbuja de chat (SPEC §2).
export default function Logo({ tamaño = 36, conNombre = true }: { tamaño?: number; conNombre?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={tamaño} height={tamaño} viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M32 4c15.5 0 28 11.3 28 25.3 0 8.6-4.7 16.1-11.9 20.8L52 60l-9.5-5.9c-3.3 1-6.9 1.5-10.5 1.5C16.5 55.6 4 44.3 4 30.3 4 16.3 16.5 4 32 4z"
          fill="#0D6E5F"
        />
        <path
          d="M32 15l4.5 9.2 10.2 1.5-7.4 7.2 1.8 10.1L32 38l-9.1 4.8 1.8-10.1-7.4-7.2 10.2-1.5L32 15z"
          fill="#F2B01E"
        />
      </svg>
      {conNombre && (
        <span className="font-display text-xl font-semibold text-esmeralda">
          ElBuenDoctor
        </span>
      )}
    </span>
  );
}
