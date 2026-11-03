export const FASES_TORNEO = [
  { value: 'FASE REGULAR', label: 'Fase Regular' },
  { value: 'PLAYOFFS', label: 'Playoffs' },
  { value: 'PLAY-IN', label: 'Play-In' },
  { value: 'OCTAVOS DE FINAL', label: 'Octavos de Final' },
  { value: 'CUARTOS DE FINAL', label: 'Cuartos de Final' },
  { value: 'SEMIFINAL', label: 'Semifinal' },
  { value: 'FINAL', label: 'Final' },
]

export function formatFase(fase) {
  if (!fase) return 'Fase Regular'
  const f = fase.trim().toUpperCase()
  if (f === 'FASE REGULAR') return 'Fase Regular'
  if (f === 'PLAYOFFS' || f === 'PLAYOFF') return 'Playoffs'
  if (f === 'PLAY-IN' || f === 'PLAYIN') return 'Play-In'
  if (f === 'OCTAVOS' || f === 'OCTAVOS DE FINAL') return 'Octavos de Final'
  if (f === 'CUARTOS' || f === 'CUARTOS DE FINAL') return 'Cuartos de Final'
  if (f === 'SEMIFINAL' || f === 'SEMIFINALES') return 'Semifinal'
  if (f === 'FINAL' || f === 'GRAN FINAL') return 'Final'
  return fase
}
