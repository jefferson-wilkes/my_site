import { useRef } from 'react'

const CAT_OPTIONS = [
  { id: 'cat1',  value: '🐱',  label: 'Classic'  },
  { id: 'cat2',  value: '😺',  label: 'Happy'    },
  { id: 'cat3',  value: '😸',  label: 'Beaming'  },
  { id: 'cat4',  value: '😻',  label: 'Smitten'  },
  { id: 'cat5',  value: '😼',  label: 'Smug'     },
  { id: 'cat6',  value: '🙀',  label: 'Focused'  },
  { id: 'cat7',  value: '🐈',  label: 'Tabby'    },
  { id: 'cat8',  value: '🐈‍⬛', label: 'Shadow'   },
]

const MAX_PX = 300   // max dimension before downscaling
const QUALITY = 0.82 // JPEG quality after resize

export default function CharacterPicker({ value, onChange }) {
  const fileRef = useRef(null)
  const isPhoto = value?.type === 'image'

  function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        onChange({ type: 'image', src: canvas.toDataURL('image/jpeg', QUALITY) })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      {CAT_OPTIONS.map(opt => {
        const selected = !isPhoto && value?.value === opt.value
        return (
          <EmojiCard
            key={opt.id}
            selected={selected}
            onClick={() => onChange({ type: 'emoji', value: opt.value })}
          >
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{opt.value}</span>
            <span style={{ fontSize: '0.55rem', letterSpacing: '1px', color: selected ? '#4ab0f0' : '#44446a' }}>
              {opt.label}
            </span>
          </EmojiCard>
        )
      })}

      <EmojiCard selected={isPhoto} onClick={() => fileRef.current.click()}>
        {isPhoto ? (
          <img
            src={value.src}
            alt="Your photo"
            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ab0f0' }}
          />
        ) : (
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>📷</span>
        )}
        <span style={{ fontSize: '0.55rem', letterSpacing: '1px', color: isPhoto ? '#4ab0f0' : '#44446a' }}>
          {isPhoto ? 'Change' : 'Photo'}
        </span>
      </EmojiCard>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
    </div>
  )
}

function EmojiCard({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? '#4ab0f018' : 'transparent',
        border: `2px solid ${selected ? '#4ab0f0' : '#2a2a55'}`,
        boxShadow: selected ? '0 0 10px #4ab0f033' : 'none',
        borderRadius: '8px',
        padding: '8px 10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.12s ease',
        minWidth: '52px',
      }}
    >
      {children}
    </button>
  )
}
