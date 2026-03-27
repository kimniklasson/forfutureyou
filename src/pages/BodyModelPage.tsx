import { useEffect, useRef, useState } from 'react'
import { Header } from '../components/layout/Header'
import { SharedForFutureYou } from '../components/layout/SharedForFutureYou'
import { BottomNav } from '../components/layout/BottomNav'
import { SessionTimerBar } from '../components/layout/SessionTimerBar'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useSettingsStore } from '../stores/useSettingsStore'
import { splitGeometryByX } from '../utils/bodyGeometry'

type Gender = 'male' | 'female'

interface BodyDot {
  id: string
  label: string
  world: THREE.Vector3
  zoomPos: THREE.Vector3
  zoomTarget: THREE.Vector3
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// Male is at negative X (~-1.5 center), Female at positive X (~+1.5 center)
// Target X shifted slightly left from geometry center to visually align with the centered logo
const HOME: Record<Gender, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  male: {
    pos: new THREE.Vector3(-1.7, 4.4, 13),
    target: new THREE.Vector3(-1.7, 4.4, 0),
  },
  female: {
    pos: new THREE.Vector3(1.7, 4.4, 13),
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
    makeDot('neck',         'Nacke',           -1.7,  7.42, 0.5),
    makeDot('chest',        'Bröst',           -1.7,  6.1,  0.5),
    makeDot('waist',        'Midja',           -1.7,  4.78, 0.5),
    makeDot('left-arm',     'Vänster överarm', -0.54, 5.93, 0.3),
    makeDot('right-arm',    'Höger överarm',   -2.86, 5.93, 0.3),
    makeDot('left-thigh',   'Vänster lår',     -1.1,  3.56, 0.2),
    makeDot('right-thigh',  'Höger lår',       -2.4,  3.56, 0.2),
    makeDot('left-leg',     'Vänster vad',     -1.1,  1.8,  0.2),
    makeDot('right-leg',    'Höger vad',       -2.4,  1.8,  0.2),
  ],
  female: [
    makeDot('neck',         'Nacke',           1.7,  7.42, 0.5),
    makeDot('chest',        'Bröst',           1.7,  6.1,  0.5),
    makeDot('waist',        'Midja',           1.7,  4.78, 0.5),
    makeDot('left-arm',     'Vänster överarm', 2.46, 5.93, 0.3),
    makeDot('right-arm',    'Höger överarm',   0.54, 5.93, 0.3),
    makeDot('left-thigh',   'Vänster lår',     1.5,  3.56, 0.2),
    makeDot('right-thigh',  'Höger lår',       0.6,  3.56, 0.2),
    makeDot('left-leg',     'Vänster vad',     1.5,  1.8,  0.2),
    makeDot('right-leg',    'Höger vad',       0.6,  1.8,  0.2),
  ],
}

export function BodyModelPage() {
  const { userSex } = useSettingsStore()
  const gender: Gender = userSex === 'kvinna' ? 'female' : 'male'

  const mountRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [isZoomed, setIsZoomed] = useState(false)

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

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0xffffff)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(HOME[initialGender].target)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.minDistance = 2
    controls.maxDistance = 25
    controls.update()
    controlsRef.current = controls

    // Three.js r155+ uses physical light intensities (multiply old values by π ≈ 3.14).
    // High ambient = nearly white model everywhere.
    // Single directional with shadow map = only deep recesses (armpits, under chin) go dark.
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    scene.add(new THREE.AmbientLight(0xffffff, 2.8))  // ≈ 0.9 in old scale
    const key = new THREE.DirectionalLight(0xffffff, 2.0) // ≈ 0.64 in old scale
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

    const mat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
    })

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

      // Project 3D body dots to 2D screen
      const cw = container?.clientWidth ?? 0
      const ch = container?.clientHeight ?? 0
      DOTS[genderRef.current].forEach((dot, i) => {
        const el = dotRefs.current[i]
        if (!el) return
        const vec = dot.world.clone().project(camera)
        const x = Math.round(((vec.x + 1) / 2) * cw)
        const y = Math.round(((-vec.y + 1) / 2) * ch)
        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.opacity = vec.z < 1 ? '1' : '0'
        el.style.pointerEvents = vec.z < 1 ? 'all' : 'none'
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Sync gender from store (e.g. if user changes it in profile while page is mounted)
  useEffect(() => {
    genderRef.current = gender
    if (maleMeshRef.current) maleMeshRef.current.visible = gender === 'male'
    if (femaleMeshRef.current) femaleMeshRef.current.visible = gender === 'female'
    animateTo(HOME[gender].pos, HOME[gender].target, () => setIsZoomed(false))
  }, [gender]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDotClick = (dot: BodyDot) => {
    animateTo(dot.zoomPos, dot.zoomTarget, () => setIsZoomed(true))
  }

  const handleReset = () => {
    const g = genderRef.current
    animateTo(HOME[g].pos, HOME[g].target, () => setIsZoomed(false))
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#ffffff',
        animation: 'bodyPageEnter 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      {/* Three.js canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Body part dots overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {DOTS[gender].map((dot, i) => (
          <div
            key={dot.id}
            ref={(el) => {
              dotRefs.current[i] = el
            }}
            onClick={() => handleDotClick(dot)}
            style={{
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              transition: 'opacity 0.2s',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
            </div>
            <span
              style={{
                color: '#000',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
                background: 'rgba(245,245,245,0.85)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 20,
              }}
            >
              {dot.label}
            </span>
          </div>
        ))}
      </div>

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
            color: 'rgba(0,0,0,0.5)',
            fontSize: 15,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: '2px solid rgba(0,0,0,0.1)',
              borderTopColor: 'rgba(0,0,0,0.5)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Laddar modell...
        </div>
      )}

      {/* Back button when zoomed */}
      {isZoomed && (
        <button
          onClick={handleReset}
          style={{
            position: 'absolute',
            bottom: 48,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a1a2e',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: 'none',
            borderRadius: 100,
            padding: '11px 32px',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            zIndex: 10,
          }}
        >
          ← Tillbaka till helkropp
        </button>
      )}

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
      `}</style>
    </div>
  )
}
