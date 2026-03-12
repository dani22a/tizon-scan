# Exportación a PDF de Predicciones

## Instalación de Dependencias

Antes de usar la funcionalidad de exportación a PDF, instala la librería `html2pdf.js`:

```bash
npm install html2pdf.js
```

## Características Implementadas

### 📄 Función de Exportación

Se ha integrado una funcionalidad completa de exportación a PDF en la vista de historial de predicciones (`src/app/dashboard/history/page.tsx`).

### 📋 Contenido del PDF

El PDF exportado incluye:

1. **Encabezado**
   - Título: "Reporte de Predicción"
   - ID de la predicción
   - Fecha y hora del análisis

2. **Imagen Analizada**
   - Imagen de entrada con resolución optimizada
   - Escala automática para ajustarse a la página

3. **Fase 1 — Detección (Roboflow)**
   - Coincidencias detectadas (Sí/No)
   - Total de detecciones
   - Clases detectadas
   - Modelo utilizado (model_id)

4. **Fase 2 — Diagnóstico (Mejor Modelo)**
   - Clase predicha (enfermedad detectada)
   - Porcentaje de confianza
   - Modelo seleccionado como mejor

5. **Comparativa de Modelos**
   - Resumen de consenso entre modelos
   - Modelo más confiado
   - Resultados detallados de cada modelo:
     - Predicción y confianza
     - Todas las probabilidades de clase
     - Métricas de entrenamiento:
       - Accuracy (Acc)
       - Precision (Prec)
       - Recall (Rec)
       - F1-Score (F1)

## Uso

1. Navega a la vista de **Historial de Predicciones** en el dashboard
2. Selecciona una predicción para ver sus detalles
3. En la esquina superior derecha, haz clic en el botón **"Exportar a PDF"**
4. El PDF se descargará automáticamente con el nombre: `prediccion_[ID]_[FECHA].pdf`

## Características Técnicas

- **Librería:** html2pdf.js
- **Formato:** PDF A4 vertical (portrait)
- **Tamaño de imagen:** Escala 2x para mejor calidad
- **Mejora de calidad:** JPEG con 98% de calidad
- **Márgenes:** 10mm en todos los lados
- **Diseño:** Optimizado para ocupar una sola página

## Limitaciones Conocidas

- Las imágenes se convierten a JPEG (no PNG)
- El zoom en la vista previa NO se refleja en el PDF (exporta siempre a tamaño original)
- El PDF contiene una representación estática (no interactiva)

## Solución de Problemas

### Error: "html2pdf is not defined"

Asegúrate de haber ejecutado `npm install html2pdf.js` correctamente.

### Error: "Cannot read property 'save' of undefined"

Verifica que la referencia del contenedor `pdfRef` esté correctamente asignada en el elemento div invisible.

### El PDF se ve pixelado

Esto puede deberse a la resolución de la imagen. La configuración actual usa `scale: 2` en html2canvas para mejor calidad.

## Desarrollo Futuro

Posibles mejoras:

- [ ] Agregar logo de la aplicación en el encabezado del PDF
- [ ] Permitir selección de múltiples predicciones para exportar en lote
- [ ] Agregar tabla de comparativa de métricas más legible
- [ ] Exportar también a PNG/JPG
- [ ] Agregar firma/sello de aprobación
