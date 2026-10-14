import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Modal ya kawaida kwa fomu zote: inafunguka katikati, nyuma inatiwa ukungu (blur),
// ESC inafunga, ukurasa wa nyuma hausogei, na kisanduku cha kwanza kinapata focus kiotomatiki.
// Inatumia portal (document.body) ili isikatwe na sidebar/glass/transform za wazazi.
//
// <Modal open={show} onClose={() => setShow(false)} title="New product" subtitle="..." size="lg">
//   <form> ... <div className="modal-actions sticky"> vitufe </div> </form>
// </Modal>
const WIDTHS = { sm: 420, md: 540, lg: 780, xl: 940 }

const Modal = ({ open, onClose, title, subtitle, size = 'md', dismissOnOverlay = false, children }) => {
  const dialogRef = useRef(null)

  // onClose mara nyingi ni arrow function mpya kila render. Ikiwa effect ingeitegemea,
  // ingerudia kila unapoandika herufi na kurudisha focus kwenye kisanduku cha kwanza.
  // Ndiyo maana tunaiweka kwenye ref na effect inategemea `open` pekee.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current && onCloseRef.current() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus ya kwanza mara moja tu, modal inapofunguka
    const t = setTimeout(() => {
      dialogRef.current?.querySelector('input:not([type="hidden"]):not([readonly]):not([disabled]), select, textarea')?.focus()
    }, 60)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      clearTimeout(t)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => { if (dismissOnOverlay && e.target === e.currentTarget) onClose && onClose() }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        ref={dialogRef}
        style={{ maxWidth: `${WIDTHS[size] || WIDTHS.md}px` }}
      >
        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            <h3 className="modal-title">{title}</h3>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} strokeWidth={1.75} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

export default Modal
