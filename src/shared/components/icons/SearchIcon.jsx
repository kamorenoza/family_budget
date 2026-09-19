// Ícono de búsqueda reutilizado de my-finance-app.
export default function SearchIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="11.5" cy="11.5" r="9.5" stroke={color} strokeWidth="1.08" />
      <path d="M18.5 18.5L22 22" stroke={color} strokeWidth="1.08" strokeLinecap="round" />
    </svg>
  )
}
