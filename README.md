# PhysLab — Simulador Visual de Física - Experimento

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zustand](https://img.shields.io/badge/zustand-%23333.svg?style=for-the-badge&logo=react&logoColor=white)](https://github.com/pmndrs/zustand)

> *"Ver para comprender: cada concepto físico cobra vida mediante animación y datos en tiempo real."*

**PhysLab** es una aplicación web interactiva diseñada para experimentar con las enseñanzas de las físicas. Nace de la curiosidad para pensar la fisica de manera diferente, a través de simulaciones y visualizaciones dinámicas para no solo conformarse con las formulas y definiciones, sino que también entenderlas de manera visual e intuitiva. 
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

Puedes acceder a la versión desplegada en vivo del proyecto aquí:  
🌐 **https://alejandrocol-dev.github.io/Fisica-Simulador/**

Si prefieres ejecutar el laboratorio localmente para desarrollo, sigue estos pasos:

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

## 🤝 Contribuciones 

Este proyecto experimental está en constante evolución y **próximamente estaría muy bueno agregar más cosas** (como nuevos módulos, optimizaciones y herramientas educativas). 

¡El repositorio de GitHub está abierto a colaboraciones! Si tienes ideas, mejoras o quieres añadir nuevas simulaciones, siéntete libre de hacer un fork del proyecto y enviar tus *Pull Requests*. Toda ayuda, por pequeña que sea, es súper bienvenida.

---

## 🚀 Roadmap (Próximamente)

El desarrollo no se detiene. Estas son algunas de las funcionalidades planeadas para futuras versiones:

-   [ ] **🌡️ Módulo de Termodinámica:** Simulación de ciclos de gas ideal, procesos adiabáticos e isotérmicos.
-   [ ] **🔦 Óptica Geométrica:** Herramientas interactivas para el trazado de rayos en lentes y espejos.
-   [ ] **🎮 Modo Quiz:** Desafíos y preguntas interactivas para evaluar el aprendizaje de cada módulo.
-   [ ] **📊 Exportación de Datos:** Capacidad de descargar trayectorias y resultados en CSV/JSON para análisis profundo.
-   [ ] **📱 Optimización Mobile:** Mejora de la experiencia táctil en todos los módulos experimentales.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

Desarrollado con ❤️ por **Alejandro Colchi**.
