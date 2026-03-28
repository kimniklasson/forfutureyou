import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { splitGeometryByX } from '../../utils/bodyGeometry'
import { useSettingsStore } from '../../stores/useSettingsStore'

type Sex = 'man' | 'kvinna' | null

const LIGHT_BG = 0xf5f5f5
const LIGHT_MODEL = 0xffffff
const DARK_BG = 0x1c1c1e
const DARK_MODEL = 0x3a3a3c

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

// Camera positions: male is on negative X, female on positive X
const HEAD_CAM = {
  male: { pos: new THREE.Vector3(-1.5, 8.5, 5.5), target: new THREE.Vector3(-1.5, 7.8, 0) },
  female: { pos: new THREE.Vector3(1.5, 8.5, 5.5), target: new THREE.Vector3(1.5, 7.8, 0) },
}

function sexToGender(sex: Sex): 'male' | 'female' {
  return sex === 'kvinna' ? 'female' : 'male'
}

export function BodyModelPreview({ sex }: { sex: Sex }) {
  const isDark = useIsDark()
  const mountRef = useRef<HTMLDivElement>(null)
  const maleMeshRef = useRef<THREE.Mesh | null>(null)
  const femaleMeshRef = useRef<THREE.Mesh | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const matRef = useRef<THREE.MeshLambertMaterial | null>(null)
  const sexRef = useRef<Sex>(sex)

  // React to sex changes after scene is mounted
  useEffect(() => {
    sexRef.current = sex
    const gender = sexToGender(sex)

    if (maleMeshRef.current) maleMeshRef.current.visible = gender === 'male'
    if (femaleMeshRef.current) femaleMeshRef.current.visible = gender === 'female'

    const camera = cameraRef.current
    if (camera) {
      camera.position.copy(HEAD_CAM[gender].pos)
      camera.lookAt(HEAD_CAM[gender].target)
    }
  }, [sex])

  // Update colors when theme changes
  useEffect(() => {
    if (rendererRef.current) rendererRef.current.setClearColor(isDark ? DARK_BG : LIGHT_BG)
    if (matRef.current) {
      matRef.current.color.setHex(isDark ? DARK_MODEL : LIGHT_MODEL)
      matRef.current.needsUpdate = true
    }
  }, [isDark])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const w = container.clientWidth
    const h = container.clientHeight
    const scene = new THREE.Scene()

    const gender = sexToGender(sexRef.current)
    const camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 100)
    camera.position.copy(HEAD_CAM[gender].pos)
    camera.lookAt(HEAD_CAM[gender].target)
    cameraRef.current = camera

    const isDarkInit = useSettingsStore.getState().appearance === 'mörkt' ||
      (useSettingsStore.getState().appearance === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(isDarkInit ? DARK_BG : LIGHT_BG)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    scene.add(new THREE.AmbientLight(0xffffff, 2.8))
    const key = new THREE.DirectionalLight(0xffffff, 2.0)
    key.position.set(0, 10, 8)
    scene.add(key)

    const mat = new THREE.MeshLambertMaterial({ color: isDarkInit ? DARK_MODEL : LIGHT_MODEL })
    matRef.current = mat

    const loader = new OBJLoader()
    loader.load('/malefemale.obj', (obj: THREE.Group) => {
      obj.traverse((child: THREE.Object3D) => {
        if (!(child as THREE.Mesh).isMesh) return
        const mesh = child as THREE.Mesh
        const [maleGeo, femaleGeo] = splitGeometryByX(mesh.geometry, 0)

        const g = sexToGender(sexRef.current)
        const maleMesh = new THREE.Mesh(maleGeo, mat)
        const femaleMesh = new THREE.Mesh(femaleGeo, mat)
        maleMesh.visible = g === 'male'
        femaleMesh.visible = g === 'female'

        maleMeshRef.current = maleMesh
        femaleMeshRef.current = femaleMesh
        scene.add(maleMesh)
        scene.add(femaleMesh)
      })
    })

    let rafId: number
    function loop() {
      rafId = requestAnimationFrame(loop)
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(rafId)
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
