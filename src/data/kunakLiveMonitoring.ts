/**
 * Monitoreo en vivo · estaciones Kunak (indoor) en plantas Cementos Progreso.
 * Datos simulados con deriva realista para aparentar telemetría en tiempo real.
 */

export type KunakStationId =
  | 'KNK-SM-IND-01'
  | 'KNK-SM-IND-02'
  | 'KNK-SG-IND-01'
  | 'KNK-AL-IND-01'
  | 'KNK-AL-IND-02'

export type StationStatus = 'online' | 'warning' | 'offline'

export type LiveReading = {
  /** °C */
  temperature: number
  /** % HR */
  humidity: number
  /** hPa */
  pressure: number
  /** µg/m³ */
  pm1: number
  /** µg/m³ */
  pm25: number
  /** µg/m³ */
  pm10: number
  /** dBA */
  noise: number
  /** ppm */
  co2: number
  /** µg/m³ */
  no2: number
}

export type KunakStation = {
  id: KunakStationId
  label: string
  plant: string
  plantId: string
  zone: string
  model: string
  status: StationStatus
  lat: number
  lng: number
  lastSeenAt: Date
  reading: LiveReading
}

export type TimelinePoint = {
  t: string
  ts: number
  temperature: number
  humidity: number
  pm25: number
  pm10: number
  noise: number
  co2: number
}

export type LiveAlert = {
  id: string
  level: 'Crítico' | 'Atención' | 'Positivo'
  stationId: KunakStationId
  plant: string
  title: string
  text: string
  at: Date
}

export type LiveMonitoringSnapshot = {
  generatedAt: Date
  stations: KunakStation[]
  timeline: TimelinePoint[]
  alerts: LiveAlert[]
  kpis: {
    online: number
    total: number
    avgPm25: number
    avgNoise: number
    avgTemp: number
    avgHumidity: number
    maxPm10: number
    exceedances: number
  }
  byPlant: {
    plant: string
    plantId: string
    pm25: number
    pm10: number
    noise: number
    temperature: number
    humidity: number
    stationsOnline: number
    stationsTotal: number
  }[]
}

/** Umbrales indoor (referencia operativa Kunak / OMS adaptada). */
export const THRESHOLDS = {
  pm25: { warn: 25, crit: 50 },
  pm10: { warn: 50, crit: 100 },
  noise: { warn: 70, crit: 85 },
  temperature: { warnLow: 16, warnHigh: 30, critLow: 12, critHigh: 35 },
  humidity: { warnLow: 30, warnHigh: 70 },
  co2: { warn: 1000, crit: 1500 },
} as const

type StationSeed = {
  id: KunakStationId
  label: string
  plant: string
  plantId: string
  zone: string
  lat: number
  lng: number
  base: LiveReading
  /** Probabilidad de quedar offline en un tick */
  offlineChance: number
}

const STATION_SEEDS: StationSeed[] = [
  {
    id: 'KNK-SM-IND-01',
    label: 'Sala de control',
    plant: 'Planta San Miguel',
    plantId: 'gt-san-miguel',
    zone: 'Indoor · Control',
    lat: 14.8139,
    lng: -90.2791,
    base: {
      temperature: 24.2,
      humidity: 52,
      pressure: 1012,
      pm1: 8,
      pm25: 14,
      pm10: 22,
      noise: 58,
      co2: 620,
      no2: 12,
    },
    offlineChance: 0.01,
  },
  {
    id: 'KNK-SM-IND-02',
    label: 'Taller mantenimiento',
    plant: 'Planta San Miguel',
    plantId: 'gt-san-miguel',
    zone: 'Indoor · Taller',
    lat: 14.8132,
    lng: -90.2784,
    base: {
      temperature: 26.8,
      humidity: 48,
      pressure: 1011,
      pm1: 12,
      pm25: 21,
      pm10: 38,
      noise: 72,
      co2: 780,
      no2: 18,
    },
    offlineChance: 0.02,
  },
  {
    id: 'KNK-SG-IND-01',
    label: 'Oficinas planta',
    plant: 'Planta San Gabriel',
    plantId: 'gt-san-gabriel',
    zone: 'Indoor · Oficinas',
    lat: 14.7356,
    lng: -90.7035,
    base: {
      temperature: 23.5,
      humidity: 55,
      pressure: 1008,
      pm1: 6,
      pm25: 11,
      pm10: 18,
      noise: 48,
      co2: 540,
      no2: 9,
    },
    offlineChance: 0.01,
  },
  {
    id: 'KNK-AL-IND-01',
    label: 'Área de dosificación',
    plant: 'Planta Alicón',
    plantId: 'gt-alicon',
    zone: 'Indoor · Proceso',
    lat: 14.62,
    lng: -90.52,
    base: {
      temperature: 27.4,
      humidity: 46,
      pressure: 1010,
      pm1: 15,
      pm25: 28,
      pm10: 48,
      noise: 76,
      co2: 890,
      no2: 22,
    },
    offlineChance: 0.015,
  },
  {
    id: 'KNK-AL-IND-02',
    label: 'Laboratorio calidad',
    plant: 'Planta Alicón',
    plantId: 'gt-alicon',
    zone: 'Indoor · Lab',
    lat: 14.6204,
    lng: -90.5195,
    base: {
      temperature: 22.8,
      humidity: 50,
      pressure: 1010,
      pm1: 5,
      pm25: 9,
      pm10: 14,
      noise: 42,
      co2: 510,
      no2: 7,
    },
    offlineChance: 0.01,
  },
]

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function jitter(base: number, amp: number) {
  return base + (Math.random() * 2 - 1) * amp
}

