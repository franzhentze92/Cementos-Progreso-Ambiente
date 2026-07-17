import {
  CLASIFICACION_LABELS,
  INSPECCION_PROYECTOS,
  inspeccionScopeFromSite,
  parseClasificacion,
  type InspeccionArea,
  type InspeccionClasificacion,
  type InspeccionHallazgoDraft,
  type InspeccionProyecto,
} from '../../data/inspeccionesCampo'
import { parseMaterialDescarga } from '../../data/descargaBarcosInspecciones'
import {
  cancelInspeccionCampo,
  completeInspeccionCampo,
  createInspeccionCampoDraft,
  ensureArea,
  loadAreasForPlanta,
  saveHallazgoInmediato,
  uploadInspeccionFoto,
} from '../inspeccionesCampoApi'

export type InspectionChip = {
  id: string
  label: string
}

export type InspectionStep =
  | 'idle'
  | 'select_project'
  | 'select_material'
  | 'select_area'
  | 'select_classification'
  | 'await_photo'
  | 'confirm_more_same'
  | 'await_area_comment'
  | 'select_next'
  | 'await_general_comment'
  | 'done'

export type InspectionFlowState = {
  step: InspectionStep
  inspeccionId: string | null
  proyecto: InspeccionProyecto | null
  /** Clinker | Coque cuando el proyecto es Descarga Barcos */
  materialDescarga: string
  areas: InspeccionArea[]
  pendingAreaIds: string[]
  currentArea: InspeccionArea | null
  draftPhotos: { url: string; preview: string }[]
  draftClasificacion: InspeccionClasificacion | null
  hallazgos: InspeccionHallazgoDraft[]
  comentarioGeneral: string
  notaGeneral: string
}

export type InspectionUiMode = {
  chips: InspectionChip[]
  expectPhoto: boolean
  allowSkipComment: boolean
  placeholder: string
}

export type InspectionTurnResult = {
  state: InspectionFlowState
  botText: string
  ui: InspectionUiMode
  speakText?: string
}

const CANCEL_RE =
  /^(cancelar|cancela|salir|terminar flujo|abortar)([.!?\s]|$)/i

const START_RE =
  /(?:quiero|vamos|deseo|necesito).{0,20}inspecci[oó]n|hacer\s+(una\s+)?inspecci[oó]n|iniciar\s+(una\s+)?inspecci[oó]n|nueva\s+inspecci[oó]n|empezar\s+(una\s+)?inspecci[oó]n/i

const SKIP_AREA_RE =
  /^(saltar|omitir|skip|pasar|siguiente\s+sin\s+inspeccionar)([.!?\s]|$)/i

const FINISH_RE =
  /^(terminar|finalizar|ya\s+termin[eé]|no\s+hay\s+m[aá]s|acab[eé]|fin)([.!?\s]|$)/i

const NO_COMMENT_RE =
  /^(sin\s+comentario|ninguno|ninguna|n\/a|na|paso)([.!?\s]|$)/i

const YES_RE =
  /^(si|sí|yes|claro|dale|continuar|seguir|mas|más)([.!?\s]|$)/i

const NO_RE = /^(no|nop|nel|listo|ya\s+no|terminar)([.!?\s]|$)/i

/** Etiqueta en plural para el tipo elegido (mensajes del flujo). */
function clasificacionPhrase(c: InspeccionClasificacion | null): string {
  switch (c) {
    case 'buena_practica':
      return 'buenas prácticas'
    case 'situacion_riesgo':
      return 'situaciones de riesgo'
    case 'observacion_general':
      return 'observaciones'
    default:
      return 'hallazgos'
  }
}

function emptyUi(partial?: Partial<InspectionUiMode>): InspectionUiMode {
  return {
    chips: [],
    expectPhoto: false,
    allowSkipComment: false,
    placeholder: 'Escribe tu mensaje…',
    ...partial,
  }
}

export function createIdleInspectionState(): InspectionFlowState {
  return {
    step: 'idle',
    inspeccionId: null,
    proyecto: null,
    materialDescarga: '',
    areas: [],
    pendingAreaIds: [],
    currentArea: null,
    draftPhotos: [],
    draftClasificacion: null,
    hallazgos: [],
    comentarioGeneral: '',
    notaGeneral: '',
  }
}

