// Ícono de filtros/ordenar reutilizado de my-finance-app.
export default function FilterIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9.5 14C11.1569 14 12.5 15.3431 12.5 17C12.5 18.6568 11.1569 20 9.5 20C7.84315 20 6.5 18.6568 6.5 17C6.5 15.3431 7.84315 14 9.5 14Z" stroke={color} strokeWidth="0.72" />
      <path d="M14.5 3.99998C12.8431 3.99998 11.5 5.34312 11.5 6.99998C11.5 8.65683 12.8431 9.99998 14.5 9.99998C16.1569 9.99998 17.5 8.65683 17.5 6.99998C17.5 5.34312 16.1569 3.99998 14.5 3.99998Z" stroke={color} strokeWidth="0.72" />
      <path d="M15 16.9585L22 16.9585" stroke={color} strokeWidth="0.72" strokeLinecap="round" />
      <path d="M9 6.9585L2 6.9585" stroke={color} strokeWidth="0.72" strokeLinecap="round" />
      <path d="M2 16.9585L4 16.9585" stroke={color} strokeWidth="0.72" strokeLinecap="round" />
      <path d="M22 6.9585L20 6.9585" stroke={color} strokeWidth="0.72" strokeLinecap="round" />
    </svg>
  )
}
