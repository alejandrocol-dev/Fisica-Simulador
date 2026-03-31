PhysLab | Informe de Requerimientos de Software    v1.0 — 2025
|<p>**Informe de Requerimientos de Software**</p><p>Simulador Visual Interactivo de Física — PhysLab Pro</p>|<p>**PHYSLAB PRO**</p><p>Versión 1.0  |  2025</p>|
| :- | :-: |

|**Producto**|PhysLab — Simulador Visual de Física|
| :- | :- |
|**Tipo de documento**|Software Requirements Specification (SRS)|
|**Versión**|1\.0|
|**Audiencia objetivo**|Estudiantes de nivel secundario y universitario|
|**Plataformas**|Web (PWA), iOS, Android|
|**Fecha de elaboración**|2025|
|**Estado**|Borrador inicial — Para revisión|


# **1. Introducción**
## **1.1 Propósito del Documento**
Este documento especifica los requerimientos funcionales, no funcionales y de sistema para el desarrollo de PhysLab, una aplicación educativa de simulación visual de Física. El objetivo es proveer a desarrolladores, diseñadores y stakeholders una referencia completa y detallada de lo que debe construirse.

## **1.2 Visión del Producto**
PhysLab Pro es una herramienta de aprendizaje visual que permite a estudiantes explorar principios físicos de manera interactiva. A diferencia de los libros de texto estáticos, la aplicación simula fenómenos físicos en tiempo real, con parámetros ajustables, animaciones dinámicas y gráficos sincronizados. La premisa central es:

*"Ver para comprender: cada concepto físico cobra vida mediante animación y datos en tiempo real."*

## **1.3 Alcance**
La aplicación cubre los siguientes dominios de la física en su versión inicial (v1.0):

- Mecánica Clásica (cinemática y dinámica)
- Oscilaciones y Movimiento Armónico Simple
- Termodinámica básica
- Óptica geométrica
- Electricidad y Magnetismo introductorio
- Ondas y sonido

## **1.4 Definiciones y Acrónimos**

|**SRS**|Software Requirements Specification|
| :- | :- |
|**MAS**|Movimiento Armónico Simple|
|**UI/UX**|User Interface / User Experience|
|**PWA**|Progressive Web App|
|**FPS**|Frames Per Second (fotogramas por segundo)|
|**Canvas API**|API del navegador para gráficos 2D de alto rendimiento|
|**WebGL**|API para gráficos 3D acelerados por hardware en navegadores|


# **2. Descripción General del Sistema**
## **2.1 Perspectiva del Producto**
PhysLab Pro opera como una aplicación standalone, sin requerir instalación de software adicional en su versión web. Se integra opcionalmente con plataformas LMS (Moodle, Google Classroom) a través de un sistema de exportación de resultados. No depende de servidores externos para las simulaciones: toda la computación ocurre en el dispositivo del usuario (client-side), garantizando disponibilidad offline.

## **2.2 Perfil de Usuarios**

|**Módulo**|**Descripción**|**Parámetros Clave**|
| :- | :- | :- |
|**Estudiante secundario**|Usuario principal. Usa la app para reforzar conceptos del aula con visualizaciones intuitivas.|Interfaz simple, guías paso a paso|
|**Estudiante universitario**|Explora simulaciones avanzadas, ajusta parámetros complejos y exporta datos.|Control total de parámetros, exportación CSV|
|**Docente / Profesor**|Prepara demostraciones para clase, crea escenarios predefinidos para sus alumnos.|Modo presentación, creación de escenarios|
|**Autodidacta**|Aprende física por cuenta propia, valora la autonomía y la profundidad.|Modo exploración libre, sin límites de parámetros|

## **2.3 Restricciones Generales**
- La aplicación debe funcionar en dispositivos con mínimo 2 GB de RAM y procesador de doble núcleo.
- Las simulaciones deben correr a un mínimo de 30 FPS en hardware de gama media.
- La interfaz debe ser completamente funcional en pantallas desde 5 pulgadas (móvil) hasta 27 pulgadas (escritorio).
- El tiempo de carga inicial de cualquier simulación no debe superar los 3 segundos en conexión 4G.


# **3. Módulos de Simulación Física**
Cada módulo constituye una experiencia de simulación autocontenida. A continuación se detallan los módulos requeridos para v1.0:

