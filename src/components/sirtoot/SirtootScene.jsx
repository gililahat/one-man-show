// src/components/sirtoot/SirtootScene.jsx
// Three.js 3D shower scene. Renders the chain of panels with real glass
// thickness, corner bending, hinges, handle, and optional door-open animation.
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { panelPolygon, layoutChain } from '@/utils/sirtoot/geometry'

const GLASS_THICKNESS_DEFAULT = 8  // mm

// Reusable Vector3 for projecting seams each frame (avoids alloc churn)
const _tmpSeamVec = new THREE.Vector3()

export default function SirtootScene({
  panels,             // computed panels from rules.js
  thickness = GLASS_THICKNESS_DEFAULT,
  mode = 'gross',     // 'gross' | 'net'
  doorsOpen = false,
  onPanelClick,       // (index) => void
  onSeamsUpdate,      // (seams: [{panelIndex, x, y}]) — x/y are canvas-local pixels
  onPanelsProject,    // (panels: [{panelIndex, x, y}]) — projected panel centers
}) {
  const mountRef = useRef(null)
  const stateRef = useRef(null)  // holds three.js state across renders

  // ── Init scene (once) ──────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xe2e8f0)

    const rect = mount.getBoundingClientRect()
    const camera = new THREE.PerspectiveCamera(
      42, Math.max(1, rect.width) / Math.max(1, rect.height), 10, 50000,
    )

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setSize(rect.width, rect.height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    mount.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbcc5d0, 0.55))
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(2500, 5000, 3500)
    dir.castShadow = true
    dir.shadow.camera.left = -3500; dir.shadow.camera.right = 3500
    dir.shadow.camera.top = 3500;   dir.shadow.camera.bottom = -3500
    dir.shadow.camera.near = 10;    dir.shadow.camera.far = 12000
    dir.shadow.mapSize.set(2048, 2048)
    dir.shadow.bias = -0.0005
    scene.add(dir)
    const fill = new THREE.DirectionalLight(0xcdd8e3, 0.3)
    fill.position.set(-2000, 1500, -1500)
    scene.add(fill)

    // Floor: pure white. The shower's drop-shadow on white gives a "floating"
    // feel without the grid / coloured floor distracting the eye.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10000, 10000),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    const showerGroup = new THREE.Group()
    scene.add(showerGroup)

    const view = { rotY: 0, rotX: Math.PI / 2 - 0.05, dist: 5000, target: new THREE.Vector3(0, 900, 0) }
    const entities = []

    stateRef.current = { scene, camera, renderer, showerGroup, view, entities, mount }

    // Pointer drag = horizontal orbit; click (no drag) = raycast select
    let dragging = false, startX = 0, startRotY = 0, didDrag = false
    const onDown = (e) => {
      if (e.target !== renderer.domElement) return
      dragging = true; didDrag = false
      startX = e.clientX; startRotY = view.rotY
      mount.setPointerCapture(e.pointerId)
    }
    const onMove = (e) => {
      if (!dragging) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 3) didDrag = true
      view.rotY = startRotY - dx * 0.006
    }
    const onUp = () => { dragging = false }
    const onClick = (e) => {
      if (didDrag || e.target !== renderer.domElement) return
      const r = renderer.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      )
      const rc = new THREE.Raycaster()
      rc.setFromCamera(mouse, camera)
      const meshes = entities.map(en => en.mesh).filter(Boolean)
      const hits = rc.intersectObjects(meshes, false)
      if (hits.length) {
        let obj = hits[0].object
        while (obj && obj.userData.panelIndex === undefined) obj = obj.parent
        if (obj && onPanelClickRef.current) onPanelClickRef.current(obj.userData.panelIndex)
      }
    }
    const onWheel = (e) => {
      e.preventDefault()
      view.dist = Math.max(500, Math.min(20000, view.dist * (1 + e.deltaY * 0.001)))
    }
    mount.addEventListener('pointerdown', onDown)
    mount.addEventListener('pointermove', onMove)
    mount.addEventListener('pointerup', onUp)
    mount.addEventListener('pointercancel', onUp)
    mount.addEventListener('click', onClick)
    mount.addEventListener('wheel', onWheel, { passive: false })

    // Resize
    const onResize = () => {
      const r = mount.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) return
      camera.aspect = r.width / r.height
      camera.updateProjectionMatrix()
      renderer.setSize(r.width, r.height)
    }
    window.addEventListener('resize', onResize)

    // Animation loop
    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      // Door animation
      const target = doorsOpenRef.current ? Math.PI * 0.45 : 0
      entities.forEach(({ pivot }) => {
        if (!pivot.userData.isDoor) return
        const cur = pivot.userData.openAngle
        const next = cur + (target - cur) * 0.12
        const done = Math.abs(target - next) < 0.002
        pivot.userData.openAngle = done ? target : next
        pivot.rotation.y = pivot.userData.baseRotY + pivot.userData.openAngle * pivot.userData.openSign
      })
      // Camera
      const phi = Math.max(0.05, Math.min(Math.PI * 0.95, view.rotX))
      camera.position.set(
        view.target.x + view.dist * Math.sin(phi) * Math.sin(view.rotY),
        view.target.y + view.dist * Math.cos(phi),
        view.target.z + view.dist * Math.sin(phi) * Math.cos(view.rotY),
      )
      camera.lookAt(view.target)
      renderer.render(scene, camera)

      // Project seam points (between adjacent panels) + panel centers to screen.
      if (stateRef.current?.placed && stateRef.current.placed.length > 0) {
        const rect = renderer.domElement.getBoundingClientRect()
        const tmpVec = _tmpSeamVec
        const seams = []
        const panelCenters = []
        const placed = stateRef.current.placed
        const offX = stateRef.current.offsetX
        const offZ = stateRef.current.offsetZ
        for (let i = 0; i < placed.length; i++) {
          const pl = placed[i]
          // Seam (only for i > 0)
          if (i > 0) {
            tmpVec.set(pl.startX + offX, 50, pl.startZ + offZ)
            tmpVec.project(camera)
            if (tmpVec.z <= 1) {
              seams.push({
                panelIndex: i,
                x: (tmpVec.x + 1) / 2 * rect.width,
                y: (-tmpVec.y + 1) / 2 * rect.height,
              })
            }
          }
          // Panel center (edit icon anchor) — slightly above mid-height
          tmpVec.set(pl.centerX + offX, pl.h * 0.65, pl.centerZ + offZ)
          tmpVec.project(camera)
          if (tmpVec.z <= 1) {
            panelCenters.push({
              panelIndex: i,
              x: (tmpVec.x + 1) / 2 * rect.width,
              y: (-tmpVec.y + 1) / 2 * rect.height,
            })
          }
        }
        if (onSeamsUpdateRef.current)   maybeEmitSeams(seams)
        if (onPanelsProjectRef.current) maybeEmitPanels(panelCenters)
      }
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      mount.removeEventListener('pointerdown', onDown)
      mount.removeEventListener('pointermove', onMove)
      mount.removeEventListener('pointerup', onUp)
      mount.removeEventListener('pointercancel', onUp)
      mount.removeEventListener('click', onClick)
      mount.removeEventListener('wheel', onWheel)
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep refs in sync with props (avoid re-creating the scene)
  const doorsOpenRef    = useRef(doorsOpen)
  const onPanelClickRef = useRef(onPanelClick)
  const onSeamsUpdateRef = useRef(onSeamsUpdate)
  const onPanelsProjectRef = useRef(onPanelsProject)
  useEffect(() => { doorsOpenRef.current       = doorsOpen       }, [doorsOpen])
  useEffect(() => { onPanelClickRef.current    = onPanelClick    }, [onPanelClick])
  useEffect(() => { onSeamsUpdateRef.current   = onSeamsUpdate   }, [onSeamsUpdate])
  useEffect(() => { onPanelsProjectRef.current = onPanelsProject }, [onPanelsProject])

  // Throttled emitters — only push when positions changed > 0.5px
  const lastSeamsRef = useRef([])
  const lastPanelsRef = useRef([])
  function _changed(prev, next) {
    if (prev.length !== next.length) return true
    for (let i = 0; i < prev.length; i++) {
      if (prev[i].panelIndex !== next[i].panelIndex
          || Math.abs(prev[i].x - next[i].x) > 0.5
          || Math.abs(prev[i].y - next[i].y) > 0.5) return true
    }
    return false
  }
  function maybeEmitSeams(next) {
    if (_changed(lastSeamsRef.current, next)) {
      lastSeamsRef.current = next
      onSeamsUpdateRef.current?.(next)
    }
  }
  function maybeEmitPanels(next) {
    if (_changed(lastPanelsRef.current, next)) {
      lastPanelsRef.current = next
      onPanelsProjectRef.current?.(next)
    }
  }

  // ── Rebuild shower mesh whenever panels/mode/thickness change ──
  useEffect(() => {
    const s = stateRef.current
    if (!s || !panels || !panels.length) return

    // Clear previous panels
    while (s.showerGroup.children.length) {
      const c = s.showerGroup.children[0]
      s.showerGroup.remove(c)
    }
    s.entities.length = 0

    const T = thickness
    const placed = layoutChain(panels, mode)

    placed.forEach((pl, i) => {
      const p = panels[i]
      const pivot = new THREE.Group()
      pivot.userData.panelIndex = i

      const geo = p.kind === 'door'
        ? new THREE.BoxGeometry(pl.w, pl.h, T)
        : makePanelGeometry(pl.w, pl.h, T, p.step, p.slopes, p.role)

      const mesh = new THREE.Mesh(geo, makeGlassMaterial())
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.add(makeEdgeLines(geo))

      if (p.kind === 'door' && p.hingeSide) {
        const hingeWorld = p.hingeSide === 'R' ? { x: pl.startX, z: pl.startZ } : { x: pl.endX, z: pl.endZ }
        pivot.position.set(hingeWorld.x, pl.h / 2, hingeWorld.z)
        pivot.rotation.y = pl.baseRotY
        mesh.position.x = p.hingeSide === 'R' ? -pl.w / 2 : +pl.w / 2
        pivot.add(mesh)

        const pinTop = makeHingePin(); pinTop.position.set(0,  pl.h * 0.42, 0); pivot.add(pinTop)
        const pinBot = makeHingePin(); pinBot.position.set(0, -pl.h * 0.42, 0); pivot.add(pinBot)
        const handle = makeHandle()
        const handleLocalX = p.hingeSide === 'R' ? -pl.w + 40 : pl.w - 40
        handle.position.set(handleLocalX, 0, T / 2 + 15)
        pivot.add(handle)

        pivot.userData.isDoor    = true
        pivot.userData.baseRotY  = pl.baseRotY
        pivot.userData.openSign  = p.hingeSide === 'R' ? +1 : -1
        pivot.userData.openAngle = 0
      } else {
        pivot.position.set(pl.centerX, pl.h / 2, pl.centerZ)
        pivot.rotation.y = pl.baseRotY
        pivot.add(mesh)

        if (p.sealLeft === 'hinge-holes') {
          const holes = makeHingeHoles(pl.h, T)
          holes.position.set(-pl.w / 2 + 6, 0, 0)
          pivot.add(holes)
        }
        if (p.sealRight === 'hinge-holes') {
          const holes = makeHingeHoles(pl.h, T)
          holes.position.set(pl.w / 2 - 6, 0, 0)
          pivot.add(holes)
        }
      }

      s.showerGroup.add(pivot)
      s.entities.push({ pivot, mesh, meta: p, w: pl.w, h: pl.h })
    })

    // Center + fit camera
    const box = new THREE.Box3().setFromObject(s.showerGroup)
    const center = new THREE.Vector3(); box.getCenter(center)
    s.showerGroup.position.x = -center.x
    s.showerGroup.position.z = -center.z
    const size = new THREE.Vector3(); box.getSize(size)
    s.view.target.set(0, Math.max(700, size.y * 0.5), 0)
    s.view.dist = Math.max(3500, Math.max(size.x, size.z, 1200) * 3.2)

    // Save layout + shower-group offset for seam projection each frame
    s.placed  = placed
    s.offsetX = -center.x
    s.offsetZ = -center.z
  }, [panels, mode, thickness])

  return <div ref={mountRef} className="w-full h-full relative cursor-grab active:cursor-grabbing" />
}

