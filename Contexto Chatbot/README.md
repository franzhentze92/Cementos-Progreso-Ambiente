# Contexto Chatbot

Carpeta fuente de PDFs del departamento de ambiente y legislación.

## Cómo funciona (local + producción)

Los PDFs **no** se suben crudos a Vercel (pesan demasiado y el modelo necesita texto).

1. Colocas/actualizas PDFs aquí (`Información Plataforma/`, `Legislación Ambiental/`, …).
2. Corres la extracción:

```bash
npm run chat:extract-knowledge
```

3. Eso genera texto en `src/lib/chat/knowledge/` (`catalog.json` + `.md`), que **sí** va al repo y se despliega.
4. El chatbot carga ese catálogo automáticamente en local y en producción.

## Notas

- PDFs escaneados (solo imagen) pueden salir casi vacíos: hace falta OCR o un PDF con texto seleccionable.
- Archivos muy grandes (>15 MB) solo se leen las primeras ~40 páginas.
- No subas los PDFs enormes a Git si no hace falta; lo importante para el chat es el texto extraído.
