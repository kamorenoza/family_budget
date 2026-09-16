# Family Budget

Aplicación React para gestionar el presupuesto familiar, construida con **Vite** y **React Router**.

## Requisitos

- Node.js 18+

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre la URL que aparece en la terminal (por defecto `http://localhost:5173`).

## Build de producción

```bash
npm run build
npm run preview
```

## Rutas

| Ruta             | Descripción                          |
| ---------------- | ------------------------------------ |
| `/`              | Página de inicio                     |
| `/transactions`  | Lista y gestión de transacciones     |
| `/about`         | Información de la app                 |
| `*`              | Página 404                           |

## Estructura

```
src/
  main.jsx            # Punto de entrada + BrowserRouter
  App.jsx             # Definición de rutas
  components/
    Layout.jsx        # Header con navegación + Outlet
  pages/
    Home.jsx
    Transactions.jsx
    About.jsx
    NotFound.jsx
```