export function isInspectionFlowActive(state: InspectionFlowState): boolean {
  return state.step !== 'idle' && state.step !== 'done'
}

export function wantsStartInspection(text: string): boolean {
  return START_RE.test(text.trim())
}

function projectChips(): InspectionChip[] {
  return INSPECCION_PROYECTOS.map((p) => ({ id: p.id, label: p.label }))
}

function materialChips(): InspectionChip[] {
  return [
    { id: 'Clinker', label: 'Clinker' },
    { id: 'Coque', label: 'Coque' },
  ]
}

function isDescargaBarcosProject(proyecto: InspeccionProyecto): boolean {
  return (
    inspeccionScopeFromSite({
      plantaSede: proyecto.plantaSede,
      unidadNegocio: proyecto.unidadNegocio,
    }) === 'descarga-barcos'
  )
}

function askForMaterial(state: InspectionFlowState): InspectionTurnResult {
  return reply(
    { ...state, step: 'select_material' },
    `En Descarga Barcos, ¿qué material se está descargando: Clinker o Coque?`,
    emptyUi({
      chips: materialChips(),
      placeholder: 'Clinker o Coque…',
    }),
  )
}

async function startDraftAndAskArea(
  state: InspectionFlowState,
  proyecto: InspeccionProyecto,
  responsable: string,
  materialDescarga = '',
): Promise<InspectionTurnResult> {
  const draft = await createInspeccionCampoDraft({
    plantaSede: proyecto.plantaSede,
    unidadNegocio: proyecto.unidadNegocio,
    responsable,
    materialDescarga,
  })
  return askForArea({
    ...state,
    proyecto,
    materialDescarga,
    inspeccionId: draft.id,
  })
}

function areaChips(
  areas: InspeccionArea[],
  pendingIds: string[],
): InspectionChip[] {
  const pending = new Set(pendingIds)
  return areas
    .filter((a) => pending.has(a.id))
    .map((a) => ({ id: a.id, label: a.nombre }))
}

function classificationChips(): InspectionChip[] {
  return (Object.keys(CLASIFICACION_LABELS) as InspeccionClasificacion[]).map(
    (id) => ({ id, label: CLASIFICACION_LABELS[id] }),
  )
}

function nextAreaChips(state: InspectionFlowState): InspectionChip[] {
  const chips = areaChips(state.areas, state.pendingAreaIds)
  const extras: InspectionChip[] = [
    { id: '__finish__', label: 'Terminar inspección' },
    { id: '__new_area__', label: 'Otra área (escribir)' },
  ]
  if (chips.length > 0) {
    extras.unshift({ id: '__skip_area__', label: 'Saltar esta área' })
  }
  return [...chips, ...extras]
}

function resolveProject(raw: string): InspeccionProyecto | null {
  const t = raw.trim().toLowerCase()
  const byId = INSPECCION_PROYECTOS.find((p) => p.id === raw || p.id === t)
  if (byId) return byId
  return (
    INSPECCION_PROYECTOS.find(
      (p) =>
        p.label.toLowerCase() === t ||
        p.plantaSede.toLowerCase() === t ||
        t.includes(p.label.toLowerCase()),
    ) ?? null
  )
}

function resolveArea(
  raw: string,
  areas: InspeccionArea[],
  pendingIds: string[],
): InspeccionArea | null {
  if (raw === '__new_area__') return null
  const byId = areas.find((a) => a.id === raw)
  if (byId) return byId
  const t = raw.trim().toLowerCase()
  const pending = areas.filter((a) => pendingIds.includes(a.id))
  return (
    pending.find((a) => a.nombre.toLowerCase() === t) ??
    areas.find((a) => a.nombre.toLowerCase() === t) ??
    null
  )
}

function reply(
  state: InspectionFlowState,
  botText: string,
  ui: InspectionUiMode,
): InspectionTurnResult {
  return { state, botText, ui, speakText: botText }
}

export function beginInspectionFlow(
  responsable?: string,
): InspectionTurnResult {
  const state = createIdleInspectionState()
  state.step = 'select_project'
  const who = responsable?.trim() ? `, ${responsable.trim().split(' ')[0]}` : ''
  return reply(
    state,
    `Perfecto${who}. ¿Para qué proyecto vamos a hacer la inspección?`,
    emptyUi({
      chips: projectChips(),
      placeholder: 'Elige un proyecto o escríbelo…',
    }),
  )
}