|**Módulo**|**Descripción**|**Parámetros Clave**|
| :- | :- | :- |
|**Oscilaciones / MAS**|Simula masa-resorte y péndulo simple. Muestra posición, velocidad y aceleración en tiempo real con gráficos XY.|Masa (kg), constante k (N/m), amplitud, amortiguamiento (b), gravedad|
|**Cinemática**|Proyectil y MRU/MRUA con trayectoria animada y gráficas x(t), v(t), a(t) simultáneas.|Velocidad inicial, ángulo de lanzamiento, aceleración, tiempo total|
|**Dinámica / Fuerzas**|Diagrama de fuerzas sobre plano inclinado y superficie plana. Visualiza vectores de fuerzas.|Masa, ángulo plano, coef. fricción estática/cinética|
|**Termodinámica**|Ciclo de gas ideal (PV-nRT). Animación de pistón con partículas. Gráfica P-V en tiempo real.|Presión, Volumen, Temperatura, moles de gas (n)|
|**Óptica Geométrica**|Reflexión y refracción de rayos. Espejos y lentes con trazado de rayos en tiempo real.|Índice de refracción, radio de curvatura, distancia focal|
|**Electricidad**|Circuito RC/RL interactivo. Animación de flujo de corriente y gráfica V(t)/I(t).|Resistencia (Ω), Capacitancia (F), Inductancia (H), Voltaje fuente|
|**Ondas y Sonido**|Superposición de ondas, interferencia y onda estacionaria. Visualización de amplitud y frecuencia.|Amplitud, frecuencia (Hz), velocidad de onda, desfase|


# **4. Requerimientos Funcionales**
## **4.1 Módulo de Simulación — Núcleo**

|**ID**|**Requerimiento**|**Módulo**|**Prioridad**|
| :- | :- | :- | :- |
|RF-01|El sistema debe renderizar animaciones físicas en tiempo real a mínimo 30 FPS.|Todos|Alta|
|RF-02|El usuario puede pausar, reanudar y reiniciar cualquier simulación en cualquier momento.|Todos|Alta|
|RF-03|El usuario puede modificar parámetros físicos mediante sliders, campos numéricos y botones mientras la simulación corre.|Todos|Alta|
|RF-04|Los cambios en parámetros deben reflejarse en la simulación en menos de 100ms.|Todos|Alta|
|RF-05|El sistema debe mostrar el valor numérico actual de todas las variables de estado en tiempo real.|Todos|Alta|
|RF-06|La simulación debe implementar las ecuaciones físicas correctas para cada fenómeno.|Todos|Crítica|

## **4.2 Visualización y Gráficos**

|**ID**|**Requerimiento**|**Módulo**|**Prioridad**|
| :- | :- | :- | :- |
|RF-07|Cada simulación debe mostrar al menos 2 gráficos dinámicos sincrónicos (ej: x(t) y v(t)).|Todos|Alta|
|RF-08|Los gráficos deben actualizarse en tiempo real, dibujando la curva a medida que avanza la simulación.|Todos|Alta|
|RF-09|El usuario puede hacer zoom en los gráficos y desplazar los ejes.|Todos|Media|
|RF-10|El sistema debe resaltar visualmente el punto actual en el gráfico correspondiente a la posición de la simulación.|Todos|Media|
|RF-11|Los gráficos deben incluir etiquetas de ejes, unidades y título.|Todos|Alta|
|RF-12|El usuario puede exportar los datos del gráfico como archivo CSV.|Todos|Media|
|RF-13|El usuario puede tomar una captura del estado actual de la simulación y guardarla como imagen PNG.|Todos|Baja|

## **4.3 Interfaz y Navegación**

|**ID**|**Requerimiento**|**Módulo**|**Prioridad**|
| :- | :- | :- | :- |
|RF-14|La pantalla principal debe mostrar un menú de selección de temas de física con iconos representativos.|App|Alta|
|RF-15|Dentro de cada simulación, existirá un panel lateral de parámetros siempre visible.|Todos|Alta|
|RF-16|El sistema debe proveer un modo pantalla completa que oculte el panel de parámetros para presentaciones.|Todos|Media|
|RF-17|La app debe incluir una sección de ayuda contextual con la explicación teórica del fenómeno simulado.|Todos|Alta|
|RF-18|El usuario puede guardar configuraciones personalizadas de parámetros como 'presets' con nombre.|Todos|Media|
|RF-19|La app debe incluir presets predefinidos de escenarios clásicos (ej: 'Resonancia', 'Caída libre en Luna').|Todos|Alta|

## **4.4 Módulo Educativo**

|**ID**|**Requerimiento**|**Módulo**|**Prioridad**|
| :- | :- | :- | :- |
|RF-20|Cada simulación incluirá una ficha teórica con la ecuación diferencial o fórmula que rige el fenómeno.|Todos|Alta|
|RF-21|El sistema incluirá un modo 'Quiz' que propone ejercicios: el estudiante ajusta parámetros para lograr un resultado objetivo.|App|Media|
|RF-22|Se mostrará una leyenda de colores que explica qué representa cada elemento visual en la simulación.|Todos|Alta|
|RF-23|La app mostrará datos de energía (cinética, potencial, total) en simulaciones mecánicas.|Mecánica|Alta|


