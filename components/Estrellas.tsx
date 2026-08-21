// Estrellas de calificación: SIEMPRE dorado #F2B01E (SPEC §2). No acepta otro color.
export default function Estrellas({ rating, tamaño = 16 }: { rating: number; tamaño?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={tamaño} height={tamaño} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2l2.9 6.2 6.8.9-5 4.7 1.3 6.7L12 17.3 6 20.5l1.3-6.7-5-4.7 6.8-.9L12 2z"
            fill={n <= Math.round(rating) ? "#F2B01E" : "#DDD5C4"}
          />
        </svg>
      ))}
    </span>
  );
}
