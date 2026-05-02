# ⚛️ PhysLab Pro — Simulador Visual de Física

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zustand](https://img.shields.io/badge/zustand-%23333.svg?style=for-the-badge&logo=react&logoColor=white)](https://github.com/pmndrs/zustand)

> *"Ver para comprender: cada concepto físico cobra vida mediante animación y datos en tiempo real."*

**PhysLab Pro** es una plataforma educativa interactiva diseñada para transformar la enseñanza de la física. A través de simulaciones de alta precisión y visualizaciones dinámicas, permite a estudiantes y docentes explorar fenómenos complejos de mecánica, ondas y electromagnetismo de forma intuitiva.

---

## 🚀 Características Principales

-   **Simulación en Tiempo Real:** Motor de física propio basado en integración numérica de alta precisión (RK4).
-   **Visualización Dinámica:** Animaciones fluidas a 60 FPS utilizando **Canvas API**.
-   **Gráficos Sincronizados:** Gráficos interactivos de posición, velocidad y aceleración que se actualizan al instante.
-   **Interactividad Total:** Modifica parámetros como masa, gravedad, fricción o carga eléctrica y observa el impacto inmediato.
-   **Diseño Premium:** Interfaz de "Modo Laboratorio" (Dark Mode) optimizada para la claridad visual y el enfoque.

---

## 🛠️ Módulos Implementados

Actualmente, el simulador cuenta con los siguientes laboratorios virtuales:

*   **📏 Cinemática 1D & 2D:** Movimiento rectilíneo y parabólico con trazado de trayectorias.
*   **⛓️ Oscilaciones (MAS):** Sistemas masa-resorte y péndulos con análisis de amortiguamiento.
*   **⚖️ Dinámica & Energía:** Planos inclinados, diagramas de cuerpo libre y conservación de la energía mecánica.
*   **⚡ Electromagnetismo:** Visualización de campos y circuitos básicos.

---

## 🏗️ Stack Tecnológico

-   **Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
-   **Bundler:** [Vite](https://vitejs.dev/)
-   **Estado:** [Zustand](https://zustand-demo.pmnd.rs/) (Gestión de estado ligero y rápido)
-   **Gráficos:** Canvas API (Renderizado de simulación) & [Chart.js](https://www.chartjs.org/) (Gráficos de datos)
-   **Estilos:** CSS Moderno con variables y diseño responsivo.

---

## 📂 Estructura del Proyecto

Cada módulo de simulación sigue una arquitectura robusta y desacoplada:

```text
src/modules/[tema]/
├── physics-engine.ts  # Lógica matemática y ecuaciones diferenciales
├── renderer.ts        # Renderizado visual en el Canvas
├── controls.tsx       # Interfaz de usuario para parámetros
├── charts.tsx         # Visualización de datos en tiempo real
└── theory.md          # Documentación educativa del fenómeno
```

---

## 🛠️ Instalación y Desarrollo

Para ejecutar el laboratorio localmente, sigue estos pasos:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/alejandrocol-dev/Fisica-Simulador.git
    ```
2.  **Instalar dependencias:**
    ```bash
    npm install
    ```
3.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
4.  **Abrir en el navegador:**
    Visita `http://localhost:5173`

---

## 📖 Roadmap (Próximamente)

-   [ ] **Módulo de Termodinámica:** Ciclos de gas ideal y procesos adiabáticos.
-   [ ] **Óptica Geométrica:** Trazado de rayos en lentes y espejos.
-   [ ] **Modo Quiz:** Desafíos interactivos para poner a prueba conocimientos.
-   [ ] **Exportación de Datos:** Descarga de resultados en formato CSV para análisis externo.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

Desarrollado con ❤️ por [Alejandro Col](https://github.com/alejandrocol-dev)