# **5. Requerimientos No Funcionales**
## **5.1 Rendimiento**
- Las simulaciones deben mantener mínimo 30 FPS en dispositivos de gama media (CPU de 4 núcleos, 4 GB RAM).
- En dispositivos de alta gama, el objetivo es 60 FPS con máxima calidad visual.
- El tiempo de arranque de la app no debe superar 4 segundos en red 4G.
- Las transiciones entre módulos deben ser menores a 500ms.

## **5.2 Usabilidad**
- Un usuario sin experiencia previa debe poder iniciar y manipular una simulación básica en menos de 2 minutos, sin instrucciones externas.
- La interfaz debe seguir principios de diseño accesible: contraste mínimo WCAG AA, textos legibles en tamaño mínimo 14px.
- Los controles deben tener un tamaño de toque mínimo de 44x44px en móvil.
- Todos los mensajes de error deben ser descriptivos y ofrecer una acción correctiva.

## **5.3 Portabilidad**
- Compatible con Chrome, Firefox, Safari y Edge en sus últimas dos versiones mayores.
- La versión móvil nativa debe soportar iOS 15+ y Android 10+.
- Debe funcionar offline luego de la primera carga (modo PWA con Service Worker).

## **5.4 Mantenibilidad**
- El código fuente debe seguir una arquitectura modular: cada simulación es un módulo independiente que puede añadirse sin modificar el núcleo.
- Debe incluir documentación técnica interna (JSDoc o similar) en todos los módulos de simulación.
- Cobertura de tests unitarios mínima del 70% sobre los motores de simulación física.

## **5.5 Seguridad y Privacidad**
- No se recopilan datos personales del usuario sin consentimiento explícito.
- Las configuraciones y presets del usuario se almacenan localmente (LocalStorage / IndexedDB).
- Si se implementa sincronización en la nube (v2.0), deberá cumplir con GDPR y PDPA.


# **6. Arquitectura Técnica Propuesta**
## **6.1 Stack Tecnológico Recomendado**

|**Módulo**|**Descripción**|**Parámetros Clave**|
| :- | :- | :- |
|**Frontend Framework**|React con TypeScript. Gestión de estado global con Zustand.|Componentización, tipado estricto|
|**Motor de Simulación**|Motor de física propio basado en integración Runge-Kutta de 4to orden (RK4) para precisión.|Paso de tiempo configurable (dt)|
|**Renderizado Animación**|Canvas API 2D para simulaciones 2D. Opcionalmente Three.js/WebGL para módulos 3D.|60 FPS objetivo|
|**Gráficos / Charts**|Chart.js con plugin de streaming (chartjs-plugin-streaming) para graficado en tiempo real.|Actualización 30+ FPS|
|**Persistencia Local**|IndexedDB (via Dexie.js) para presets y progreso del usuario.|Soporte offline|
|**Estilos**|Tailwind CSS + componentes custom. Modo oscuro nativo.|Responsive, accesible|
|**Build / Deploy**|Vite para bundling. PWA plugin para Workbox/Service Worker.|Carga rápida, offline|

## **6.2 Estructura de Módulos**
Cada módulo de simulación seguirá la siguiente estructura estandarizada:

- physics-engine.ts: Implementa las ecuaciones diferenciales y calcula el estado siguiente dado el estado actual y dt.
- renderer.ts: Dibuja en Canvas el estado visual de la simulación (objetos, vectores, trayectorias).
- controls.tsx: Componente React con los sliders, campos y botones de parámetros.
- charts.tsx: Componente de gráficos en tiempo real (Chart.js).
- theory.md: Contenido educativo (ecuaciones, explicaciones) renderizado como panel de ayuda.
- presets.ts: Escenarios predefinidos del módulo.


# **7. Requerimientos de UX/UI**
## **7.1 Layout Principal de Simulación**
La pantalla de una simulación activa debe organizarse en tres zonas claramente diferenciadas:

|<p>**Panel de Parámetros (izq.)**</p><p>Sliders y campos numéricos para modificar variables. Botones de control (play/pause/reset). Selector de presets.</p>|<p>**Canvas de Simulación (centro)**</p><p>Animación principal en tiempo real. Muestra el objeto físico, vectores, trayectorias y etiquetas de valores actuales.</p>|<p>**Panel de Gráficos (der.)**</p><p>2 o más gráficos en tiempo real (ej: x(t), v(t)). Sincronizados con la animación. Exportables.</p>|
| :- | :- | :- |

## **7.2 Principios de Diseño Visual**
- Tema oscuro por defecto (modo laboratorio): fondo oscuro con elementos luminosos para mejor contraste de animaciones.
- Código de colores consistente entre módulos: rojo para velocidad, verde para posición, azul para aceleración/fuerza.
- Tipografía clara: fuente sans-serif (Inter o similar) para la interfaz; fuente monoespaciada para valores numéricos.
- Iconografía propia de física: íconos de átomos, resortes, lentes, etc. en el menú de módulos.


