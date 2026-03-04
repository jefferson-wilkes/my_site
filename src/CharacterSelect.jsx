import { useRef, useState } from 'react'

const EMOJI_OPTIONS = [
  { id: 'cat', value: '🐱', label: 'Cat' },
  { id: 'dog', value: '🐶', label: 'Dog' },
]

const MAX_MB = 5
const MAX_BYTES = MAX_MB * 1024 * 1024

const dark = {
  background: '#0d0d2b',
  border: '2px solid #ff4dff',
  boxShadow: '0 0 30px #ff4dff44, inset 0 0 30px #ff4dff11',
  borderRadius: '4px',
  padding: '36px 28px',
  fontFamily: "'Courier New', monospace",
  color: '#ccccee',
}

function Card({ selected, onClick, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? '#ff4dff18' : hovered ? '#ffffff08' : 'transparent',
        border: `2px solid ${selected ? '#ff4dff' : hovered ? '#6666aa' : '#2a2a55'}`,
        boxShadow: selected ? '0 0 16px #ff4dff44' : 'none',
        borderRadius: '10px',
        padding: '20px 16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        transition: 'all 0.15s ease',
        minWidth: '110px',
        flex: '1',
      }}
    >
      {children}
    </button>
  )
}

export default function CharacterSelect({ onStart }) {
  // Default to cat so Play is immediately available
  const [selected, setSelected] = useState(EMOJI_OPTIONS[0])
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_BYTES) {
      setUploadError(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — please choose one under ${MAX_MB} MB.`)
      e.target.value = ''
      return
    }
    setUploadError('')
    const reader = new FileReader()
    reader.onload = (ev) => setSelected({ type: 'image', src: ev.target.result })
    reader.readAsDataURL(file)
  }

  const isUpload = selected?.type === 'image'

  return (
    <div style={dark}>
      <p style={{ color: '#ff4dff', fontSize: '0.75rem', letterSpacing: '3px', textTransform: 'uppercase', textAlign: 'center', marginBottom: '24px' }}>
        Choose Your Character
      </p>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {EMOJI_OPTIONS.map((opt) => {
          const isSelected = selected?.type !== 'image' && selected?.value === opt.value
          return (
            <Card key={opt.id} selected={isSelected} onClick={() => setSelected(opt)}>
              <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>{opt.value}</span>
              <span style={{ fontSize: '0.7rem', letterSpacing: '1px', color: isSelected ? '#ff4dff' : '#8888bb' }}>
                {opt.label}
              </span>
            </Card>
          )
        })}

        {/* Upload card */}
        <Card selected={isUpload} onClick={() => fileRef.current.click()}>
          {isUpload ? (
            <img
              src={selected.src}
              alt="Your character"
              style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff4dff' }}
            />
          ) : (
            <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>📷</span>
          )}
          <span style={{ fontSize: '0.7rem', letterSpacing: '1px', color: isUpload ? '#ff4dff' : '#8888bb' }}>
            {isUpload ? 'Change photo' : 'Upload photo'}
          </span>
          <span style={{ fontSize: '0.6rem', color: '#44446a' }}>Max {MAX_MB} MB</span>
        </Card>
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />

      {uploadError && (
        <p style={{ color: '#ff7777', fontSize: '0.72rem', textAlign: 'center', marginTop: '16px', letterSpacing: '0.5px' }}>
          ⚠ {uploadError}
        </p>
      )}

      <div style={{ textAlign: 'center', marginTop: '28px' }}>
        <PlayButton onClick={() => onStart(selected)} />
      </div>
    </div>
  )
}

function PlayButton({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#ff4dff33' : '#ff4dff18',
        border: '2px solid #ff4dff',
        boxShadow: hovered ? '0 0 28px #ff4dff66' : '0 0 14px #ff4dff33',
        borderRadius: '6px',
        padding: '12px 52px',
        color: '#ffffff',
        fontSize: '1rem',
        fontFamily: "'Courier New', monospace",
        letterSpacing: '3px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      ▶ PLAY
    </button>
  )
}
