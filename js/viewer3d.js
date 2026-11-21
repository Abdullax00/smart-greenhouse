/**
 * Умная Теплица — 3D Просмотрщик (Three.js WebGL)
 * Загрузка и интерактивное управление 3D-моделью
 */

class GreenhouseViewer3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.loaderElement = document.getElementById('modelLoader');
    this.autoRotate = true;
    this.isWireframe = false;
    this.modelGroup = null;
    this.defaultCameraPos = new THREE.Vector3(12, 8, 15);
    this.defaultTarget = new THREE.Vector3(0, 2, 0);

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.copy(this.defaultCameraPos);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 1.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't go too far under ground
    this.controls.minDistance = 3;
    this.controls.maxDistance = 50;
    this.controls.target.copy(this.defaultTarget);

    // Lights
    this.setupLights();

    // Ground Grid & Shadow Plane
    this.setupEnvironment();

    // Load Model
    this.loadModel();

    // Event Listeners
    window.addEventListener('resize', () => this.onResize());
    this.bindControls();

    // Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLights() {
    // Soft Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    // Main Sun Directional Light
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.8);
    sunLight.position.set(25, 35, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.bias = -0.0005;
    const d = 25;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    // Fill Light (Sky bounce)
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d6746, 0.7);
    hemiLight.position.set(0, 40, 0);
    this.scene.add(hemiLight);

    // Back rim light
    const rimLight = new THREE.DirectionalLight(0xa2ffa5, 0.8);
    rimLight.position.set(-20, 20, -20);
    this.scene.add(rimLight);
  }

  setupEnvironment() {
    // Subtle circular ground shadow catcher
    const shadowGeo = new THREE.PlaneGeometry(60, 60);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.02;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);

    // Architectural grid helper
    const grid = new THREE.GridHelper(50, 50, 0x1c4a32, 0xa0c5b5);
    grid.position.y = 0;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  loadModel() {
    const glbUrl = '3D модель/Мой первый 3Д.glb';
    const objUrl = '3D модель/Мой первый 3Д.obj';

    if (typeof THREE.GLTFLoader !== 'undefined') {
      const loader = new THREE.GLTFLoader();
      loader.load(
        glbUrl,
        (gltf) => {
          this.onModelLoaded(gltf.scene);
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            const text = document.querySelector('.loader-text');
            if (text) text.textContent = `Загрузка 3D модели... ${percent}%`;
          }
        },
        (error) => {
          console.warn('GLTFLoader failed or blocked by CORS (file://), trying OBJLoader...', error);
          this.loadObjFallback(objUrl);
        }
      );
    } else {
      this.loadObjFallback(objUrl);
    }
  }

  loadObjFallback(objUrl) {
    if (typeof THREE.OBJLoader !== 'undefined') {
      const objLoader = new THREE.OBJLoader();
      objLoader.load(
        objUrl,
        (obj) => {
          this.onModelLoaded(obj);
        },
        null,
        (err) => {
          console.error('All 3D model loaders failed:', err);
          this.showFallbackMessage();
        }
      );
    } else {
      this.showFallbackMessage();
    }
  }

  onModelLoaded(model) {
    this.modelGroup = model;

    // Enable shadows and enhance materials
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Enhance materials
        if (child.material) {
          child.material.side = THREE.DoubleSide;
          if (child.material.name && child.material.name.toLowerCase().includes('glass')) {
            child.material.transparent = true;
            child.material.opacity = 0.55;
            child.material.roughness = 0.1;
            child.material.metalness = 0.2;
          }
        }
      }
    });

    // Auto-center and fit to scene
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.x -= center.x;
    model.position.y -= box.min.y; // Place feet on ground
    model.position.z -= center.z;

    this.scene.add(model);

    // Adjust camera based on bounding box
    const maxDim = Math.max(size.x, size.y, size.z);
    const cameraDist = maxDim * 1.6;
    this.defaultCameraPos.set(cameraDist * 0.8, cameraDist * 0.6, cameraDist * 0.9);
    this.camera.position.copy(this.defaultCameraPos);
    this.defaultTarget.set(0, size.y * 0.45, 0);
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();

    // Hide fallback image and loader
    const fallbackImg = document.getElementById('model3dFallback');
    if (fallbackImg) {
      fallbackImg.style.opacity = '0';
    }
    if (this.loaderElement) {
      this.loaderElement.classList.add('hidden');
    }
  }

  showFallbackMessage() {
    if (this.loaderElement) {
      this.loaderElement.classList.add('hidden');
    }
    // Add unobtrusive hint for local server
    const card = document.querySelector('.model-card');
    if (card && !document.getElementById('corsNotice')) {
      const notice = document.createElement('div');
      notice.id = 'corsNotice';
      notice.style.cssText = `
        position: absolute;
        top: 20px;
        left: 20px;
        background: rgba(11, 32, 20, 0.85);
        color: #ffffff;
        backdrop-filter: blur(10px);
        padding: 8px 16px;
        border-radius: 99px;
        font-size: 0.8rem;
        font-weight: 600;
        z-index: 25;
        border: 1px solid rgba(162, 255, 165, 0.4);
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      `;
      notice.innerHTML = '✨ 3D превью | Для вращения в WebGL запустите <b>start_site.bat</b>';
      card.appendChild(notice);
    }
  }

  bindControls() {
    const btnSpin = document.getElementById('btnAutoSpin');
    const btnWireframe = document.getElementById('btnWireframe');
    const btnReset = document.getElementById('btnResetView');
    const btnFullscreen = document.getElementById('btnFullscreen3d');

    if (btnSpin) {
      btnSpin.addEventListener('click', () => {
        this.autoRotate = !this.autoRotate;
        this.controls.autoRotate = this.autoRotate;
        btnSpin.classList.toggle('active', this.autoRotate);
      });
    }

    if (btnWireframe) {
      btnWireframe.addEventListener('click', () => {
        this.isWireframe = !this.isWireframe;
        btnWireframe.classList.toggle('active', this.isWireframe);
        if (this.modelGroup) {
          this.modelGroup.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.wireframe = this.isWireframe;
            }
          });
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.camera.position.copy(this.defaultCameraPos);
        this.controls.target.copy(this.defaultTarget);
        this.controls.update();
      });
    }

    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        const card = document.querySelector('.model-card');
        if (!document.fullscreenElement) {
          card.requestFullscreen().catch(err => console.log(err));
        } else {
          document.exitFullscreen();
        }
      });
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize when libraries are loaded
window.addEventListener('load', () => {
  if (typeof THREE !== 'undefined') {
    new GreenhouseViewer3D('canvas-3d-container');
  }
});
