import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  BookOpen,
  FileWarning,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DIRECTORY_ADMIN_USERNAME } from '../data/users'
import {
  createBibliotecaDoc,
  deleteBibliotecaDoc,
  loadBibliotecaDocs,
  setBibliotecaDocEnabled,
  updateBibliotecaDoc,
  type BibliotecaDoc,
  type BibliotecaDocInput,
} from '../lib/bibliotecaApi'
import { isKnowledgeDocTrained } from '../lib/chat/knowledgeEnabled'

type FormState = {
  title: string
  category: string
  enabledInCopilot: boolean
  file: File | null
}

const EMPTY_FORM: FormState = {
  title: '',
  category: 'General',
  enabledInCopilot: true,
  file: null,
}

function formatSize(mb: number) {
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${Math.round(mb * 1024)} KB`
}

export function BibliotecaPage() {
  const { isDirectoryAdmin } = useAuth()
  const [docs, setDocs] = useState<BibliotecaDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BibliotecaDoc | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const list = await loadBibliotecaDocs(true)
      setDocs(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isDirectoryAdmin) return
    void reload()
  }, [isDirectoryAdmin])

  const categories = useMemo(() => {
    const set = new Set(docs.map((d) => d.category).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'es'))
  }, [docs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs
      .filter((d) => categoryFilter === 'all' || d.category === categoryFilter)
      .filter((d) => {
        if (!q) return true
        return (
          d.title.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.sourcePath.toLowerCase().includes(q) ||
          (d.fileName ?? '').toLowerCase().includes(q)
        )
      })
  }, [docs, query, categoryFilter])

  const stats = useMemo(() => {
    const trained = docs.filter((d) => isKnowledgeDocTrained(d.charCount)).length
    const inCopilot = docs.filter(
      (d) => d.enabledInCopilot && isKnowledgeDocTrained(d.charCount),
    ).length
    return { total: docs.length, trained, inCopilot }
  }, [docs])

  if (!isDirectoryAdmin) {
    return <Navigate to="/perfil" replace />
  }

  function flashOk(msg: string) {
    setOkMsg(msg)
    setTimeout(() => setOkMsg(null), 3500)
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError(null)
  }

  function openEdit(doc: BibliotecaDoc) {
    setEditing(doc)
    setForm({
      title: doc.title,
      category: doc.category,
      enabledInCopilot: doc.enabledInCopilot,
      file: null,
    })
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const input: BibliotecaDocInput = {
        title: form.title,
        category: form.category,
        enabledInCopilot: form.enabledInCopilot,
        file: form.file,
      }
      if (editing) {
        await updateBibliotecaDoc(editing, input)
        flashOk('Documento actualizado.')
      } else {
        await createBibliotecaDoc(input)
        flashOk('Documento subido y disponible en la biblioteca.')
      }
      closeForm()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(doc: BibliotecaDoc) {
    if (!isKnowledgeDocTrained(doc.charCount)) return
    setError(null)
    try {
      const updated = await setBibliotecaDocEnabled(doc, !doc.enabledInCopilot)
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? updated : d)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar')
    }
  }

  async function handleDelete(doc: BibliotecaDoc) {
    const label = doc.isCatalog
      ? `¿Ocultar “${doc.title}” del catálogo? (el PDF del repo no se borra del disco)`
      : `¿Eliminar “${doc.title}” de forma permanente?`
    if (!window.confirm(label)) return
    setError(null)
    try {
      await deleteBibliotecaDoc(doc)
      flashOk(doc.isCatalog ? 'Documento ocultado.' : 'Documento eliminado.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  return (
    <div className="biblioteca-page">
      <div className="page-header dash-header">
        <div>
          <h1>Biblioteca</h1>
          <p>
            Solo {DIRECTORY_ADMIN_USERNAME}. Sube, edita o elimina documentos del
            copiloto y controla cuáles usa el asistente.
          </p>
        </div>
        <div className="dash-header-actions">
          <Link to="/usuarios" className="btn-secondary-link">
            <Users size={16} />
            Usuarios
          </Link>
          <Link to="/accesos" className="btn-secondary-link">
            <KeyRound size={16} />
            Accesos
          </Link>
          <button type="button" className="btn-primary-link" onClick={openCreate}>
            <Plus size={16} />
            Subir documento
          </button>
        </div>
      </div>

      {error && (
        <div className="hc-banner hc-banner-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}
      {okMsg && (
        <div className="hc-banner hc-banner-ok" role="status">
          {okMsg}
        </div>
      )}

      <div className="biblioteca-stats">
        <div className="biblioteca-stat">
          <span>Documentos</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="biblioteca-stat">
          <span>Con texto extraído</span>
          <strong>{stats.trained}</strong>
        </div>
        <div className="biblioteca-stat">
          <span>Activos en copiloto</span>
          <strong>{stats.inCopilot}</strong>
        </div>
        <div className="biblioteca-stat">
          <span>Origen</span>
          <strong>Catálogo + uploads</strong>
        </div>
      </div>

      {showForm && (
        <form className="content-panel biblioteca-form" onSubmit={handleSubmit}>
          <div className="dash-panel-head">
            <h2>{editing ? 'Editar documento' : 'Subir documento'}</h2>
            <p>
              {editing
                ? 'Puedes cambiar título, categoría o reemplazar el PDF.'
                : 'Se extrae el texto del PDF para entrenar al copiloto.'}
            </p>
          </div>
          <div className="biblioteca-form-grid">
            <label>
              <span>Título</span>
              <input
                required
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Nombre del documento"
              />
            </label>
            <label>
              <span>Categoría</span>
              <input
                list="biblioteca-categories"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="General"
              />
              <datalist id="biblioteca-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
                <option value="Legislación Ambiental" />
                <option value="Instrumentos Agro" />
                <option value="Información Plataforma" />
              </datalist>
            </label>
            <label className="biblioteca-form-file">
              <span>
                PDF {editing ? '(opcional, para reemplazar)' : '(obligatorio)'}
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                required={!editing}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setForm((f) => ({
                    ...f,
                    file,
                    title:
                      f.title ||
                      (file ? file.name.replace(/\.pdf$/i, '') : f.title),
                  }))
                }}
              />
            </label>
            <label className="biblioteca-form-check">
              <input
                type="checkbox"
                checked={form.enabledInCopilot}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    enabledInCopilot: e.target.checked,
                  }))
                }
              />
              <span>Incluir en el copiloto (si hay texto útil)</span>
            </label>
          </div>
          <div className="biblioteca-form-actions">
            <button
              type="button"
              className="btn-secondary-link"
              onClick={closeForm}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary-link"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="hc-spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              {editing ? 'Guardar cambios' : 'Subir'}
            </button>
          </div>
        </form>
      )}

      <div className="biblioteca-toolbar content-panel">
        <label className="biblioteca-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Buscar por título, categoría o archivo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="biblioteca-filter">
          <span>Categoría</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="users-table-panel content-panel">
        <div className="dash-panel-head">
          <h2>
            <BookOpen size={18} />
            Documentos
          </h2>
          <p>
            {filtered.length} de {docs.length} · editar, eliminar o activar en
            copiloto
          </p>
        </div>

        {loading ? (
          <div className="hc-loading users-loading">
            <Loader2 className="hc-spin" size={24} />
            <p>Cargando biblioteca…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="biblioteca-empty">
            <FileWarning size={28} />
            <p>No hay documentos que coincidan con el filtro.</p>
          </div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table biblioteca-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Categoría</th>
                  <th>Origen</th>
                  <th>Páginas</th>
                  <th>Tamaño</th>
                  <th>Texto</th>
                  <th>En copiloto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const trained = isKnowledgeDocTrained(doc.charCount)
                  const enabled = doc.enabledInCopilot && trained
                  return (
                    <tr key={doc.id} className={!trained ? 'inactive' : ''}>
                      <td>
                        <strong>{doc.title}</strong>
                        <small>
                          {doc.fileUrl ? (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {doc.fileName || 'Ver PDF'}
                            </a>
                          ) : (
                            doc.sourcePath
                          )}
                        </small>
                        {doc.note ? (
                          <small className="biblioteca-note">{doc.note}</small>
                        ) : null}
                      </td>
                      <td>{doc.category}</td>
                      <td>
                        <span
                          className={`biblioteca-chip ${doc.isCatalog && !doc.storagePath ? 'muted' : 'ok'}`}
                        >
                          {doc.isCatalog && !doc.storagePath
                            ? 'Catálogo'
                            : 'Subido'}
                        </span>
                      </td>
                      <td>{doc.pages || '—'}</td>
                      <td>{formatSize(doc.sizeMb ?? 0)}</td>
                      <td>
                        <span
                          className={`biblioteca-chip ${trained ? 'ok' : 'warn'}`}
                        >
                          {trained
                            ? `${doc.charCount.toLocaleString('es')} chars`
                            : 'Sin texto'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`biblioteca-toggle${enabled ? ' on' : ''}`}
                          role="switch"
                          aria-checked={enabled}
                          disabled={!trained}
                          title={
                            trained
                              ? enabled
                                ? 'Activo en el copiloto'
                                : 'Excluido del copiloto'
                              : 'No hay texto extraíble'
                          }
                          onClick={() => void handleToggle(doc)}
                        >
                          <span className="biblioteca-toggle-track">
                            <span className="biblioteca-toggle-thumb" />
                          </span>
                          <span className="biblioteca-toggle-label">
                            {trained ? (enabled ? 'Sí' : 'No') : 'N/A'}
                          </span>
                        </button>
                      </td>
                      <td>
                        <div className="biblioteca-row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Editar"
                            onClick={() => openEdit(doc)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Eliminar"
                            onClick={() => void handleDelete(doc)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
