import {
  BIODIVERSITY_ROWS,
  BIODIVERSITY_YEARS,
  MONITORING_MONTHS,
  createEmptyMonitoringState,
  parseNum,
  type BiodiversityYear,
  type CellValue,
  type MonitoringMonth,
  type MonitoringState,
  type MonthlyStore,
} from '../data/carbonMonitoring'
import { supabase } from './supabase'

export const DEFAULT_PLANT_NAME = 'Alicon'
export const DEFAULT_YEAR = 2026

const MONTH_INDEX: Record<MonitoringMonth, number> = {
  Enero: 1,
  Febrero: 2,
  Marzo: 3,
  Abril: 4,
  Mayo: 5,
  Junio: 6,
  Julio: 7,
  Agosto: 8,
  Septiembre: 9,
  Octubre: 10,
  Noviembre: 11,
  Diciembre: 12,
}

const INDEX_MONTH = Object.fromEntries(
  Object.entries(MONTH_INDEX).map(([k, v]) => [v, k]),
) as Record<number, MonitoringMonth>

export type CarbonCampaignRef = {
  campaignId: string
  plantId: string
  plantName: string
  year: number
}

function numOrNull(value: CellValue): number | null {
  return parseNum(value)
}

function textOrNull(value: CellValue): string | null {
  const t = String(value ?? '').trim()
  return t === '' ? null : t
}

function cellFromDb(value: number | string | null | undefined): CellValue {
  if (value == null) return ''
  return String(value)
}

function applyMonthlyRows<T extends Record<string, CellValue>>(
  store: MonthlyStore<T>,
  rows: Array<{ month: number } & Record<string, unknown>>,
  mapRow: (row: Record<string, unknown>) => Partial<T>,
) {
  for (const row of rows) {
    const monthName = INDEX_MONTH[row.month]
    if (!monthName) continue
    Object.assign(store[monthName], mapRow(row))
  }
}

