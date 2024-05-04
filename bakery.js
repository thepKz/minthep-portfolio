const loading = document.querySelector('#loader')

const canvas = document.querySelector('.webgl')
const scene = new THREE.Scene()
const textureLoader = new THREE.TextureLoader()
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// Base camera
const camera = new THREE.PerspectiveCamera(10, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 28
camera.position.y = 6
camera.position.z = 25
scene.add(camera)

//Controls
const controls = new THREE.OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enableZoom = true
controls.enablePan = true
controls.minDistance = 30
controls.maxDistance = 80
controls.minPolarAngle = Math.PI / 5
controls.maxPolarAngle = Math.PI / 2

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputEncoding = THREE.sRGBEncoding

// Materials
const bakedTexture = textureLoader.load('https://rawcdn.githack.com/ricardoolivaalonso/ThreeJS-Room10/a58985d7d47b6e294f1e7c54c654b0b0636df69c/dist/baked-01.jpg')
bakedTexture.flipY = false
bakedTexture.encoding = THREE.sRGBEncoding


const bakedTexture2 = textureLoader.load('https://rawcdn.githack.com/ricardoolivaalonso/ThreeJS-Room10/a58985d7d47b6e294f1e7c54c654b0b0636df69c/dist/baked-02.jpg')
bakedTexture2.flipY = false
bakedTexture2.encoding = THREE.sRGBEncoding

const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })
const bakedMaterial2 = new THREE.MeshBasicMaterial({ map: bakedTexture2})

//Loader
const loader = new THREE.GLTFLoader()
loader.load('https://rawcdn.githack.com/ricardoolivaalonso/ThreeJS-Room10/a58985d7d47b6e294f1e7c54c654b0b0636df69c/dist/model-01.glb',
    (gltf) => {
        const model = gltf.scene
        model.traverse( child => child.material = bakedMaterial )
        scene.add(model)
    },
    ( xhr ) => {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' )
    }
)
loader.load('https://rawcdn.githack.com/ricardoolivaalonso/ThreeJS-Room10/a58985d7d47b6e294f1e7c54c654b0b0636df69c/dist/model-02.glb',
    (gltf) => {
        const model = gltf.scene
        model.traverse( child => child.material = bakedMaterial2 )
        scene.add(model)
		loading.style.display = 'none'
    },
    ( xhr ) => {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' )
    }
)


window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})
// Animation

var minPan = new THREE.Vector3( -2, -.5, -2 )
var maxPan = new THREE.Vector3( 2, .5, 2 )

const tick = () => {
    controls.update()
	controls.target.clamp( minPan, maxPan )
    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()
