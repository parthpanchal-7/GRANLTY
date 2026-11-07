import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

@Component({
  selector: 'app-three-stage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #canvasMount
      data-testid="three-daylight-stage"
      class="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    ></div>
  `,
})
export class ThreeStage implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly scrollProgress = input<number>(0);

  private readonly canvasMountRef = viewChild.required<ElementRef<HTMLDivElement>>('canvasMount');

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private gyroGroup?: THREE.Group;
  private latticeGroup?: THREE.Group;
  private crownGroup?: THREE.Group;

  private frameId = 0;
  private renderBusy = false;
  private renderDirty = false;
  private isSoftwareGl = false;

  private pointerTarget = { x: 0, y: 0 };
  private pointerCurrent = { x: 0, y: 0 };
  private scrollTarget = 0;
  private scrollCurrent = 0;

  private readonly onPointerMove = (e: PointerEvent) => {
    this.pointerTarget.x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    this.pointerTarget.y = -(e.clientY / Math.max(1, window.innerHeight)) * 2 + 1;
    this.requestRender();
  };

  private readonly onScroll = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.scrollTarget = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    this.requestRender();
  };

  private readonly onResize = () => {
    if (!this.renderer || !this.camera) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.requestRender();
  };

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.initThreeStage();
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    }
    this.renderer?.dispose();
  }

  private initThreeStage(): void {
    const mount = this.canvasMountRef().nativeElement;

    this.isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    this.renderer = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xf4f6fa, 1);
    renderer.shadowMap.enabled = !this.isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    this.scene = scene;
    scene.background = new THREE.Color(0xf4f6fa);
    scene.fog = new THREE.FogExp2(0xf4f6fa, 0.032);

    // Studio Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      100
    );
    camera.position.set(0, 0.4, 13.5);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    // 3-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xdce2ee, 0.95);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffcf5, 1.8);
    keyLight.position.set(7, 10, 8);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const cobaltRimLight = new THREE.DirectionalLight(0x2b44ff, 1.35);
    cobaltRimLight.position.set(-8, -4, 5);
    scene.add(cobaltRimLight);

    // Shared Studio Materials (Varied roughness >= 0.25 across parts)
    const porcelainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.06,
    });

    const brushedTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0xdce2ee,
      roughness: 0.24,
      metalness: 0.85,
    });

    const cobaltRefractiveMat = new THREE.MeshPhysicalMaterial({
      color: 0x2b44ff,
      roughness: 0.12,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transmission: this.isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.55 : 0.96,
      ior: 1.54,
      thickness: 1.2,
      attenuationColor: new THREE.Color(0x6366f1),
      attenuationDistance: 2.2,
    });

    const indigoAccentMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      roughness: 0.35,
      metalness: 0.45,
    });

    const shadowDiscGeo = new THREE.CircleGeometry(1.8, 32);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0xdce2ee,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });

    // 1. Left-Flank Composite Sculpture: Orbital Scholarship Gyroscope (8 distinct parts)
    const gyroGroup = new THREE.Group();
    gyroGroup.position.set(-5.2, 1.4, -1.5);

    const outerPorcelainTorus = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.22, 24, 64),
      porcelainMat
    );
    gyroGroup.add(outerPorcelainTorus);

    const middleCobaltRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.16, 24, 56),
      cobaltRefractiveMat
    );
    middleCobaltRing.rotation.x = Math.PI / 3;
    gyroGroup.add(middleCobaltRing);

    const innerTitaniumGimbal = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.07, 16, 48),
      brushedTitaniumMat
    );
    innerTitaniumGimbal.rotation.y = Math.PI / 4;
    gyroGroup.add(innerTitaniumGimbal);

    const coreOctahedron = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.46, 0),
      indigoAccentMat
    );
    gyroGroup.add(coreOctahedron);

    const axialSpindle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 3.4, 16),
      brushedTitaniumMat
    );
    axialSpindle.rotation.z = Math.PI / 4;
    gyroGroup.add(axialSpindle);

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const satNode = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), porcelainMat);
      satNode.position.set(Math.cos(angle) * 1.65, Math.sin(angle) * 1.65, 0.22);
      gyroGroup.add(satNode);
    }

    const leftShadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    leftShadowDisc.rotation.x = -Math.PI / 2;
    leftShadowDisc.position.set(0, -2.35, 0);
    gyroGroup.add(leftShadowDisc);

    scene.add(gyroGroup);
    this.gyroGroup = gyroGroup;

    // 2. Right-Flank Composite Sculpture: Prismatic Merit Lattice (7 distinct parts)
    const latticeGroup = new THREE.Group();
    latticeGroup.position.set(5.3, -0.6, -1.8);

    const mainArchRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.26, 24, 64),
      porcelainMat
    );
    mainArchRing.rotation.y = -0.45;
    latticeGroup.add(mainArchRing);

    const cobaltCrossTorus = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.18, 24, 56),
      cobaltRefractiveMat
    );
    cobaltCrossTorus.rotation.x = Math.PI / 2.2;
    latticeGroup.add(cobaltCrossTorus);

    const centerFacetedHub = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.52, 0),
      brushedTitaniumMat
    );
    latticeGroup.add(centerFacetedHub);

    for (let i = 0; i < 3; i++) {
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.32 + i * 0.14, 0.035, 12, 32),
        indigoAccentMat
      );
      collar.position.y = (i - 1) * 0.55;
      collar.rotation.x = Math.PI / 2;
      latticeGroup.add(collar);
    }

    const rightShadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    rightShadowDisc.rotation.x = -Math.PI / 2;
    rightShadowDisc.position.set(0, -2.2, 0);
    latticeGroup.add(rightShadowDisc);

    scene.add(latticeGroup);
    this.latticeGroup = latticeGroup;

    // 3. Upper-Center Crown Equilibrium Node (6 distinct parts)
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 3.3, -3.2);

    const crownHoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.09, 20, 48),
      porcelainMat
    );
    crownHoop.rotation.x = Math.PI / 2.6;
    crownGroup.add(crownHoop);

    const crownCobaltCore = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.11, 20, 40),
      cobaltRefractiveMat
    );
    crownGroup.add(crownCobaltCore);

    for (let i = 0; i < 4; i++) {
      const theta = (i * Math.PI) / 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.08), brushedTitaniumMat);
      fin.position.set(Math.cos(theta) * 0.95, Math.sin(theta) * 0.95, 0);
      crownGroup.add(fin);
    }

    scene.add(crownGroup);
    this.crownGroup = crownGroup;

    if (!this.isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    this.requestRender();
  }

  private afterDraw(cb: () => void): void {
    if (!this.renderer) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private requestRender(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      this.renderDirty = false;
      this.stepKinematics();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      const done = () => {
        this.renderBusy = false;
        const dx = Math.abs(this.pointerTarget.x - this.pointerCurrent.x);
        const dy = Math.abs(this.pointerTarget.y - this.pointerCurrent.y);
        const ds = Math.abs(this.scrollTarget - this.scrollCurrent);
        if (this.renderDirty || dx > 0.01 || dy > 0.01 || ds > 0.005) {
          this.requestRender();
        }
      };
      if (this.isSoftwareGl) {
        this.afterDraw(done);
      } else {
        done();
      }
    });
  }

  private stepKinematics(): void {
    const dampFactor = this.isSoftwareGl ? 0.35 : 0.14;
    this.pointerCurrent.x += (this.pointerTarget.x - this.pointerCurrent.x) * dampFactor;
    this.pointerCurrent.y += (this.pointerTarget.y - this.pointerCurrent.y) * dampFactor;
    this.scrollCurrent += (this.scrollTarget - this.scrollCurrent) * dampFactor;

    const px = this.pointerCurrent.x;
    const py = this.pointerCurrent.y;
    const sc = this.scrollCurrent;

    if (this.gyroGroup) {
      this.gyroGroup.rotation.y = 0.35 + px * 0.45 + sc * Math.PI * 1.4;
      this.gyroGroup.rotation.x = 0.25 + py * 0.3 + sc * 0.8;
      this.gyroGroup.position.set(-4.6, 0.6 + sc * 0.8 + py * 0.25, -1.2);
    }

    if (this.latticeGroup) {
      this.latticeGroup.rotation.y = -0.4 + px * 0.4 - sc * Math.PI * 1.2;
      this.latticeGroup.rotation.z = 0.2 + py * 0.25 + sc * 0.9;
      this.latticeGroup.position.set(4.5, 0.8 - sc * 0.6 - py * 0.2, -1.2);
    }

    if (this.crownGroup) {
      this.crownGroup.rotation.z = sc * Math.PI * 2 + px * 0.3;
      this.crownGroup.rotation.x = 0.5 + py * 0.2;
      this.crownGroup.position.set(0.4, 2.2 - sc * 0.5, -2.5);
    }
  }
}
