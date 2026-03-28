import React, { useEffect, useRef, useState } from 'react'
import { Header } from '../components/layout/Header'
import { SharedForFutureYou } from '../components/layout/SharedForFutureYou'
import { BottomNav } from '../components/layout/BottomNav'
import { SessionTimerBar } from '../components/layout/SessionTimerBar'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useSettingsStore } from '../stores/useSettingsStore'

const DARK_BG = 0x111111
const DARK_MODEL = 0x3a3a3c
const LIGHT_BG = 0xffffff
const LIGHT_MODEL = 0xffffff

function useIsDark() {
  const appearance = useSettingsStore(s => s.appearance)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    if (appearance !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [appearance])
  if (appearance === 'mörkt') return true
  if (appearance === 'ljus') return false
  return systemDark
}
import { splitGeometryByX } from '../utils/bodyGeometry'
import { IconMinus, IconCheck } from '../components/ui/icons'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { supabase } from '../lib/supabase'

type Gender = 'male' | 'female'

interface BodyDot {
  id: string
  label: string
  world: THREE.Vector3
  zoomPos: THREE.Vector3
  zoomTarget: THREE.Vector3
}

interface MeasurementRecord {
  value: number
  date: string
}

interface DotMeasurement {
  history: MeasurementRecord[]   // newest first, max 5 entries
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// Offset the female mesh rightward in world units (24px ≈ 0.27 units at this camera distance)
const FEMALE_MESH_X_OFFSET = 0.135

const HOME: Record<Gender, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  male: {
    pos: new THREE.Vector3(-1.7, 4.4, 14.5),
    target: new THREE.Vector3(-1.7, 4.4, 0),
  },
  female: {
    pos: new THREE.Vector3(1.7, 4.4, 14.5),
    target: new THREE.Vector3(1.7, 4.4, 0),
  },
}

function makeDot(id: string, label: string, wx: number, wy: number, wz: number): BodyDot {
  return {
    id,
    label,
    world: new THREE.Vector3(wx, wy, wz),
    zoomPos: new THREE.Vector3(wx, wy, wz + 4),
    zoomTarget: new THREE.Vector3(wx, wy, wz - 0.5),
  }
}

const DOTS: Record<Gender, BodyDot[]> = {
  male: [
    makeDot('neck',          'Nacke',    -1.7,  7.60, 0.5),
    makeDot('shoulders',     'Axlar',    -1.7,  6.98, 0.5),
    makeDot('chest',         'Bröst',    -1.7,  6.36, 0.5),
    makeDot('waist',         'Midja',    -1.7,  5.45, 0.5),
    makeDot('glutes',        'Rumpa',    -1.7,  4.41, 0.5),
    makeDot('left-arm',      'Överarm',  -0.54, 6.19, 0.3),
    makeDot('left-forearm',  'Underarm', -0.28, 5.49, 0.3),
    makeDot('right-arm',     'Överarm',  -2.86, 6.19, 0.3),
    makeDot('right-forearm', 'Underarm', -3.12, 5.49, 0.3),
    makeDot('left-thigh',    'Lår',      -1.1,  3.56, 0.2),
    makeDot('right-thigh',   'Lår',      -2.4,  3.56, 0.2),
    makeDot('left-leg',      'Vad',      -1.1,  1.8,  0.2),
    makeDot('right-leg',     'Vad',      -2.4,  1.8,  0.2),
  ],
  female: [
    makeDot('neck',          'Nacke',    1.7,  7.33, 0.5),   // -24px y
    makeDot('shoulders',     'Axlar',    1.7,  6.89, 0.5),   // -8px y
    makeDot('chest',         'Bröst',    1.7,  6.36, 0.5),
    makeDot('waist',         'Midja',    1.7,  5.45, 0.5),
    makeDot('glutes',        'Rumpa',    1.7,  4.59, 0.5),   // +16px y
    makeDot('left-arm',      'Överarm',  2.55, 6.19, 0.3),   // +8px x
    makeDot('left-forearm',  'Underarm', 2.81, 5.40, 0.3),   // +8px x, -8px y
    makeDot('right-arm',     'Överarm',  0.81, 6.19, 0.3),   // +24px x
    makeDot('right-forearm', 'Underarm', 0.55, 5.40, 0.3),   // +24px x, -8px y
    makeDot('left-thigh',    'Lår',      2.22, 3.56, 0.2),   // +80px -16px x
    makeDot('right-thigh',   'Lår',      1.14, 3.56, 0.2),   // +64px -16px x
    makeDot('left-leg',      'Vad',      2.31, 1.8,  0.2),   // +96px -24px x
    makeDot('right-leg',     'Vad',      1.05, 1.8,  0.2),   // +56px -16px x
  ],
}

