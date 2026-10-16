import { useMemo, useState } from 'react'
import { IconSort, IconChevronUp, IconChevronDown, IconRefresh, IconSwipe } from './Icon'

export default function TablaOrdenable({ columns, data, ordenInicial = [], rowKey = 'id', renderFila, destacar, itemLabel = 'filas' }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  const ordenado = useMemo(() => {
    if (!sort.key) return data
    const lastIndex = ordenInicial.indexOf(sort.key)
    const idx = lastIndex === -1 ? 999 : lastIndex
    const copia = [...data]
    copia.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (av === bv) return 0
      const cmp = av === null || av === undefined ? -1
        : bv === null || bv === undefined ? 1
        : typeof av === 'number' ? av - bv
        : String(av).localeCompare(String(bv), 'es')
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copia
  }, [data, sort, ordenInicial])

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )
  }

  const modificado = sort.key !== null

  return (
    <div className="w-full">
      {/* Barra superior de controles en tabla */}
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        {modificado ? (
          <button
            type="button"
            onClick={() => setSort({ key: null, dir: 'asc' })}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 font-medium text-accent hover:bg-accent hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shrink-0"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span>Restaurar orden por defecto</span>
          </button>
        ) : (
          <span className="text-slate-600 dark:text-slate-400 font-medium sm:hidden flex items-center gap-1 text-[11px] truncate">
            <IconSwipe className="w-3.5 h-3.5" />
            <span>Deslizá para ver más</span>
          </span>
        )}
        <span className="ml-auto tabular-nums font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap shrink-0">{ordenado.length} {itemLabel}</span>
      </div>

      {/* Contenedor con scroll horizontal para celulares */}
      <div data-ui="table-scroll" className="relative overflow-x-auto rounded-xl border border-border bg-surface no-scrollbar">
        <table data-ui="data-table" className={`w-full ${columns.length > 5 ? 'min-w-[580px]' : 'min-w-full'} border-collapse text-sm text-left text-text`}>
          <thead data-ui="table-head">
            <tr data-ui="table-head-row" className="border-b border-border bg-page text-xs uppercase font-bold text-text-muted">
              {columns.map((col, colIdx) => {
                const isStickyFirst = colIdx === 0
                const isStickySecond = colIdx === 1
                const alignClass = col.align ? (col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left') : (colIdx === 1 ? 'text-left' : 'text-center')
                const paddingClass = isStickyFirst ? 'px-1 py-3' : 'px-3 py-3'

                const stickyClass = isStickyFirst
                  ? `sticky left-0 z-20 bg-page w-10 min-w-[38px] max-w-[38px] ${paddingClass} ${alignClass}`
                  : isStickySecond
                  ? `sticky left-[38px] z-20 bg-page border-r border-border max-w-[135px] sm:max-w-none truncate ${paddingClass} ${alignClass}` /* data-ui */
                  : `${paddingClass} ${alignClass}`

                const isSorted = sort.key === col.key

                return (
                  <th
                    key={col.key}
                    className={`font-semibold ${stickyClass}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`flex items-center gap-1 font-bold min-w-0 min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 rounded ${alignClass === 'text-center' ? 'justify-center w-full' : ''} ${
                          col.key === destacar || isSorted
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-text-muted hover:text-text'
                        }`}
                        aria-label={`Ordenar por ${col.label}`}
                      >
                        <span className="truncate">{col.label}</span>
                        {isStickyFirst ? (
                          isSorted && (
                            <span aria-hidden className="shrink-0">
                              {sort.dir === 'asc' ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />}
                            </span>
                          )
                        ) : (
                          <span aria-hidden className="shrink-0 opacity-70">
                            {isSorted ? (
                              sort.dir === 'asc' ? <IconChevronUp className="w-3 h-3 text-orange-600 dark:text-orange-400" /> : <IconChevronDown className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                            ) : (
                              <IconSort className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className={`block text-text-muted truncate ${alignClass}`}>{col.label}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody data-ui="table-body" className="divide-y divide-border/60">
            {ordenado.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-text-muted">
                  Sin datos registrados
                </td>
              </tr>
            ) : (
              ordenado.map((fila, rIdx) => {
                // Alternancia de filas usando semantic tokens
                const rowBgClass = rIdx % 2 === 0 ? 'bg-surface' : 'bg-page'
                return (
                  <tr
                    key={fila[rowKey]}
                    className={`${rowBgClass} hover:bg-orange-500/10 transition-colors`}
                    data-ui="table-row"
                  >
                    {columns.map((col, colIdx) => {
                      const isStickyFirst = colIdx === 0
                      const isStickySecond = colIdx === 1
                      const alignClass = col.align ? (col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left') : (colIdx === 1 ? 'text-left' : 'text-center')
                      const paddingClass = isStickyFirst ? 'px-1 py-3' : 'px-3 py-3'

                      const stickyClass = isStickyFirst
                        ? `sticky left-0 z-10 ${rowBgClass} w-10 min-w-[38px] max-w-[38px] ${paddingClass} ${alignClass}`
                        : isStickySecond
                        ? `sticky left-[38px] z-10 ${rowBgClass} border-r border-border max-w-[135px] sm:max-w-none truncate ${paddingClass} ${alignClass}` /* data-ui */
                        : `${paddingClass} ${alignClass}`

                      return (
                        <td key={col.key} className={stickyClass}>
                          {col.render ? col.render(fila) : fila[col.key]}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}