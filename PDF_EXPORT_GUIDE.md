# 📄 Guía: Exportación a PDF de Predicciones

## ✅ Implementación Completada

Se ha integrado exitosamente la funcionalidad de **exportación a PDF** en la vista del historial de predicciones del dashboard.

## 🚀 Instalación Requerida

Antes de usar la funcionalidad, ejecuta:

```bash
npm install html2pdf.js
```

## 📋 Contenido del PDF Exportado

Cada PDF incluye automáticamente una **ficha completa de una sola página** con:

### 1️⃣ Encabezado

- Título: "Reporte de Predicción"
- ID único de la predicción
- Fecha y hora del análisis

### 2️⃣ Imagen Analizada

- Imagen de entrada optimizada para PDF
- Escala: 250px max (adaptable a A4)
- Bordes para claridad

### 3️⃣ Fase 1 — Detección (Modelo: Roboflow)

- **Coincidencias**: Indica si se detectaron enfermedades
- **Total de Detecciones**: Número de objetos detectados
- **Clases Detectadas**: Lista de enfermedades encontradas
- **Modelo Utilizado**: ID del modelo Roboflow

### 4️⃣ Fase 2 — Diagnóstico (Mejor Modelo)

- **Predicción**: Enfermedad diagnosticada (Tizón Temprano / Tardío / Saludable)
- **Confianza**: Porcentaje de certeza
- **Modelo**: Cuál de los 3 modelos fue el mejor (EfficientNet / ResNet / MobileViT)

### 5️⃣ Comparativa de Modelos

Análisis detallado de los tres modelos:

- **Consenso entre modelos**: Si todos coinciden en el diagnóstico
- **Modelo más confiado**: Cuál tiene mayor confianza
- Para cada modelo:
  - Predicción y porcentaje de confianza
  - Probabilidades para cada clase
  - Métricas de entrenamiento:
    - **Acc** (Accuracy): Exactitud general
    - **Prec** (Precision): Precisión en positivos
    - **Rec** (Recall): Sensibilidad
    - **F1**: Balance harmónico (Precision-Recall)

## 🖱️ Cómo Usar

1. Ve a **Historial de Predicciones** en el dashboard
2. Selecciona una predicción para ver sus detalles
3. Haz clic en el botón **"Exportar a PDF"** (esquina superior derecha)
4. El PDF se descargará automáticamente con el nombre:
   ```
   prediccion_[ID]_[FECHA].pdf
   ```

## ⚙️ Configuración Técnica

- **Librería**: `html2pdf.js`
- **Formato**: A4 Portrait (vertical)
- **Resolución de imagen**: 2x (alta calidad)
- **Calidad JPEG**: 98%
- **Márgenes**: 10mm en todos lados
- **Optimización**: Diseño en una sola página

## 🔔 Notificaciones

- ✅ **Éxito**: "PDF exportado exitosamente"
- ❌ **Error**: "Error al exportar el PDF"

## 📝 Notas Importantes

1. **Las imágenes se convierten a JPEG** (no PNG) para compatibilidad
2. **El zoom de la vista previa NO se refleja** en el PDF (siempre exporta a tamaño original)
3. **Los PDFs son estáticos**, no interactivos
4. **Funciona completamente en cliente-side** (no requiere backend)

## 🐛 Solución de Problemas

| Problema                  | Solución                                        |
| ------------------------- | ----------------------------------------------- |
| `html2pdf is not defined` | Ejecutar `npm install html2pdf.js`              |
| PDF pixelado              | Usar zoom 2x en configuración (ya implementado) |
| Imagen no aparece en PDF  | Verificar CORS en `imagen_url`                  |
| PDF se ve corrupto        | Probar con otro navegador o vaciar caché        |

## 📂 Archivos Modificados

- [src/app/dashboard/history/page.tsx](../src/app/dashboard/history/page.tsx)
  - Import de `html2pdf.js`
  - Función `exportToPDF()`
  - Ref `pdfRef` para contenido invisible
  - Botón "Exportar a PDF" en UI
  - Elementocontenedor invisible con toda la información

## 🎨 Personalización Futura

Posibles mejoras:

- [ ] Logo de la aplicación en encabezado
- [ ] Exportación en lote (múltiples predicciones)
- [ ] Tabla comparativa visual mejorada
- [ ] Exportar como PNG/JPG además de PDF
- [ ] Firma digital o sello de aprobación
- [ ] Gráficos de métricas
- [ ] Idioma seleccionable (EN/ES)

## 📞 Soporte

Si encuentras problemas:

1. Verifica que `npm install html2pdf.js` se ejecutó correctamente
2. Comprueba que el navegador no tiene bloqueado CORS
3. Intenta con un navegador diferente
4. Revisa la consola del navegador para mensajes de error