# **8. Plan de Desarrollo por Fases**

|**ID**|**Entregable**|**Descripción**|**Prioridad**|
| :- | :- | :- | :- |
|F1-01|MVP — Módulo Oscilaciones|Simulación masa-resorte con gráficos x(t) y v(t). Sliders de masa, k y amortiguamiento.|Crítica|
|F1-02|MVP — Módulo Cinemática|Proyectil con trayectoria y gráficas x(t), y(t). Parámetros de velocidad y ángulo.|Crítica|
|F1-03|Infraestructura de App|Menú de selección de módulos, layout base, navegación y sistema de presets.|Crítica|
|F2-01|Módulo Dinámica|Plano inclinado con vectores de fuerzas. Coeficiente de fricción ajustable.|Alta|
|F2-02|Módulo Termodinámica|Gas ideal con pistón y gráfica P-V.|Alta|
|F2-03|Panel educativo|Fichas teóricas por módulo con ecuaciones renderizadas (KaTeX).|Alta|
|F3-01|Módulo Óptica|Lentes y espejos con trazado de rayos interactivo.|Media|
|F3-02|Módulo Electricidad|Circuitos RC/RL con animación de corriente.|Media|
|F3-03|Módulo Ondas|Superposición e interferencia de ondas.|Media|
|F4-01|Modo Quiz|Ejercicios interactivos con objetivo de parámetros.|Baja|
|F4-02|Exportación de datos|CSV de datos de gráficos y captura PNG de simulaciones.|Media|
|F4-03|PWA offline|Service Worker para uso sin conexión.|Media|


# **9. Criterios de Aceptación**
## **9.1 Simulación Funcional**
- Las ecuaciones de movimiento producen resultados dentro del 1% de error respecto a la solución analítica en casos con solución exacta (ej: MAS sin amortiguamiento).
- Las simulaciones no presentan discontinuidades visuales ni saltos bruscos al modificar parámetros.
- Todos los módulos de la fase 1 y 2 funcionan correctamente en Chrome, Firefox y Safari.

## **9.2 Experiencia de Usuario**
- Un grupo de 10 estudiantes de secundaria puede completar la tarea 'ajustar el resorte para lograr amplitud 5 cm' en menos de 3 minutos sin instrucciones.
- El NPS (Net Promoter Score) en pruebas de usuario alcanza un mínimo de 7/10.
- Ningún usuario reporta confusión sobre qué controla cada parámetro en el panel.

## **9.3 Rendimiento**
- Benchmark en dispositivo de referencia (iPhone 12 / Android gama media): mínimo 30 FPS estables durante 5 minutos continuos.
- Tamaño del bundle inicial (sin lazy loading) no supera 2 MB.


# **10. Riesgos y Mitigaciones**

|**Riesgo**|**Impacto**|**Mitigación**|
| :- | :- | :- |
|Rendimiento insuficiente en móvil de gama baja|Alto|Usar RK4 con paso de tiempo adaptativo; reducir complejidad gráfica en modo 'bajo rendimiento' automático.|
|Errores numéricos acumulativos en simulaciones largas|Medio|Implementar reset periódico de estado; usar aritmética de punto flotante de doble precisión.|
|Complejidad de implementar todos los módulos en v1.0|Alto|Priorizar Oscilaciones y Cinemática como MVP; entregar módulos adicionales en sprints posteriores.|
|Curva de aprendizaje de la interfaz demasiado alta|Medio|Incluir un tutorial interactivo al primer uso; tooltips en cada parámetro.|
|Ecuaciones físicas incorrectas que confunden al estudiante|Crítico|Revisión por un físico docente antes de cada lanzamiento de módulo.|


# **11. Glosario de Términos Físicos**

|**MAS**|Movimiento Armónico Simple: oscilación periódica cuya fuerza restauradora es proporcional al desplazamiento (Ley de Hooke).|
| :- | :- |
|**Constante k**|Constante de rigidez del resorte, en N/m. Determina la 'dureza' del resorte.|
|**Amortiguamiento (b)**|Coeficiente que modela la pérdida de energía por fricción o resistencia del medio.|
|**RK4**|Runge-Kutta de 4to orden: método numérico de alta precisión para resolver ecuaciones diferenciales ordinarias.|
|**Diagrama de fase**|Gráfico que muestra la relación entre posición y velocidad de un sistema oscilante; revela el tipo de atractor.|
|**Período (T)**|Tiempo en completar una oscilación completa, expresado en segundos.|
|**Frecuencia angular (ω)**|Velocidad angular de la oscilación en radianes por segundo. ω = 2π/T.|



*— Documento elaborado con PhysLab Pro SRS Generator —*
Confidencial — Uso Interno    |    Pág. 1