async function askForArea(
  state: InspectionFlowState,
  prefix?: string,
): Promise<InspectionTurnResult> {
  if (!state.proyecto) {
    return beginInspectionFlow()
  }

  const areas = await loadAreasForPlanta(
    state.proyecto.plantaSede,
    state.proyecto.unidadNegocio,
  )
  const next: InspectionFlowState = {
    ...state,
    areas,
    pendingAreaIds: areas.map((a) => a.id),
    step: 'select_area',
    currentArea: null,
    draftPhotos: [],
    draftClasificacion: null,
  }

  if (!areas.length) {
    return reply(
      next,
      `${prefix ? `${prefix} ` : ''}No hay áreas guardadas para ${state.proyecto.label}. Escribe el nombre del área donde estás (ej. Bodega, Molino, Patio).`,
      emptyUi({
        placeholder: 'Nombre del área…',
      }),
    )
  }

  return reply(
    next,
    `${prefix ? `${prefix} ` : ''}¿En qué área estás ahora?`,
    emptyUi({
      chips: [
        ...areaChips(areas, next.pendingAreaIds),
        { id: '__new_area__', label: 'Otra área (escribir)' },
      ],
      placeholder: 'Elige un área o escribe una nueva…',
    }),
  )
}

function askClassification(state: InspectionFlowState): InspectionTurnResult {
  const areaName = state.currentArea?.nombre ?? 'esta área'
  return reply(
    {
      ...state,
      step: 'select_classification',
      draftPhotos: [],
      draftClasificacion: null,
    },
    `En ${areaName}, ¿viste una buena práctica, una observación o un riesgo?`,
    emptyUi({
      chips: classificationChips(),
      placeholder: 'Buena práctica, riesgo u observación…',
    }),
  )
}

function askForPhoto(
  state: InspectionFlowState,
  opts?: { more?: boolean },
): InspectionTurnResult {
  const areaName = state.currentArea?.nombre ?? 'el área'
  const tipo = clasificacionPhrase(state.draftClasificacion)
  const more = opts?.more === true
  const msg = more
    ? `Sube más fotos de ${tipo} en ${areaName}. Cuando termines, toca «Listo con fotos».`
    : `Abre la cámara y toma foto(s) de ${tipo} en ${areaName}. Cuando las tengas, toca «Listo con fotos».`

  return reply(
    {
      ...state,
      step: 'await_photo',
      draftPhotos: more ? state.draftPhotos : [],
    },
    msg,
    emptyUi({
      expectPhoto: true,
      chips: [
        { id: '__take_photo__', label: more ? 'Tomar otra foto' : 'Tomar foto ahora' },
        { id: '__photos_done__', label: 'Listo con fotos' },
      ],
      placeholder: more
        ? 'Sube más fotos o «Listo con fotos»…'
        : 'Toma la foto con la cámara…',
    }),
  )
}

function askContinueSame(state: InspectionFlowState): InspectionTurnResult {
  const tipo = clasificacionPhrase(state.draftClasificacion)
  return reply(
    { ...state, step: 'confirm_more_same' },
    `¿Vas a seguir con más ${tipo}?`,
    emptyUi({
      chips: [
        { id: '__yes__', label: 'Sí' },
        { id: '__no__', label: 'No' },
      ],
      placeholder: 'Sí o No…',
    }),
  )
}

function askAreaComment(state: InspectionFlowState): InspectionTurnResult {
  const areaName = state.currentArea?.nombre ?? 'esta área'
  const tipo = clasificacionPhrase(state.draftClasificacion)
  return reply(
    { ...state, step: 'await_area_comment' },
    `¿Cuál es el comentario final de ${areaName} sobre las ${tipo}? (opcional)`,
    emptyUi({
      allowSkipComment: true,
      chips: [{ id: '__no_comment__', label: 'Sin comentario' }],
      placeholder: `Comentario de ${tipo}…`,
    }),
  )
}

function askNext(state: InspectionFlowState): InspectionTurnResult {
  const pending = areaChips(state.areas, state.pendingAreaIds)
  const remaining = pending.length
  const msg =
    remaining > 0
      ? `Área guardada. Quedan ${remaining} área(s) pendiente(s). ¿A cuál vamos después?`
      : 'Ya cubriste las áreas guardadas. ¿Inspeccionamos otra área o terminamos?'

  return reply(
    { ...state, step: 'select_next' },
    msg,
    emptyUi({
      chips: nextAreaChips(state),
      placeholder: 'Elige área, escribe una nueva, o termina…',
    }),
  )
}