// ── Geometry / material helpers ──────────────────────────────────
function makeGlassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xc7dde9, metalness: 0, roughness: 0.05,
    transmission: 0.88, transparent: true, opacity: 0.45,
    thickness: 8, ior: 1.45,
    attenuationColor: 0x9fb9cc, attenuationDistance: 1200,
    clearcoat: 0.6, clearcoatRoughness: 0.1,
    side: THREE.DoubleSide, envMapIntensity: 1.0,
  })
}

function makeEdgeLines(geo) {
  const edges = new THREE.EdgesGeometry(geo, 1)
  return new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color: 0x64748b, transparent: true, opacity: 0.55,
  }))
}

function makeHingePin() {
  const g = new THREE.CylinderGeometry(8, 8, 80, 16)
  const m = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.85, roughness: 0.25 })
  const mesh = new THREE.Mesh(g, m)
  mesh.castShadow = true
  return mesh
}

function makeHandle() {
  const g = new THREE.BoxGeometry(14, 180, 28)
  const m = new THREE.MeshStandardMaterial({ color: 0xc0c4cb, metalness: 0.9, roughness: 0.25 })
  const mesh = new THREE.Mesh(g, m)
  mesh.castShadow = true
  return mesh
}

function makeHingeHoles(edgeH, T) {
  const group = new THREE.Group()
  const holeGeo = new THREE.CylinderGeometry(6, 6, T + 2, 10)
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.2, roughness: 0.7 })
  const span = edgeH * 0.7
  for (let i = 0; i < 5; i++) {
    const t = i / 4
    const y = -span / 2 + t * span
    const m = new THREE.Mesh(holeGeo, holeMat)
    m.rotation.x = Math.PI / 2
    m.position.set(0, y, 0)
    group.add(m)
  }
  return group
}

function makePanelGeometry(w, h, T, step, slopes, role) {
  const F = slopes?.F || 0
  const C = slopes?.C || 0
  const hasStep = step && step.w > 0 && step.h > 0
  if (!hasStep && F === 0 && C === 0) return new THREE.BoxGeometry(w, h, T)

  const pts = panelPolygon(w, h, step, slopes, role)
  const shape = new THREE.Shape()
  shape.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false })
  geo.translate(0, 0, -T / 2)
  return geo
}