function formatClock(d: Date) {
  return d.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function readingStatus(r: LiveReading): StationStatus {
  if (
    r.pm25 >= THRESHOLDS.pm25.crit ||
    r.pm10 >= THRESHOLDS.pm10.crit ||
    r.noise >= THRESHOLDS.noise.crit ||
    r.co2 >= THRESHOLDS.co2.crit
  ) {
    return 'warning'
  }
  if (
    r.pm25 >= THRESHOLDS.pm25.warn ||
    r.pm10 >= THRESHOLDS.pm10.warn ||
    r.noise >= THRESHOLDS.noise.warn ||
    r.co2 >= THRESHOLDS.co2.warn
  ) {
    return 'warning'
  }
  return 'online'
}

function nextReading(base: LiveReading, prev: LiveReading): LiveReading {
  return {
    temperature: clamp(jitter(prev.temperature * 0.7 + base.temperature * 0.3, 0.35), 18, 34),
    humidity: clamp(jitter(prev.humidity * 0.75 + base.humidity * 0.25, 1.2), 25, 80),
    pressure: clamp(jitter(prev.pressure * 0.8 + base.pressure * 0.2, 0.4), 995, 1025),
    pm1: clamp(jitter(prev.pm1 * 0.65 + base.pm1 * 0.35, 1.5), 1, 60),
    pm25: clamp(jitter(prev.pm25 * 0.65 + base.pm25 * 0.35, 2.2), 2, 90),
    pm10: clamp(jitter(prev.pm10 * 0.65 + base.pm10 * 0.35, 3.5), 4, 140),
    noise: clamp(jitter(prev.noise * 0.7 + base.noise * 0.3, 2.5), 30, 95),
    co2: clamp(jitter(prev.co2 * 0.75 + base.co2 * 0.25, 25), 400, 2000),
    no2: clamp(jitter(prev.no2 * 0.7 + base.no2 * 0.3, 1.2), 2, 80),
  }
}

function buildTimeline(
  stations: KunakStation[],
  now: Date,
  points = 48,
): TimelinePoint[] {
  const online = stations.filter((s) => s.status !== 'offline')
  const avg = (pick: (r: LiveReading) => number) => {
    if (online.length === 0) return 0
    return online.reduce((a, s) => a + pick(s.reading), 0) / online.length
  }

  const current: LiveReading = {
    temperature: avg((r) => r.temperature),
    humidity: avg((r) => r.humidity),
    pressure: avg((r) => r.pressure),
    pm1: avg((r) => r.pm1),
    pm25: avg((r) => r.pm25),
    pm10: avg((r) => r.pm10),
    noise: avg((r) => r.noise),
    co2: avg((r) => r.co2),
    no2: avg((r) => r.no2),
  }

  const out: TimelinePoint[] = []
  let cursor = { ...current }

  for (let i = points - 1; i >= 0; i--) {
    const ts = new Date(now.getTime() - i * 5 * 60_000)
    if (i < points - 1) {
      cursor = {
        temperature: clamp(jitter(cursor.temperature, 0.25), 18, 34),
        humidity: clamp(jitter(cursor.humidity, 0.9), 25, 80),
        pressure: cursor.pressure,
        pm1: clamp(jitter(cursor.pm1, 1.1), 1, 60),
        pm25: clamp(jitter(cursor.pm25, 1.8), 2, 90),
        pm10: clamp(jitter(cursor.pm10, 2.4), 4, 140),
        noise: clamp(jitter(cursor.noise, 1.8), 30, 95),
        co2: clamp(jitter(cursor.co2, 18), 400, 2000),
        no2: cursor.no2,
      }
    } else {
      cursor = current
    }
    out.push({
      t: ts.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
      ts: ts.getTime(),
      temperature: Number(cursor.temperature.toFixed(1)),
      humidity: Number(cursor.humidity.toFixed(0)),
      pm25: Number(cursor.pm25.toFixed(1)),
      pm10: Number(cursor.pm10.toFixed(1)),
      noise: Number(cursor.noise.toFixed(0)),
      co2: Number(cursor.co2.toFixed(0)),
    })
  }
  return out
}

function buildAlerts(stations: KunakStation[], now: Date): LiveAlert[] {
  const alerts: LiveAlert[] = []
  for (const s of stations) {
    if (s.status === 'offline') {
      alerts.push({
        id: `${s.id}-offline`,
        level: 'Atención',
        stationId: s.id,
        plant: s.plant,
        title: 'Estación sin telemetría',
        text: `${s.label} (${s.id}) no reporta desde ${formatClock(s.lastSeenAt)}.`,
        at: now,
      })
      continue
    }
    const r = s.reading
    if (r.pm25 >= THRESHOLDS.pm25.crit) {
      alerts.push({
        id: `${s.id}-pm25`,
        level: 'Crítico',
        stationId: s.id,
        plant: s.plant,
        title: 'PM₂.₅ sobre umbral crítico',
        text: `${s.label}: ${r.pm25.toFixed(1)} µg/m³ (límite ${THRESHOLDS.pm25.crit}).`,
        at: now,
      })
    } else if (r.pm25 >= THRESHOLDS.pm25.warn) {
      alerts.push({
        id: `${s.id}-pm25w`,
        level: 'Atención',
        stationId: s.id,
        plant: s.plant,
        title: 'PM₂.₅ elevado',
        text: `${s.label}: ${r.pm25.toFixed(1)} µg/m³ (aviso ${THRESHOLDS.pm25.warn}).`,
        at: now,
      })
    }
    if (r.noise >= THRESHOLDS.noise.crit) {
      alerts.push({
        id: `${s.id}-noise`,
        level: 'Crítico',
        stationId: s.id,
        plant: s.plant,
        title: 'Ruido sobre 85 dBA',
        text: `${s.label}: ${r.noise.toFixed(0)} dBA. Revisar exposición indoor.`,
        at: now,
      })
    } else if (r.noise >= THRESHOLDS.noise.warn) {
      alerts.push({
        id: `${s.id}-noisew`,
        level: 'Atención',
        stationId: s.id,
        plant: s.plant,
        title: 'Ruido elevado',
        text: `${s.label}: ${r.noise.toFixed(0)} dBA (aviso ${THRESHOLDS.noise.warn}).`,
        at: now,
      })
    }
    if (r.pm10 >= THRESHOLDS.pm10.warn) {
      alerts.push({
        id: `${s.id}-pm10`,
        level: r.pm10 >= THRESHOLDS.pm10.crit ? 'Crítico' : 'Atención',
        stationId: s.id,
        plant: s.plant,
        title: 'Material particulado PM₁₀',
        text: `${s.label}: ${r.pm10.toFixed(1)} µg/m³.`,
        at: now,
      })
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'all-ok',
      level: 'Positivo',
      stationId: stations[0]?.id ?? 'KNK-SM-IND-01',
      plant: 'Red Kunak',
      title: 'Red indoor dentro de umbrales',
      text: 'Todas las estaciones online reportan clima, ruido y particulado dentro de rangos operativos.',
      at: now,
    })
  }

  return alerts.slice(0, 6)
}

