import * as THREE from 'three'

export function splitGeometryByX(
  geo: THREE.BufferGeometry,
  splitX: number
): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const pos = geo.attributes.position
  const norm = geo.attributes.normal as THREE.BufferAttribute | undefined

  const negPos: number[] = []
  const negNorm: number[] = []
  const posPos: number[] = []
  const posNorm: number[] = []

  const handleTriangle = (i0: number, i1: number, i2: number) => {
    const avgX = (pos.getX(i0) + pos.getX(i1) + pos.getX(i2)) / 3
    const target = avgX < splitX ? { p: negPos, n: negNorm } : { p: posPos, n: posNorm }
    for (const idx of [i0, i1, i2]) {
      target.p.push(pos.getX(idx), pos.getY(idx), pos.getZ(idx))
      if (norm) target.n.push(norm.getX(idx), norm.getY(idx), norm.getZ(idx))
    }
  }

  if (geo.index) {
    const idx = geo.index
    for (let i = 0; i < idx.count; i += 3) {
      handleTriangle(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2))
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      handleTriangle(i, i + 1, i + 2)
    }
  }

  const makeGeo = (pArr: number[], nArr: number[]) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pArr, 3))
    if (nArr.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(nArr, 3))
    return g
  }

  return [makeGeo(negPos, negNorm), makeGeo(posPos, posNorm)]
}
