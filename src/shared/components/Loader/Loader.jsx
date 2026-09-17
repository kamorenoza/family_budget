import './Loader.css'

// Loader de pantalla completa para el arranque de la app (sesión/datos).
export default function Loader({ message = 'Cargando…', full = true }) {
  return (
    <div className={full ? 'loader loader--full' : 'loader'}>
      <div className="loader__spinner" aria-hidden="true">
        <span className="loader__dot" />
        <span className="loader__dot" />
        <span className="loader__dot" />
      </div>
      {message && <p className="loader__text">{message}</p>}
    </div>
  )
}
