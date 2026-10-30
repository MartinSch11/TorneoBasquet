export function formatFecha(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

export function formatHorario(hora) {
  if (!hora) return ''
  return hora.slice(0, 5)
}