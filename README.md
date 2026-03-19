<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,100:8b5cf6&height=200&section=header&text=Gesti%C3%B3n%20ISPC&fontSize=60&fontColor=ffffff&fontAlignY=38&desc=Dashboard%20acad%C3%A9mico%20inteligente%20para%20el%20campus%20del%20ISPC&descAlignY=60&descColor=e0e7ff" width="100%"/>

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://gestion-ispc.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python-3-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org)

<br/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&size=22&pause=1000&color=818CF8&center=true&vCenter=true&width=600&lines=Materias+%E2%80%A2+Tareas+%E2%80%A2+Avisos+%E2%80%A2+Horarios;Scraping+autom%C3%A1tico+del+campus+Moodle;Actualizado+con+GitHub+Actions;Dise%C3%B1o+glassmorphism+%E2%9C%A8)](https://git.io/typing-svg)

</div>

---

## ¿Qué es Gestión ISPC?

**Gestión ISPC** es una aplicación web que centraliza toda la información académica del campus virtual del ISPC (`acceso.ispc.edu.ar`) en un dashboard moderno y fácil de usar. En lugar de navegar por el Moodle institucional buscando materias, tareas y avisos dispersos, esta app los consolida en una sola interfaz con diseño glassmorphism.

Un **scraper en Python** extrae los datos del campus automáticamente (via GitHub Actions), los guarda como JSON, y el **frontend en Next.js** los presenta de forma clara y organizada.

---

## ✨ Funcionalidades

<table>
<tr>
<td width="50%">

### 📊 Dashboard Central
Vista unificada con acceso rápido a todas las secciones. Muestra el contador de avisos del día y tareas pendientes por carrera con badges dinámicos.

</td>
<td width="50%">

### 📅 Calendario Semanal
Visualiza tus horarios y eventos de la semana actual en una vista tipo agenda, organizada por días y franjas horarias.

</td>
</tr>
<tr>
<td width="50%">

### 📚 Materias por Carrera
Tarjetas individuales por materia con información de horarios, cantidad de tareas, unidades y avisos. Distingue automáticamente materias activas de canceladas.

</td>
<td width="50%">

### 🔔 Panel de Avisos
Agrupación de todos los anuncios del foro del campus por materia, con autor, fecha y mensaje completo.

</td>
</tr>
<tr>
<td width="50%">

### 📖 Historial
Registro cronológico de actividades y eventos pasados para no perder el hilo de lo que pasó en cada materia.

</td>
<td width="50%">

### 🤖 Scraping Automático
El scraper Python se ejecuta con GitHub Actions y actualiza los datos del campus periódicamente sin intervención manual.

</td>
</tr>
</table>

---

## 🗂️ Carreras soportadas

| Carrera | Código |
|---------|--------|
| Tecnicatura en Desarrollo de Software | **TSDS** |
| Tecnicatura en Ciencia de Datos e Inteligencia Artificial | **TSCDIA** |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Actions                         │
│   (cron job / trigger manual)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ ejecuta
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   scraper/ispc_scraper.py                   │
│                                                             │
│  • Login en acceso.ispc.edu.ar (Moodle)                    │
│  • Extrae: materias, tareas, avisos, horarios, materiales  │
│  • Filtra por año (2024-2025) y carrera                    │
│  • Genera public/data/ispc_data.json                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ produce
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  public/data/ispc_data.json                 │
│  (datos estructurados del campus)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │ consume
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js App (src/)                             │
│                                                             │
│  page.tsx → Dashboard → [                                   │
│    InicioPanel   · ResumenHoy                               │
│    WeeklyCalendar · AvisosPanel                             │
│    HistorialPanel · MateriaCard                             │
│  ]                                                          │
└─────────────────────────────────────────────────────────────┘
                       │ deploy
                       ▼
              gestion-ispc.vercel.app
```

---

## 🛠️ Stack tecnológico

<div align="center">

| Capa | Tecnología | Rol |
|------|-----------|-----|
| Frontend | Next.js 16 + React 19 | Framework y renderizado |
| Lenguaje | TypeScript 5 | Tipado estático |
| Estilos | Tailwind CSS 3 | Utilidades CSS + glassmorphism |
| Iconos | Lucide React | Íconos SVG |
| Scraper | Python 3 + Selenium/Playwright | Extracción de datos del campus |
| CI/CD | GitHub Actions | Automatización del scraping |
| Deploy | Vercel | Hosting del frontend |

</div>

---

## 📁 Estructura del proyecto

```
Gestion_ISPC/
├── .github/
│   └── workflows/          # GitHub Actions (scraping automático)
├── public/
│   └── data/
│       └── ispc_data.json  # Datos del campus (generado por scraper)
├── scraper/
│   ├── ispc_scraper.py     # Scraper principal del campus Moodle
│   └── requirements.txt    # Dependencias Python
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Layout raíz Next.js
│   │   ├── page.tsx        # Página principal
│   │   └── globals.css     # Estilos globales
│   ├── components/
│   │   ├── Dashboard.tsx   # Componente contenedor principal
│   │   ├── InicioPanel.tsx # Panel de inicio / resumen
│   │   ├── AvisosPanel.tsx # Panel de avisos del foro
│   │   ├── HistorialPanel.tsx # Historial de actividades
│   │   ├── MateriaCard.tsx # Tarjeta individual de materia
│   │   ├── ResumenHoy.tsx  # Resumen del día actual
│   │   └── WeeklyCalendar.tsx # Calendario semanal
│   ├── lib/                # Utilidades y helpers
│   └── types/              # Definiciones TypeScript
├── TSCDIA/                 # Material educativo TSCDIA
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 Instalación y uso local

### Prerrequisitos

- Node.js 18+
- Python 3.10+
- Credenciales del campus ISPC

### 1. Clonar el repositorio

```bash
git clone https://github.com/Franco-Arce/Gestion_ISPC.git
cd Gestion_ISPC
```

### 2. Instalar dependencias frontend

```bash
npm install
```

### 3. Configurar credenciales del scraper

Crear un archivo `.env` en la raíz:

```env
ISPC_USER=tu_usuario_del_campus
ISPC_PASSWORD=tu_contraseña_del_campus
```

### 4. Ejecutar el scraper (opcional, para actualizar datos)

```bash
cd scraper
pip install -r requirements.txt
python ispc_scraper.py
```

Esto genera/actualiza `public/data/ispc_data.json`.

### 5. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## ⚙️ GitHub Actions — Scraping automático

El workflow en `.github/workflows/` ejecuta el scraper automáticamente. Para configurarlo en tu fork, agregá los secretos en **Settings → Secrets and variables → Actions**:

| Secret | Descripción |
|--------|-------------|
| `ISPC_USER` | Tu usuario del campus |
| `ISPC_PASSWORD` | Tu contraseña del campus |

---

## 🌐 Demo en vivo

<div align="center">

**[→ gestion-ispc.vercel.app](https://gestion-ispc.vercel.app)**

</div>

---

## 📄 Licencia

Este proyecto es de uso personal y académico. Desarrollado para facilitar el acceso a la información del campus del [ISPC](https://ispc.edu.ar).

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:8b5cf6,100:6366f1&height=100&section=footer" width="100%"/>

**Hecho con ❤️ por [Franco Arce](https://github.com/Franco-Arce)**

</div>