function askGeneralComment(state: InspectionFlowState): InspectionTurnResult {
  return reply(
    { ...state, step: 'await_general_comment' },
    '¿Quieres agregar un comentario general de la inspección? (opcional)',
    emptyUi({
      allowSkipComment: true,
      chips: [{ id: '__no_comment__', label: 'Sin comentario general' }],
      placeholder: 'Comentario general…',
    }),
  )
}

async function commitCurrentHallazgo(
  state: InspectionFlowState,
  comentario: string,
): Promise<InspectionFlowState> {
  if (!state.currentArea || !state.draftClasificacion) return state
  if (!state.inspeccionId) {
    throw new Error('La inspección no está iniciada en base de datos')
  }
  if (!state.draftPhotos.length) {
    throw new Error('Falta al menos una foto del área antes de guardar')
  }

  const hallazgo: InspeccionHallazgoDraft = {
    localId: crypto.randomUUID(),
    areaId: state.currentArea.id,
    areaNombre: state.currentArea.nombre,
    clasificacion: state.draftClasificacion,
    comentario: comentario.trim(),
    fotoUrls: state.draftPhotos.map((p) => p.url),
    fotoPreviews: state.draftPhotos.map((p) => p.preview),
  }

  // Persistencia inmediata: área + foto(s) + clasificación + comentario
  await saveHallazgoInmediato({
    inspeccionId: state.inspeccionId,
    hallazgo,
    orden: state.hallazgos.length + 1,
  })

  const pendingAreaIds = state.pendingAreaIds.filter(
    (id) => id !== state.currentArea!.id,
  )

  return {
    ...state,
    hallazgos: [...state.hallazgos, hallazgo],
    pendingAreaIds,
    currentArea: null,
    draftPhotos: [],
    draftClasificacion: null,
  }
}

async function finalizeInspection(
  state: InspectionFlowState,
  comentarioGeneral: string,
  responsable: string,
): Promise<InspectionTurnResult> {
  if (!state.proyecto || !state.inspeccionId) {
    return beginInspectionFlow(responsable)
  }

  const { notaGeneral } = await completeInspeccionCampo({
    inspeccionId: state.inspeccionId,
    plantaSede: state.proyecto.plantaSede,
    unidadNegocio: state.proyecto.unidadNegocio,
    responsable,
    comentarioGeneral,
    hallazgos: state.hallazgos,
    materialDescarga: state.materialDescarga,
  })

  const done: InspectionFlowState = {
    ...createIdleInspectionState(),
    step: 'done',
    inspeccionId: state.inspeccionId,
    notaGeneral,
    hallazgos: state.hallazgos,
    comentarioGeneral,
    proyecto: state.proyecto,
    materialDescarga: state.materialDescarga,
  }

  const materialLine = state.materialDescarga
    ? `Material: ${state.materialDescarga}.`
    : null
  const resumen = [
    `Inspección de ${state.proyecto.label} guardada correctamente.`,
    materialLine,
    `Áreas registradas: ${state.hallazgos.length}.`,
    `Fotos: ${state.hallazgos.reduce((n, h) => n + h.fotoUrls.length, 0)}.`,
    '',
    `Nota general: ${notaGeneral}`,
    '',
    'Si quieres otra inspección, dime «quiero hacer una inspección».',
  ]
    .filter(Boolean)
    .join('\n')

  return reply(done, resumen, emptyUi({ placeholder: 'Escribe tu pregunta…' }))
}

