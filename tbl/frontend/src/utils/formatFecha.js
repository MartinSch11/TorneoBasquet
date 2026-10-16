export function formatFecha(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

export function formatHorario(hora) {
  if (!hora) return ''
  return hora.slice(0, 5)
}

export function calcularValoracion(st) {
  const tirosFallados =
    (st.libres_int - st.libres_conv) +
    (st.dobles_int - st.dobles_conv) +
    (st.triples_int - st.triples_conv)
  const puntos =
    st.libres_conv * 1 + st.dobles_conv * 2 + st.triples_conv * 3
  const rebotes = st.reb_ofensivos + st.reb_defensivos
  return (
    puntos +
    rebotes +
    st.asistencias +
    st.recuperos +
    st.bloqueos +
    st.faltas_recibidas -
    tirosFallados -
    st.perdidas -
    st.faltas_personales
  )
}