function formatValue(v: number): string {
  return String(Math.round(v * 10) / 10).replace('.', ',')
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

// Arc geometry constants
const ARC_R = 150
const ARC_CX = 170
const ARC_CY = 205   // shifted down 30 px → arc top at y=55, plenty of room for tall centre tick
const SVG_W = 340
const SVG_H = 220    // +30 px taller to match
// Tick-mark dial constants
const TICK_SPACING = Math.PI / 35   // ~5° between ticks → ~35 visible at once
const NUM_TICKS = 120               // enough for ±180° of drag with buffer
const TICK_MAX = 42                 // px: outer extension of centre tick
const TICK_MIN = 10                 // px: outer extension of edge ticks

export function BodyModelPage() {
  const { userSex } = useSettingsStore()
  const gender: Gender = userSex === 'kvinna' ? 'female' : 'male'
  const isDark = useIsDark()

  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const matRef = useRef<THREE.MeshLambertMaterial | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeDotId, setActiveDotId] = useState<string | null>(null)
  const activeDotIdRef = useRef<string | null>(null)

  const [measurements, setMeasurements] = useState<Record<string, DotMeasurement>>({})

  // Sync measurements to Supabase user_metadata (fire-and-forget)
  const syncMeasurements = (updated: Record<string, DotMeasurement>) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      const existing = session.user.user_metadata?.settings ?? {}
      supabase.auth.updateUser({
        data: { settings: { ...existing, bodyMeasurements: updated } },
      })
    })
  }

  // Load measurements from Supabase on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const remote = user.user_metadata?.settings?.bodyMeasurements
      if (remote && typeof remote === 'object') {
        setMeasurements(remote as Record<string, DotMeasurement>)
      }
    })
  }, [])

  // Slider state
  const [sliderValue, setSliderValue] = useState(50)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [dialRotation, setDialRotation] = useState(0)  // radians; drives tick positions
  const [saveCount, setSaveCount] = useState(0)        // increments on each save → triggers newest-entry animation
  const [deleteTarget, setDeleteTarget] = useState<{ dotId: string; index: number } | null>(null)

  // Drag refs
  const isDraggingRef = useRef(false)
  const lastXRef = useRef(0)
  const totalDragRef = useRef(0)  // cumulative px drag since dot opened
  const moveDragRef = useRef<((clientX: number) => void) | undefined>(undefined)

  // Always-fresh drag handler (captures latest state setters via closure)
  moveDragRef.current = (clientX: number) => {
    if (!isDraggingRef.current) return
    const dx = clientX - lastXRef.current
    lastXRef.current = clientX
    totalDragRef.current += dx
    // px → radians: 1px drag ≈ 1/ARC_R radians of arc rotation
    setDialRotation(totalDragRef.current / ARC_R)
    setSliderValue(prev => Math.max(0, parseFloat((prev + dx * 0.05).toFixed(1))))
    setHasInteracted(true)
  }

  const genderRef = useRef<Gender>(gender)
  const dotRefs = useRef<(HTMLDivElement | null)[]>([])
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const rafRef = useRef<number>(0)
  const maleMeshRef = useRef<THREE.Mesh | null>(null)
  const femaleMeshRef = useRef<THREE.Mesh | null>(null)
  const animRef = useRef({
    active: false,
    t: 0,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    onComplete: () => {},
  })

  const animateTo = (
    toPos: THREE.Vector3,
    toTarget: THREE.Vector3,
    onComplete?: () => void
  ) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    const a = animRef.current
    a.active = true
    a.t = 0
    a.fromPos.copy(camera.position)
    a.toPos.copy(toPos)
    a.fromTarget.copy(controls.target)
    a.toTarget.copy(toTarget)
    a.onComplete = onComplete ?? (() => {})
    controls.enabled = false
  }

  // Window mouse listeners for drag (added once)
  useEffect(() => {
    const onMove = (e: MouseEvent) => moveDragRef.current?.(e.clientX)
    const onUp = () => { isDraggingRef.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const w = container.clientWidth
    const h = container.clientHeight

    const initialGender = useSettingsStore.getState().userSex === 'kvinna' ? 'female' : 'male'
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 200)
    camera.position.copy(HOME[initialGender].pos)
    cameraRef.current = camera

    const isDarkInit = useSettingsStore.getState().appearance === 'mörkt' ||
      (useSettingsStore.getState().appearance === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(isDarkInit ? DARK_BG : LIGHT_BG)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(HOME[initialGender].target)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.minDistance = 2
    controls.maxDistance = 25
    controls.update()
    controlsRef.current = controls

    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    scene.add(new THREE.AmbientLight(0xffffff, 2.8))
    const key = new THREE.DirectionalLight(0xffffff, 2.0)
    key.position.set(0, 10, 8)
    key.castShadow = true
    key.shadow.mapSize.width = 2048
    key.shadow.mapSize.height = 2048
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 50
    key.shadow.camera.left = -8
    key.shadow.camera.right = 8
    key.shadow.camera.top = 16
    key.shadow.camera.bottom = -4
    key.shadow.radius = 8
    key.shadow.bias = -0.0005
    scene.add(key)

    const mat = new THREE.MeshLambertMaterial({ color: isDarkInit ? DARK_MODEL : LIGHT_MODEL })
    matRef.current = mat

    const loader = new OBJLoader()
    loader.load(
      '/malefemale.obj',
      (obj: THREE.Group) => {
        obj.traverse((child: THREE.Object3D) => {
          if (!(child as THREE.Mesh).isMesh) return
          const mesh = child as THREE.Mesh
          const [maleGeo, femaleGeo] = splitGeometryByX(mesh.geometry, 0)

          const maleMesh = new THREE.Mesh(maleGeo, mat)
          maleMesh.castShadow = true
          maleMesh.receiveShadow = true
          maleMesh.visible = initialGender === 'male'
          const femaleMesh = new THREE.Mesh(femaleGeo, mat)
          femaleMesh.castShadow = true
          femaleMesh.receiveShadow = true
          femaleMesh.visible = initialGender === 'female'
          femaleMesh.position.x = FEMALE_MESH_X_OFFSET

          maleMeshRef.current = maleMesh
          femaleMeshRef.current = femaleMesh
          scene.add(maleMesh)
          scene.add(femaleMesh)
        })
        setLoading(false)
      },
      undefined,
      (_err: unknown) => console.error('OBJ load error')
    )

    function loop() {
      rafRef.current = requestAnimationFrame(loop)

      const a = animRef.current
      if (a.active) {
        a.t = Math.min(a.t + 0.04, 1)
        const t = easeInOut(a.t)
        camera.position.lerpVectors(a.fromPos, a.toPos, t)
        controls.target.lerpVectors(a.fromTarget, a.toTarget, t)
        controls.update()
        if (a.t >= 1) {
          a.active = false
          controls.enabled = true
          a.onComplete()
        }
      } else {
        controls.update()
      }

      const cw = container?.clientWidth ?? 0
      const ch = container?.clientHeight ?? 0
      const currentActiveId = activeDotIdRef.current

      DOTS[genderRef.current].forEach((dot, i) => {
        const el = dotRefs.current[i]
        if (!el) return
        const vec = dot.world.clone().project(camera)
        const x = Math.round(((vec.x + 1) / 2) * cw)
        const y = Math.round(((-vec.y + 1) / 2) * ch)
        el.style.left = `${x}px`
        el.style.top = `${y}px`

        const behindModel = vec.z >= 1
        const isActive = dot.id === currentActiveId
        const hasActive = currentActiveId !== null

        const targetOpacity = behindModel ? '0' : (hasActive && !isActive ? '0' : '1')
        const targetPE = behindModel ? 'none' : (hasActive && !isActive ? 'none' : 'all')

        if (el.style.opacity !== targetOpacity) el.style.opacity = targetOpacity
        if (el.style.pointerEvents !== targetPE) el.style.pointerEvents = targetPE
      })

      renderer.render(scene, camera)
    }
    loop()

    const onResize = () => {
      const nw = container.clientWidth
      const nh = container.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  // Update 3D colors when theme changes
  useEffect(() => {
    if (rendererRef.current) rendererRef.current.setClearColor(isDark ? DARK_BG : LIGHT_BG)
    if (matRef.current) {
      matRef.current.color.setHex(isDark ? DARK_MODEL : LIGHT_MODEL)
      matRef.current.needsUpdate = true
    }
  }, [isDark])

  useEffect(() => {
    genderRef.current = gender
    if (maleMeshRef.current) maleMeshRef.current.visible = gender === 'male'
    if (femaleMeshRef.current) femaleMeshRef.current.visible = gender === 'female'
    activeDotIdRef.current = null
    setActiveDotId(null)
    setHasInteracted(false)
    animateTo(HOME[gender].pos, HOME[gender].target)
  }, [gender]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDotClick = (dot: BodyDot, m: DotMeasurement | undefined) => {
    setSliderValue(m ? m.history[0].value : 50)
    setHasInteracted(false)
    totalDragRef.current = 0
    setDialRotation(0)
    activeDotIdRef.current = dot.id
    setActiveDotId(dot.id)
    if (controlsRef.current) {
      controlsRef.current.enableZoom = false
      controlsRef.current.enableRotate = false
    }
    animateTo(dot.zoomPos, dot.zoomTarget)
  }

  const handleReset = () => {
    activeDotIdRef.current = null
    setActiveDotId(null)
    setHasInteracted(false)
    isDraggingRef.current = false
    totalDragRef.current = 0
    if (controlsRef.current) {
      controlsRef.current.enableZoom = true
      controlsRef.current.enableRotate = true
    }
    const g = genderRef.current
    animateTo(HOME[g].pos, HOME[g].target)
  }

  const handleSave = () => {
    if (!activeDotId) return
    const date = new Date().toISOString().split('T')[0]
    setMeasurements(prev => {
      const existing = prev[activeDotId]
      const newRecord: MeasurementRecord = { value: sliderValue, date }
      const newHistory = [newRecord, ...(existing?.history ?? [])].slice(0, 5)
      const updated = { ...prev, [activeDotId]: { history: newHistory } }
      syncMeasurements(updated)
      return updated
    })
    setSaveCount(c => c + 1)
    setHasInteracted(false)
  }

  const handleRemoveHistoryEntry = (dotId: string, index: number) => {
    setMeasurements(prev => {
      const newHistory = prev[dotId].history.filter((_, i) => i !== index)
      let updated: Record<string, DotMeasurement>
      if (newHistory.length === 0) {
        const { [dotId]: _removed, ...rest } = prev
        updated = rest
      } else {
        updated = { ...prev, [dotId]: { history: newHistory } }
      }
      syncMeasurements(updated)
      return updated
    })
  }

  // Build tick marks: each tick is a radial line on the semicircle.
  // Ticks span a wide angle range; only those whose current angle falls in
  // [0, π] (the visible semicircle) are rendered.
  // Angular distance from π/2 (top/centre) drives height and opacity.
  const tickLines: React.ReactElement[] = []
  for (let i = 0; i < NUM_TICKS; i++) {
    // Spread ticks symmetrically across a wide range so dragging left/right
    // always brings new ticks into view.
    const baseAngle = -(NUM_TICKS / 2) * TICK_SPACING + i * TICK_SPACING
    const angle = baseAngle + dialRotation      // current angle after drag rotation
    if (angle < -0.05 || angle > Math.PI + 0.05) continue
    const distFromCenter = Math.abs(angle - Math.PI / 2)
    // Gaussian for length — k=25: centre clearly tallest, gradual taper to sides
    const tLen = Math.exp(-distFromCenter * distFromCenter * 25)
    // Gentle cosine for opacity — keeps all ticks visible across the full arc
    const tOpa = Math.max(0, Math.cos(distFromCenter))
    const tickLen = TICK_MIN + (TICK_MAX - TICK_MIN) * tLen
    const opacity  = 0.12 + 0.88 * tOpa
    // Arc surface point (inner end of tick)
    const x1 = ARC_CX + ARC_R * Math.cos(angle)
    const y1 = ARC_CY - ARC_R * Math.sin(angle)
    // Outer tip of tick (only outward from arc)
    const x2 = ARC_CX + (ARC_R + tickLen) * Math.cos(angle)
    const y2 = ARC_CY - (ARC_R + tickLen) * Math.sin(angle)
    tickLines.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isDark ? "white" : "black"} strokeWidth="1" strokeOpacity={opacity} strokeLinecap="butt" />
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: isDark ? '#111111' : '#ffffff',
        animation: 'bodyPageEnter 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      {/* Three.js canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Body part dots overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {DOTS[gender].map((dot, i) => {
          const isActive = activeDotId === dot.id
          const measurement = measurements[dot.id]
          const displayLabel = measurement
            ? `${formatValue(measurement.history[0].value)} cm`
            : dot.label

          return (
            <div
              key={dot.id}
              ref={(el) => { dotRefs.current[i] = el }}
              onClick={isActive ? undefined : () => handleDotClick(dot, measurement)}
              style={{
                position: 'absolute',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'opacity 0.25s ease',
                cursor: isActive ? 'default' : 'pointer',
              }}
            >
              {isActive ? (
                /* Relative wrapper — X button is the sole normal-flow child (fixes its position).
                   History is absolutely positioned above it, growing upward as items are added. */
                <div style={{ position: 'relative' }}>

                  {/* History — bottom edge anchored 64 px above X button's top edge.
                      flex-direction: column-reverse so history[0] (newest) stays at the
                      bottom and each new save naturally pushes older rows upward. */}
                  {measurement?.history && measurement.history.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 52 + 64,   // 52 = X height, 64 = desired gap above X top
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        alignItems: 'center',
                        gap: 6,
                        pointerEvents: 'auto',
                      }}
                    >
                      {measurement.history.map((record, index) => {
                        const isNewest = index === 0
                        const opacities = [1, 0.55, 0.35, 0.22, 0.12]
                        const opacity = opacities[index] ?? 0.12
                        return (
                          <div
                            key={isNewest ? saveCount : `${record.date}-${record.value}-${index}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              opacity,
                              animation: isNewest
                                ? 'rowIn 0.22s cubic-bezier(0.32, 0.72, 0, 1)'
                                : undefined,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 400,
                                fontFamily: 'var(--font-sans)',
                                color: isDark ? '#fff' : '#000',
                              }}
                            >
                              {formatValue(record.value)} cm · {formatDate(record.date)}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget({ dotId: dot.id, index }) }}
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                border: isDark ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid rgba(0,0,0,0.3)',
                                background: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                flexShrink: 0,
                              }}
                            >
                              <IconMinus size={9} color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* X close button — always in the same spot */}
                  <div
                    onClick={(e) => { e.stopPropagation(); handleReset() }}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'dotToClose 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="2" y1="2" x2="14" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="14" y1="2" x2="2" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
              ) : (
                <span
                  style={{
                    color: isDark ? '#fff' : '#000',
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                    background: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(245,245,245,0.85)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    borderRadius: 20,
                  }}
                >
                  {displayLabel}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Arc slider — fixed above nav bar */}
      {activeDotId && (
        <div
          style={{
            position: 'fixed',
            bottom: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 20,
            userSelect: 'none',
            touchAction: 'none',
            animation: 'sliderIn 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            cursor: 'ew-resize',
          }}
          onMouseDown={(e) => { isDraggingRef.current = true; lastXRef.current = e.clientX }}
          onTouchStart={(e) => { isDraggingRef.current = true; lastXRef.current = e.touches[0].clientX }}
          onTouchMove={(e) => { e.preventDefault(); moveDragRef.current?.(e.touches[0].clientX) }}
          onTouchEnd={() => { isDraggingRef.current = false }}
        >
          {/* Value text */}
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              color: hasInteracted || !!measurements[activeDotId]?.history.length
                ? (isDark ? '#fff' : '#000')
                : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'),
              transition: 'color 0.2s ease',
              marginBottom: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {formatValue(sliderValue)} cm
          </div>

          {/* Arc + center line + checkmark */}
          <div style={{ position: 'relative', width: SVG_W, height: SVG_H }}>
            <svg
              width={SVG_W}
              height={SVG_H}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ display: 'block' }}
            >
              {tickLines}
            </svg>

            {/* Yellow checkmark at arc baseline center */}
            {hasInteracted && (
              <div
                style={{
                  position: 'absolute',
                  bottom: SVG_H - ARC_CY + 72,
                  left: ARC_CX,
                  transform: 'translate(-50%, 50%)',
                  animation: 'scaleIn 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleSave() }}
                  style={{
                    background: '#FFD900',
                    border: 'none',
                    borderRadius: '50%',
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <IconCheck size={18} color="#000" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            fontSize: 15,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: isDark ? '2px solid rgba(255,255,255,0.1)' : '2px solid rgba(0,0,0,0.1)',
              borderTopColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Laddar modell...
        </div>
      )}

      {/* Delete-measurement confirmation modal */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message="Är du säker på att du vill radera måttet permanent?"
        confirmLabel="Radera"
        cancelLabel="Avbryt"
        onConfirm={() => {
          if (deleteTarget) handleRemoveHistoryEntry(deleteTarget.dotId, deleteTarget.index)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* App chrome */}
      <Header />
      <SharedForFutureYou />
      <SessionTimerBar />
      <BottomNav />

      <style>{`
        @keyframes bodyPageEnter {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dotToClose {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { transform: translateY(6px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes sliderIn {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: translate(-50%, 50%) scale(0.5); opacity: 0; }
          to { transform: translate(-50%, 50%) scale(1); opacity: 1; }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