export async function loadCarbonCampaign(
  plantName = DEFAULT_PLANT_NAME,
  year = DEFAULT_YEAR,
): Promise<{ ref: CarbonCampaignRef; state: MonitoringState }> {
  const { data: plant, error: plantError } = await supabase
    .from('carbon_plants')
    .select('id, name')
    .eq('name', plantName)
    .maybeSingle()

  if (plantError) throw plantError
  if (!plant) throw new Error(`No se encontró la planta ${plantName}`)

  const { data: campaign, error: campaignError } = await supabase
    .from('carbon_campaigns')
    .select('id, year, version, info_date, responsible')
    .eq('plant_id', plant.id)
    .eq('year', year)
    .maybeSingle()

  if (campaignError) throw campaignError
  if (!campaign) throw new Error(`No hay campaña ${year} para ${plantName}`)

  const campaignId = campaign.id as string

  const [
    production,
    fuel,
    electricity,
    supplies,
    water,
    waterConfig,
    waste,
    biodiversity,
  ] = await Promise.all([
    supabase.from('carbon_production_monthly').select('*').eq('campaign_id', campaignId),
    supabase.from('carbon_fuel_monthly').select('*').eq('campaign_id', campaignId),
    supabase
      .from('carbon_electricity_monthly')
      .select('*')
      .eq('campaign_id', campaignId),
    supabase.from('carbon_supplies_monthly').select('*').eq('campaign_id', campaignId),
    supabase.from('carbon_water_monthly').select('*').eq('campaign_id', campaignId),
    supabase
      .from('carbon_water_config')
      .select('*')
      .eq('campaign_id', campaignId)
      .maybeSingle(),
    supabase.from('carbon_waste_monthly').select('*').eq('campaign_id', campaignId),
    supabase.from('carbon_biodiversity').select('*').eq('campaign_id', campaignId),
  ])

  for (const res of [
    production,
    fuel,
    electricity,
    supplies,
    water,
    waste,
    biodiversity,
  ]) {
    if (res.error) throw res.error
  }
  if (waterConfig.error) throw waterConfig.error

  const state = createEmptyMonitoringState({
    year: String(campaign.year),
    version: campaign.version ?? 'v.1',
    plant: plant.name as string,
    infoDate: (campaign.info_date as string | null) ?? '',
    responsible: (campaign.responsible as string | null) ?? '',
  })

  state.waterConfig = {
    disposicionResidual: (waterConfig.data?.disposicion_residual as string) ?? '',
    puntosDescarga: (waterConfig.data?.puntos_descarga as string) ?? '',
    metodosTratamiento: (waterConfig.data?.metodos_tratamiento as string) ?? '',
  }

  applyMonthlyRows(state.production, production.data ?? [], (row) => ({
    clinkerIngreso: cellFromDb(row.clinker_ingreso as number | null),
    clinkerConsumo: cellFromDb(row.clinker_consumo as number | null),
    puzolana: cellFromDb(row.puzolana as number | null),
    caliza: cellFromDb(row.caliza as number | null),
    yeso: cellFromDb(row.yeso as number | null),
    aditivo: cellFromDb(row.aditivo as number | null),
    toba: cellFromDb(row.toba as number | null),
    prodUGC: cellFromDb(row.prod_ugc as number | null),
    clinkerUGC: cellFromDb(row.clinker_ugc as number | null),
    prodCFB: cellFromDb(row.prod_cfb as number | null),
    clinkerCFB: cellFromDb(row.clinker_cfb as number | null),
    prodOtro: cellFromDb(row.prod_otro as string | null),
    clinkerOtro: cellFromDb(row.clinker_otro as string | null),
  }))

  applyMonthlyRows(state.fuel, fuel.data ?? [], (row) => ({
    glpControl: cellFromDb(row.glp_control as number | null),
    dieselGeneracion: cellFromDb(row.diesel_generacion as number | null),
    dieselMovil: cellFromDb(row.diesel_movil as number | null),
    glpMontacargas: cellFromDb(row.glp_montacargas as number | null),
    glpOtro: cellFromDb(row.glp_otro as number | null),
    otros: cellFromDb(row.otros as number | null),
  }))

  applyMonthlyRows(state.electricity, electricity.data ?? [], (row) => ({
    produccionCemento: cellFromDb(row.produccion_cemento as number | null),
    servicios: cellFromDb(row.servicios as number | null),
    perdidas: cellFromDb(row.perdidas as number | null),
    redElectrica: cellFromDb(row.red_electrica as number | null),
  }))

  applyMonthlyRows(state.supplies, supplies.data ?? [], (row) => ({
    r134a: cellFromDb(row.r134a as number | null),
    r141b: cellFromDb(row.r141b as number | null),
    r410: cellFromDb(row.r410 as number | null),
    sacosMillares: cellFromDb(row.sacos_millares as number | null),
    sacosRotosFabrica: cellFromDb(row.sacos_rotos_fabrica as number | null),
    sacosRotosEnvasado: cellFromDb(row.sacos_rotos_envasado as number | null),
    grasa: cellFromDb(row.grasa as number | null),
    aceite: cellFromDb(row.aceite as number | null),
  }))

  applyMonthlyRows(state.water, water.data ?? [], (row) => ({
    pipas: cellFromDb(row.pipas as number | null),
    externoEntuvado: cellFromDb(row.externo_entuvado as number | null),
    superficial: cellFromDb(row.superficial as number | null),
    subsuperficial: cellFromDb(row.subsuperficial as number | null),
    lluvia: cellFromDb(row.lluvia as number | null),
    recirculacion: cellFromDb(row.recirculacion as number | null),
    otrosUsos: cellFromDb(row.otros_usos as number | null),
    produccion: cellFromDb(row.produccion as number | null),
    aguaHumana: cellFromDb(row.agua_humana as number | null),
  }))

  applyMonthlyRows(state.waste, waste.data ?? [], (row) => ({
    ordinarios: cellFromDb(row.ordinarios as number | null),
    peligrosos: cellFromDb(row.peligrosos as number | null),
    vertedero: cellFromDb(row.vertedero as number | null),
    coprocesamiento: cellFromDb(row.coprocesamiento as number | null),
    reutilizados: cellFromDb(row.reutilizados as number | null),
    reciclados: cellFromDb(row.reciclados as number | null),
    otraDisposicion: cellFromDb(row.otra_disposicion as number | null),
    derramesCantidad: cellFromDb(row.derrames_cantidad as number | null),
    derramesVolumen: cellFromDb(row.derrames_volumen as number | null),
  }))

  for (const row of biodiversity.data ?? []) {
    const key = row.indicator_key as string
    const y = String(row.year) as BiodiversityYear
    if (!state.biodiversity[key]) {
      state.biodiversity[key] = Object.fromEntries(
        BIODIVERSITY_YEARS.map((yr) => [yr, '']),
      ) as Record<BiodiversityYear, CellValue>
    }
    if ((BIODIVERSITY_YEARS as readonly string[]).includes(y)) {
      state.biodiversity[key][y] = cellFromDb(row.value as string | null)
    }
  }

  for (const r of BIODIVERSITY_ROWS) {
    if (!state.biodiversity[r.key]) {
      state.biodiversity[r.key] = Object.fromEntries(
        BIODIVERSITY_YEARS.map((yr) => [yr, '']),
      ) as Record<BiodiversityYear, CellValue>
    }
  }

  return {
    ref: {
      campaignId,
      plantId: plant.id as string,
      plantName: plant.name as string,
      year: campaign.year as number,
    },
    state,
  }
}

