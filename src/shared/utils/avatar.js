// Normaliza la URL de foto de Google para pedir una resolución mayor y nítida.
export function hiResPhoto(url) {
  if (!url) return ''
  // Google entrega `=s96-c` o `/s96-c/`; lo subimos a 256px.
  return url.replace(/=s\d+-c\b/, '=s256-c').replace(/\/s\d+-c\//, '/s256-c/')
}

// Inicial en mayúscula para el avatar cuando no hay foto.
export function initialOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?'
}
