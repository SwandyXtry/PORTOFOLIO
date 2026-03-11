import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. Setup Scene, Camera, and Renderer
const canvas = document.querySelector('#bg-canvas');
const scene = new THREE.Scene();

// We want a space-like fog
scene.fog = new THREE.FogExp2(0x030014, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 25;

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 2. Add Space Elements (Stars / Particles)
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 2000;
const posArray = new Float32Array(starsCount * 3);
const colorsArray = new Float32Array(starsCount * 3);

// Define palette for stars (white, light blue, light purple)
const color1 = new THREE.Color(0xffffff); // white
const color2 = new THREE.Color(0x8B5CF6); // purple
const color3 = new THREE.Color(0x3B82F6); // blue

for(let i = 0; i < starsCount * 3; i+=3) {
    // Spherical distribution radius ~100
    const r = 40 + Math.random() * 60;
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    
    posArray[i] = r * Math.sin(phi) * Math.cos(theta);
    posArray[i+1] = r * Math.sin(phi) * Math.sin(theta);
    posArray[i+2] = r * Math.cos(phi);

    // Random colors
    const mix = Math.random();
    let starColor = color1;
    if (mix > 0.8) starColor = color2;
    if (mix < 0.2) starColor = color3;

    colorsArray[i] = starColor.r;
    colorsArray[i+1] = starColor.g;
    colorsArray[i+2] = starColor.b;
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
starsGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

const starsMaterial = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});

const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

// 2.5 Add 3D Planets
const planets = [];

const createPlanet = (radius, color, x, y, z) => {
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color, // Make the planets glow from within
        emissiveIntensity: 0.3, // Brighten them up
        roughness: 0.4,
        metalness: 0.2,
    });
    const planet = new THREE.Mesh(geometry, material);
    planet.position.set(x, y, z);
    
    // Create an outer glow (atmosphere) for the planet
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(geometry, glowMaterial);
    atmosphere.scale.set(1.2, 1.2, 1.2);
    planet.add(atmosphere);

    scene.add(planet);
    planets.push({ mesh: planet, initialX: x, initialY: y });
    return planet;
};

// Purple planet (top right)
createPlanet(8, 0x8B5CF6, 25, 15, -30);
// Blue planet (bottom left)
createPlanet(5, 0x3B82F6, -20, -10, -20);
// Cyan small planet (far left)
createPlanet(3, 0x00f0ff, -15, 20, -40);

// 3. Add a Hero 3D Object (Astronaut / Tech Placeholder)
const heroGroup = new THREE.Group();

// Load Astronaut Model
const gltfLoader = new GLTFLoader();
const astronautUrl = 'https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/Astronaut.glb';

let mixer; // For animation

gltfLoader.load(
    astronautUrl,
    (gltf) => {
        const model = gltf.scene;
        // Scale it drastically up because the raw GLB model is very small
        model.scale.set(17.0, 17.0, 17.0); // Slightly scaled down from 20.0
        
        // Add animation if present
        if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        }
        
        heroGroup.add(model);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('An error happened loading the Astronaut model', error);
    }
);

// Position it to the right for desktop, center for mobile
const isMobile = window.innerWidth < 768;
heroGroup.position.set(isMobile ? 0 : 8, isMobile ? -14 : -18, 0); // Adjusted height even lower
scene.add(heroGroup);

// 4. Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0x8B5CF6, 200, 100);
pointLight1.position.set(10, 10, 10);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x00f0ff, 200, 100);
pointLight2.position.set(-10, -10, 10);
scene.add(pointLight2);

// 5. Interaction (Mouse & Scroll)
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

let scrollY = window.scrollY;
let currentScrollY = scrollY;
window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
});

// 6. Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Smooth scroll interpolation
    currentScrollY += (scrollY - currentScrollY) * 0.1;

    // Smooth mouse interpolation
    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    // Animate Starfield slowly
    starField.rotation.y = elapsedTime * 0.02;
    starField.rotation.x = elapsedTime * 0.01;
    
    // Parallax effect on starfield based on mouse
    starField.rotation.y += 0.05 * (targetX - starField.rotation.y);
    starField.rotation.x += 0.05 * (targetY - starField.rotation.x);

    // Update Astronaut animation
    if(mixer) {
        mixer.update(0.016); // Approx 60fps delta
    }

    // Floating Up and Down based on time
    heroGroup.position.y = (isMobile ? -14 : -18) + Math.sin(elapsedTime * 1.5) * 0.5;
    
    // Add a slight rotation for floaty feel
    heroGroup.rotation.y = Math.sin(elapsedTime * 0.5) * 0.2 - 0.2;
    heroGroup.rotation.z = Math.sin(elapsedTime * 0.3) * 0.1;

    // Move slightly based on scroll to create parallax
    heroGroup.position.y += currentScrollY * 0.005;

    // Animate planets
    planets.forEach((p, index) => {
        p.mesh.rotation.y += 0.002;
        p.mesh.rotation.x += 0.001;
        // Floating effect
        p.mesh.position.y = p.initialY + Math.sin(elapsedTime * 1.0 + index) * 1.0;
        // Parallax effect based on mouse
        p.mesh.position.x += ((p.initialX + targetX * 15) - p.mesh.position.x) * 0.05;
        p.mesh.position.y += ((p.initialY + targetY * 15) - p.mesh.position.y) * 0.05;
    });

    // Camera rig movement on scroll
    camera.position.y = -(currentScrollY * 0.01);
    
    // Camera parallax on mouse move
    camera.position.x += (mouseX * 0.01 - camera.position.x) * 0.05;

    renderer.render(scene, camera);
}

animate();

// 7. Handle Resize
window.addEventListener('resize', () => {
    const mobileCheck = window.innerWidth < 768;
    heroGroup.position.set(mobileCheck ? 0 : 8, mobileCheck ? -14 : -18, 0);
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