export async function handleInspectionText(
  state: InspectionFlowState,
  text: string,
  opts: { responsable: string },
): Promise<InspectionTurnResult | null> {
  const trimmed = text.trim()
  if (!trimmed) return null

  if (state.step === 'idle' || state.step === 'done') {
    if (wantsStartInspection(trimmed)) {
      return beginInspectionFlow(opts.responsable)
    }
    return null
  }

  if (CANCEL_RE.test(trimmed)) {
    if (state.inspeccionId) {
      await cancelInspeccionCampo(state.inspeccionId)
    }
    return reply(
      createIdleInspectionState(),
      'Listo, cancelé la inspección. Cuando quieras retomarla, dime «quiero hacer una inspección».',
      emptyUi(),
    )
  }

  switch (state.step) {
    case 'select_project': {
      const proyecto = resolveProject(trimmed)
      if (!proyecto) {
        return reply(
          state,
          'No reconocí ese proyecto. Elige una de las opciones o escribe el nombre exacto.',
          emptyUi({
            chips: projectChips(),
            placeholder: 'Elige un proyecto…',
          }),
        )
      }

      if (isDescargaBarcosProject(proyecto)) {
        return askForMaterial({
          ...state,
          proyecto,
          materialDescarga: '',
          inspeccionId: null,
        })
      }

      return startDraftAndAskArea(state, proyecto, opts.responsable)
    }

    case 'select_material': {
      const material = parseMaterialDescarga(trimmed)
      if (!material || !state.proyecto) {
        return reply(
          state,
          'Indica si el material descargado es Clinker o Coque.',
          emptyUi({
            chips: materialChips(),
            placeholder: 'Clinker o Coque…',
          }),
        )
      }
      return startDraftAndAskArea(
        state,
        state.proyecto,
        opts.responsable,
        material,
      )
    }

    case 'select_area':
    case 'select_next': {
      if (trimmed === '__finish__' || FINISH_RE.test(trimmed)) {
        if (!state.hallazgos.length) {
          return reply(
            state,
            'Todavía no hay áreas inspeccionadas. Elige un área o cancela la inspección.',
            emptyUi({
              chips: nextAreaChips(state),
              placeholder: 'Elige un área…',
            }),
          )
        }
        return askGeneralComment(state)
      }

      if (trimmed === '__new_area__') {
        return reply(
          { ...state, step: 'select_area' },
          'Escribe el nombre de la nueva área.',
          emptyUi({ placeholder: 'Nombre del área…' }),
        )
      }

      if (
        (trimmed === '__skip_area__' || SKIP_AREA_RE.test(trimmed)) &&
        (state.step === 'select_next' || state.step === 'select_area')
      ) {
        if (state.pendingAreaIds.length) {
          const [, ...rest] = state.pendingAreaIds
          const nextState = { ...state, pendingAreaIds: rest }
          if (rest.length === 0 && state.hallazgos.length > 0) {
            return askGeneralComment(nextState)
          }
          return askNext(nextState)
        }
        if (state.hallazgos.length > 0) return askGeneralComment(state)
        return reply(
          state,
          'No hay más áreas para saltar. Escribe una nueva o termina.',
          emptyUi({
            chips: nextAreaChips(state),
            placeholder: 'Área…',
          }),
        )
      }

      let area = resolveArea(trimmed, state.areas, state.pendingAreaIds)
      if (!area && state.proyecto) {
        // Crear y persistir área nueva escrita a mano
        area = await ensureArea({
          plantaSede: state.proyecto.plantaSede,
          unidadNegocio: state.proyecto.unidadNegocio,
          nombre: trimmed,
        })
        const areas = state.areas.some((a) => a.id === area!.id)
          ? state.areas
          : [...state.areas, area]
        const pendingAreaIds = state.pendingAreaIds.includes(area.id)
          ? state.pendingAreaIds
          : [...state.pendingAreaIds, area.id]
        return askClassification({
          ...state,
          areas,
          pendingAreaIds,
          currentArea: area,
        })
      }

      if (!area) {
        return reply(
          state,
          'No encontré esa área. Elige una chip o escribe un nombre nuevo.',
          emptyUi({
            chips:
              state.step === 'select_next'
                ? nextAreaChips(state)
                : [
                    ...areaChips(state.areas, state.pendingAreaIds),
                    { id: '__new_area__', label: 'Otra área (escribir)' },
                  ],
            placeholder: 'Área…',
          }),
        )
      }

      return askClassification({ ...state, currentArea: area })
    }

    case 'select_classification': {
      const clasificacion =
        parseClasificacion(trimmed) ??
        (CLASIFICACION_LABELS[trimmed as InspeccionClasificacion]
          ? (trimmed as InspeccionClasificacion)
          : null)
      if (!clasificacion) {
        return reply(
          state,
          'Elige una opción: buena práctica, situación de riesgo u observación general.',
          emptyUi({
            chips: classificationChips(),
            placeholder: 'Clasificación…',
          }),
        )
      }
      return askForPhoto({ ...state, draftClasificacion: clasificacion })
    }

    case 'await_photo': {
      if (
        trimmed === '__photos_done__' ||
        /^(listo|listo con fotos|continuar|seguir)([.!?\s]|$)/i.test(trimmed)
      ) {
        if (!state.draftPhotos.length) {
          return reply(
            state,
            'Todavía no hay fotos. Toca «Tomar foto ahora» para abrir la cámara del celular.',
            emptyUi({
              expectPhoto: true,
              chips: [
                { id: '__take_photo__', label: 'Tomar foto ahora' },
                { id: '__photos_done__', label: 'Listo con fotos' },
              ],
              placeholder: 'Toma la foto con la cámara…',
            }),
          )
        }
        return askContinueSame(state)
      }
      return reply(
        state,
        'Toca «Tomar foto ahora» para abrir la cámara, o «Listo con fotos» cuando termines.',
        emptyUi({
          expectPhoto: true,
          chips: [
            { id: '__take_photo__', label: 'Tomar foto ahora' },
            { id: '__photos_done__', label: 'Listo con fotos' },
          ],
          placeholder: 'Toma la foto con la cámara…',
        }),
      )
    }

    case 'confirm_more_same': {
      if (trimmed === '__yes__' || YES_RE.test(trimmed)) {
        return askForPhoto(state, { more: true })
      }
      if (trimmed === '__no__' || NO_RE.test(trimmed)) {
        return askAreaComment(state)
      }
      return reply(
        state,
        `¿Vas a seguir con más ${clasificacionPhrase(state.draftClasificacion)}? Responde Sí o No.`,
        emptyUi({
          chips: [
            { id: '__yes__', label: 'Sí' },
            { id: '__no__', label: 'No' },
          ],
          placeholder: 'Sí o No…',
        }),
      )
    }

    case 'await_area_comment': {
      const comentario =
        trimmed === '__no_comment__' ||
        trimmed === 'no' ||
        NO_COMMENT_RE.test(trimmed)
          ? ''
          : trimmed
      const next = await commitCurrentHallazgo(state, comentario)
      return askNext(next)
    }

    case 'await_general_comment': {
      const comentario =
        trimmed === '__no_comment__' ||
        trimmed === 'no' ||
        NO_COMMENT_RE.test(trimmed)
          ? ''
          : trimmed
      return finalizeInspection(state, comentario, opts.responsable)
    }

    default:
      return null
  }
}