/** Estado mutable en memoria para continuidad entre refrescos. */
let prevReadings: Partial<Record<KunakStationId, LiveReading>> = {}
let timelineSeed: TimelinePoint[] | null = null

export function resetKunakLiveState() {
  prevReadings = {}
  timelineSeed = null
}

export function buildLiveMonitoringSnapshot(): LiveMonitoringSnapshot {
  const now = new Date()
  const stations: KunakStation[] = STATION_SEEDS.map((seed) => {
    const prev = prevReadings[seed.id] ?? seed.base
    const offline = Math.random() < seed.offlineChance
    const reading = offline ? prev : nextReading(seed.base, prev)
    if (!offline) prevReadings[seed.id] = reading

    const status: StationStatus = offline
      ? 'offline'
      : readingStatus(reading)

    return {
      id: seed.id,
      label: seed.label,
      plant: seed.plant,
      plantId: seed.plantId,
      zone: seed.zone,
      model: 'Kunak AIR Pro Indoor',
      status,
      lat: seed.lat,
      lng: seed.lng,
      lastSeenAt: offline
        ? new Date(now.getTime() - (2 + Math.random() * 8) * 60_000)
        : now,
      reading: {
        temperature: Number(reading.temperature.toFixed(1)),
        humidity: Number(reading.humidity.toFixed(0)),
        pressure: Number(reading.pressure.toFixed(1)),
        pm1: Number(reading.pm1.toFixed(1)),
        pm25: Number(reading.pm25.toFixed(1)),
        pm10: Number(reading.pm10.toFixed(1)),
        noise: Number(reading.noise.toFixed(0)),
        co2: Number(reading.co2.toFixed(0)),
        no2: Number(reading.no2.toFixed(1)),
      },
    }
  })

  const onlineStations = stations.filter((s) => s.status !== 'offline')
  const avg = (pick: (r: LiveReading) => number) => {
    if (onlineStations.length === 0) return 0
    return (
      onlineStations.reduce((a, s) => a + pick(s.reading), 0) /
      onlineStations.length
    )
  }

  let timeline: TimelinePoint[]
  if (!timelineSeed) {
    timelineSeed = buildTimeline(stations, now)
    timeline = timelineSeed
  } else {
    const last = timelineSeed[timelineSeed.length - 1]
    const nextPoint: TimelinePoint = {
      t: formatClock(now).slice(0, 5),
      ts: now.getTime(),
      temperature: Number(avg((r) => r.temperature).toFixed(1)),
      humidity: Number(avg((r) => r.humidity).toFixed(0)),
      pm25: Number(avg((r) => r.pm25).toFixed(1)),
      pm10: Number(avg((r) => r.pm10).toFixed(1)),
      noise: Number(avg((r) => r.noise).toFixed(0)),
      co2: Number(avg((r) => r.co2).toFixed(0)),
    }
    // Solo empujar punto nuevo cada ~5 min de simulación (cada ~tick real)
    if (!last || now.getTime() - last.ts > 4_000) {
      timelineSeed = [...timelineSeed.slice(1), nextPoint]
    } else {
      timelineSeed = [...timelineSeed.slice(0, -1), nextPoint]
    }
    timeline = timelineSeed
  }

  const plantMap = new Map<
    string,
    {
      plant: string
      plantId: string
      pm25: number[]
      pm10: number[]
      noise: number[]
      temperature: number[]
      humidity: number[]
      online: number
      total: number
    }
  >()

  for (const s of stations) {
    const cur = plantMap.get(s.plantId) ?? {
      plant: s.plant,
      plantId: s.plantId,
      pm25: [],
      pm10: [],
      noise: [],
      temperature: [],
      humidity: [],
      online: 0,
      total: 0,
    }
    cur.total += 1
    if (s.status !== 'offline') {
      cur.online += 1
      cur.pm25.push(s.reading.pm25)
      cur.pm10.push(s.reading.pm10)
      cur.noise.push(s.reading.noise)
      cur.temperature.push(s.reading.temperature)
      cur.humidity.push(s.reading.humidity)
    }
    plantMap.set(s.plantId, cur)
  }

  const mean = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const byPlant = [...plantMap.values()].map((p) => ({
    plant: p.plant,
    plantId: p.plantId,
    pm25: Number(mean(p.pm25).toFixed(1)),
    pm10: Number(mean(p.pm10).toFixed(1)),
    noise: Number(mean(p.noise).toFixed(0)),
    temperature: Number(mean(p.temperature).toFixed(1)),
    humidity: Number(mean(p.humidity).toFixed(0)),
    stationsOnline: p.online,
    stationsTotal: p.total,
  }))

  const exceedances = onlineStations.filter((s) => {
    const r = s.reading
    return (
      r.pm25 >= THRESHOLDS.pm25.warn ||
      r.pm10 >= THRESHOLDS.pm10.warn ||
      r.noise >= THRESHOLDS.noise.warn ||
      r.co2 >= THRESHOLDS.co2.warn
    )
  }).length

  return {
    generatedAt: now,
    stations,
    timeline,
    alerts: buildAlerts(stations, now),
    kpis: {
      online: onlineStations.length,
      total: stations.length,
      avgPm25: Number(avg((r) => r.pm25).toFixed(1)),
      avgNoise: Number(avg((r) => r.noise).toFixed(0)),
      avgTemp: Number(avg((r) => r.temperature).toFixed(1)),
      avgHumidity: Number(avg((r) => r.humidity).toFixed(0)),
      maxPm10: Number(
        Math.max(0, ...onlineStations.map((s) => s.reading.pm10)).toFixed(1),
      ),
      exceedances,
    },
    byPlant,
  }
}

export function formatLiveNum(n: number, digits = 0): string {
  return n.toLocaleString('es-GT', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}