export async function saveCarbonCampaign(
  ref: CarbonCampaignRef,
  state: MonitoringState,
): Promise<void> {
  const campaignId = ref.campaignId

  const { error: campaignError } = await supabase
    .from('carbon_campaigns')
    .update({
      version: textOrNull(state.meta.version),
      info_date: textOrNull(state.meta.infoDate) || null,
      responsible: textOrNull(state.meta.responsible),
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  if (campaignError) throw campaignError

  if (state.meta.plant && state.meta.plant !== ref.plantName) {
    const { error: plantError } = await supabase
      .from('carbon_plants')
      .update({ name: state.meta.plant })
      .eq('id', ref.plantId)
    if (plantError) throw plantError
  }

  const productionRows = MONITORING_MONTHS.map((m) => {
    const row = state.production[m]
    return {
      campaign_id: campaignId,
      month: MONTH_INDEX[m],
      clinker_ingreso: numOrNull(row.clinkerIngreso),
      clinker_consumo: numOrNull(row.clinkerConsumo),
      puzolana: numOrNull(row.puzolana),
      caliza: numOrNull(row.caliza),
      yeso: numOrNull(row.yeso),
      aditivo: numOrNull(row.aditivo),
      toba: numOrNull(row.toba),
      prod_ugc: numOrNull(row.prodUGC),
      clinker_ugc: numOrNull(row.clinkerUGC),
      prod_cfb: numOrNull(row.prodCFB),
      clinker_cfb: numOrNull(row.clinkerCFB),
      prod_otro: textOrNull(row.prodOtro),
      clinker_otro: textOrNull(row.clinkerOtro),
    }
  })

  const fuelRows = MONITORING_MONTHS.map((m) => {
    const row = state.fuel[m]
    return {
      campaign_id: campaignId,
      month: MONTH_INDEX[m],
      glp_control: numOrNull(row.glpControl),
      diesel_generacion: numOrNull(row.dieselGeneracion),
      diesel_movil: numOrNull(row.dieselMovil),
      glp_montacargas: numOrNull(row.glpMontacargas),
      glp_otro: numOrNull(row.glpOtro),
      otros: numOrNull(row.otros),
    }
  })

  const electricityRows = MONITORING_MONTHS.map((m) => {
    const row = state.electricity[m]
    return {
      campaign_id: campaignId,
      month: MONTH_INDEX[m],
      produccion_cemento: numOrNull(row.produccionCemento),
      servicios: numOrNull(row.servicios),
      perdidas: numOrNull(row.perdidas),
      red_electrica: numOrNull(row.redElectrica),
    }
  })

  const suppliesRows = MONITORING_MONTHS.map((m) => {
    const row = state.supplies[m]
    return {
      campaign_id: campaignId,
      month: MONTH_INDEX[m],
      r134a: numOrNull(row.r134a),
      r141b: numOrNull(row.r141b),
      r410: numOrNull(row.r410),
      sacos_millares: numOrNull(row.sacosMillares),
      sacos_rotos_fabrica: numOrNull(row.sacosRotosFabrica),
      sacos_rotos_envasado: numOrNull(row.sacosRotosEnvasado),
      grasa: numOrNull(row.grasa),
      aceite: numOrNull(row.aceite),
    }
  })

  const waterRows = MONITORING_MONTHS.map((m) => {
    const row = state.water[m]
    return {
      campaign_id: campaignId,
      month: MONTH_INDEX[m],
      pipas: numOrNull(row.pipas),
      externo_entuvado: numOrNull(row.externoEntuvado),
      superficial: numOrNull(row.superficial),
      subsuperficial: numOrNull(row.subsuperficial),
      lluvia: numOrNull(row.lluvia),
      recirculacion: numOrNull(row.recirculacion),
      otros_usos: numOrNull(row.otrosUsos),
      produccion: numOrNull(row.produccion),
      agua_humana: numOrNull(row.aguaHumana),
    }
  })

  const wasteRows = MONITORING_MONTHS.map((m) => {
    const row = state.waste[m]
    return {
      campaign_id: campaignId,
      month: MONTH_INDEX[m],
      ordinarios: numOrNull(row.ordinarios),
      peligrosos: numOrNull(row.peligrosos),
      vertedero: numOrNull(row.vertedero),
      coprocesamiento: numOrNull(row.coprocesamiento),
      reutilizados: numOrNull(row.reutilizados),
      reciclados: numOrNull(row.reciclados),
      otra_disposicion: numOrNull(row.otraDisposicion),
      derrames_cantidad: numOrNull(row.derramesCantidad),
      derrames_volumen: numOrNull(row.derramesVolumen),
    }
  })

  const biodiversityRows = BIODIVERSITY_ROWS.flatMap((ind) =>
    BIODIVERSITY_YEARS.map((y) => ({
      campaign_id: campaignId,
      indicator_key: ind.key,
      year: Number(y),
      value: textOrNull(state.biodiversity[ind.key]?.[y] ?? ''),
    })),
  ).filter((r) => r.value != null)

  const upsertOpts = { onConflict: 'campaign_id,month' }

  const results = await Promise.all([
    supabase
      .from('carbon_production_monthly')
      .upsert(productionRows, upsertOpts),
    supabase.from('carbon_fuel_monthly').upsert(fuelRows, upsertOpts),
    supabase
      .from('carbon_electricity_monthly')
      .upsert(electricityRows, upsertOpts),
    supabase.from('carbon_supplies_monthly').upsert(suppliesRows, upsertOpts),
    supabase.from('carbon_water_monthly').upsert(waterRows, upsertOpts),
    supabase.from('carbon_waste_monthly').upsert(wasteRows, upsertOpts),
    supabase.from('carbon_water_config').upsert(
      {
        campaign_id: campaignId,
        disposicion_residual: textOrNull(state.waterConfig.disposicionResidual),
        puntos_descarga: textOrNull(state.waterConfig.puntosDescarga),
        metodos_tratamiento: textOrNull(state.waterConfig.metodosTratamiento),
      },
      { onConflict: 'campaign_id' },
    ),
  ])

  for (const res of results) {
    if (res.error) throw res.error
  }

  const { error: delBioError } = await supabase
    .from('carbon_biodiversity')
    .delete()
    .eq('campaign_id', campaignId)
  if (delBioError) throw delBioError

  if (biodiversityRows.length > 0) {
    const { error: bioError } = await supabase
      .from('carbon_biodiversity')
      .insert(biodiversityRows)
    if (bioError) throw bioError
  }
}