export async function handleInspectionPhotos(
  state: InspectionFlowState,
  files: File[],
): Promise<InspectionTurnResult | null> {
  if (state.step !== 'await_photo' || !files.length) return null
  if (!state.inspeccionId) {
    throw new Error('La inspección no está iniciada; no se pueden subir fotos')
  }

  const uploaded: { url: string; preview: string }[] = []
  const errors: string[] = []

  for (const file of files) {
    try {
      const url = await uploadInspeccionFoto(file, {
        plantaSede: state.proyecto?.plantaSede,
        inspeccionId: state.inspeccionId,
      })
      const preview = URL.createObjectURL(file)
      uploaded.push({ url, preview })
    } catch (err) {
      errors.push(
        err instanceof Error ? err.message : `Error al subir ${file.name}`,
      )
    }
  }

  if (!uploaded.length) {
    throw new Error(
      errors[0] ?? 'No se pudo subir ninguna foto. Intenta de nuevo.',
    )
  }

  const next: InspectionFlowState = {
    ...state,
    draftPhotos: [...state.draftPhotos, ...uploaded],
  }

  const count = next.draftPhotos.length
  const warn = errors.length
    ? `\n(Algunas fotos fallaron: ${errors.length})`
    : ''

  return reply(
    next,
    (count === 1
      ? 'Foto en vivo guardada. ¿Tomas otra o seguimos?'
      : `${count} fotos guardadas. ¿Tomas otra o seguimos?`) +
      warn,
    emptyUi({
      expectPhoto: true,
      chips: [
        { id: '__take_photo__', label: 'Tomar otra foto' },
        { id: '__photos_done__', label: 'Listo con fotos' },
        { id: '__gallery_photo__', label: 'Desde galería' },
      ],
      placeholder: 'Toma otra foto o «Listo con fotos»…',
    }),
  )
}
