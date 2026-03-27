import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { splitGeometryByX } from '../../utils/bodyGeometry'

type Sex = 'man' | 'kvinna' | null

// Camera positions: male is on negative X, female on positive X
const HEAD_CAM = {
  male: { pos: new THREE.Vector3(-1.5, 8.5, 5.5), target: new THREE.Vector3(-1.5, 7.8, 0) },
  female: { pos: new THREE.Vector3(1.5, 8.5, 5.5), target: new THREE.Vector3(1.5, 7.8, 0) },
}

function sexToGender(sex: Sex): 'male' | 'female' {
  return sex === 'kvinna' ? 'female' : 'male'
}

export function BodyModelPreview({ sex }: { sex: Sex }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const maleMeshRef = useRef<THREE.Mesh | null>(null)
  const femaleMeshRef = useRef<THREE.Mesh | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
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

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0xffffff)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 2.8))
    const key = new THREE.DirectionalLight(0xffffff, 2.0)
    key.position.set(0, 10, 8)
    scene.add(key)

    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff })

    const loader = new OBJLoader()
    loader.load('/malefemale.obj', (obj) => {
      obj.traverse((child) => {
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
