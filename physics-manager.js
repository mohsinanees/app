import * as THREE from './three.module.js';
import uiManager from './ui-manager.js';
import {renderer, camera} from './app-object.js';
import geometryManager from './geometry-manager.js';
// import {makeAnimalFactory} from './animal.js';
import {rigManager} from './rig.js';

const velocity = new THREE.Vector3();

const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localQuaternion2 = new THREE.Quaternion();

const physicsManager = new EventTarget();

let jumpState = false;
const getJumpState = () => jumpState;
physicsManager.getJumpState = getJumpState;
const jump = () => {
  jumpState = true;
  velocity.y += 5;
};
physicsManager.jump = jump;

const itemMeshes = [];
const addItem = (position, quaternion) => {
  const itemMesh = (() => {
    const radius = 0.5;
    const segments = 12;
    const color = 0x66bb6a;
    const opacity = 0.5;

    const object = new THREE.Object3D();

    const matMeshes = [woodMesh, stoneMesh, metalMesh];
    const matIndex = Math.floor(Math.random() * matMeshes.length);
    const matMesh = matMeshes[matIndex];
    const matMeshClone = matMesh.clone();
    matMeshClone.position.y = 0.5;
    matMeshClone.visible = true;
    matMeshClone.isBuildMesh = true;
    object.add(matMeshClone);

    const skirtGeometry = new THREE.CylinderBufferGeometry(radius, radius, radius, segments, 1, true)
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0, radius / 2, 0));
    const ys = new Float32Array(skirtGeometry.attributes.position.array.length / 3);
    for (let i = 0; i < skirtGeometry.attributes.position.array.length / 3; i++) {
      ys[i] = 1 - skirtGeometry.attributes.position.array[i * 3 + 1] / radius;
    }
    skirtGeometry.setAttribute('y', new THREE.BufferAttribute(ys, 1));
    // skirtGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -0.5, 0));
    const skirtMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uAnimation: {
          type: 'f',
          value: 0,
        },
      },
      vertexShader: `\
        #define PI 3.1415926535897932384626433832795

        uniform float uAnimation;
        attribute float y;
        attribute vec3 barycentric;
        varying float vY;
        varying float vUv;
        varying float vOpacity;
        void main() {
          vY = y * ${opacity.toFixed(8)};
          vUv = uv.x + uAnimation;
          vOpacity = 0.5 + 0.5 * (sin(uAnimation*20.0*PI*2.0)+1.0)/2.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `\
        #define PI 3.1415926535897932384626433832795

        uniform sampler2D uCameraTex;
        varying float vY;
        varying float vUv;
        varying float vOpacity;

        vec3 c = vec3(${new THREE.Color(color).toArray().join(', ')});

        void main() {
          float a = vY * (0.9 + 0.1 * (sin(vUv*PI*2.0/0.02) + 1.0)/2.0) * vOpacity;
          gl_FragColor = vec4(c, a);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      // blending: THREE.CustomBlending,
    });
    const skirtMesh = new THREE.Mesh(skirtGeometry, skirtMaterial);
    skirtMesh.frustumCulled = false;
    skirtMesh.isBuildMesh = true;
    object.add(skirtMesh);

    let animation = null;
    object.pickUp = () => {
      if (!animation) {
        skirtMesh.visible = false;

        const now = Date.now();
        const startTime = now;
        const endTime = startTime + 1000;
        const startPosition = object.position.clone();
        animation = {
          update(posePosition) {
            const now = Date.now();
            const factor = Math.min((now - startTime) / (endTime - startTime), 1);

            if (factor < 0.5) {
              const localFactor = factor / 0.5;
              object.position.copy(startPosition)
                .lerp(posePosition, cubicBezier(localFactor));
            } else if (factor < 1) {
              const localFactor = (factor - 0.5) / 0.5;
              object.position.copy(posePosition);
            } else {
              object.parent.remove(object);
              itemMeshes.splice(itemMeshes.indexOf(object), 1);
              animation = null;
            }
          },
        };
      }
    };
    object.update = posePosition => {
      if (!animation) {
        const now = Date.now();
        skirtMaterial.uniforms.uAnimation.value = (now % 60000) / 60000;
        matMeshClone.rotation.y = (now % 5000) / 5000 * Math.PI * 2;
      } else {
        animation.update(posePosition);
      }
    };

    return object;
  })();
  itemMesh.position.copy(position).applyMatrix4(currentVegetationMesh.matrixWorld);
  itemMesh.quaternion.copy(quaternion);
  scene.add(itemMesh);
  itemMeshes.push(itemMesh);
};
physicsManager.addItem = addItem;

const makeAnimal = null;
const animals = [];
physicsManager.animals = animals;

const _applyGravity = timeDiff => {
  localVector.set(0, -9.8, 0);
  localVector.multiplyScalar(timeDiff);
  velocity.add(localVector);

  const terminalVelocity = 50;
  const _clampToTerminalVelocity = v => Math.min(Math.max(v, -terminalVelocity), terminalVelocity);
  velocity.x = _clampToTerminalVelocity(velocity.x * 0.7);
  velocity.z = _clampToTerminalVelocity(velocity.z * 0.7);
  velocity.y = _clampToTerminalVelocity(velocity.y);
};
const _applyAvatarPhysics = (camera, avatarOffset, cameraBasedOffset, velocityAvatarDirection, updateRig, timeDiff) => {
  const oldVelocity = localVector3.copy(velocity);

  _applyVelocity(camera.position, velocity, timeDiff);
  camera.updateMatrixWorld();
  camera.matrixWorld.decompose(localVector, localQuaternion, localVector2);
  if (avatarOffset) {
    localVector4.copy(avatarOffset);
  } else {
    localVector4.set(0, 0, 0);
  }
  if (cameraBasedOffset) {
    localVector4.applyQuaternion(localQuaternion);
  }
  localVector.add(localVector4);
  const collision = _collideCapsule(localVector, localQuaternion2.set(0, 0, 0, 1));
  if (velocityAvatarDirection && oldVelocity.lengthSq() > 0) {
    localQuaternion.setFromUnitVectors(localVector4.set(0, 0, -1), localVector5.set(oldVelocity.x, 0, oldVelocity.z).normalize());
  }

  if (collision) {
    localVector4.fromArray(collision.direction);
    camera.position.add(localVector4);
    localVector.add(localVector4);
    if (collision.grounded) {
      velocity.y = 0;
      jumpState = false;
    } else {
      jumpState = true;
    }
  } else {
    jumpState = true;
  }
  localMatrix.compose(localVector, localQuaternion, localVector2);

  rigManager.setLocalRigMatrix(updateRig ? localMatrix : null);

  if (rigManager.localRig) {
    if (jumpState) {
      rigManager.localRig.setFloorHeight(-0xFFFFFF);
    } else {
      rigManager.localRig.setFloorHeight(localVector.y - _getAvatarHeight());
    }
  }

  _collideItems(localMatrix);
  _collideChunk(localMatrix);
  camera.updateMatrixWorld();
};
const _collideCapsule = (() => {
  const localVector = new THREE.Vector3();
  return (p, q) => {
    localVector.copy(p);
    localVector.y -= 0.3;
    return geometryWorker ? geometryWorker.collide(tracker, 0.5, 0.5, localVector, q, 1) : null;
  };
})();
const _applyVelocity = (() => {
  const localVector = new THREE.Vector3();
  return (position, velocity, timeDiff) => {
    position.add(localVector.copy(velocity).multiplyScalar(timeDiff));
  };
})();
const _collideItems = matrix => {
  matrix.decompose(localVector3, localQuaternion2, localVector4);

  uiManager.hpMesh.position.lerp(localVector4.copy(localVector3).add(localVector5.set(0, 0.25, -1).applyQuaternion(localQuaternion2)), 0.1);
  uiManager.hpMesh.quaternion.slerp(localQuaternion2, 0.1);

  localVector4.copy(localVector3).add(localVector5.set(0, -1, 0));
  for (let i = 0; i < itemMeshes.length; i++) {
    const itemMesh = itemMeshes[i];
    if (itemMesh.getWorldPosition(localVector5).distanceTo(localVector4) < 1) {
      itemMesh.pickUp();
    }
    itemMesh.update(localVector3);
  }

  for (const animal of animals) {
    if (!animal.isHeadAnimating()) {
      animal.lookAt(localVector3);
    }
  }
};
const _collideChunk = matrix => {
  matrix.decompose(localVector3, localQuaternion2, localVector4);
  geometryManager.currentChunkMesh.update(localVector3);
};

const _updatePhysics = () => {
  const xrCamera = renderer.xr.getSession() ? renderer.xr.getCamera(camera) : camera;
  if (renderer.xr.getSession()) {
    /* let walked = false;
    const inputSources = Array.from(currentSession.inputSources);
    for (let i = 0; i < inputSources.length; i++) {
      const inputSource = inputSources[i];
      const {handedness, gamepad} = inputSource;
      if (gamepad && gamepad.buttons.length >= 2) {
        const index = handedness === 'right' ? 1 : 0;

        // axes
        const {axes: axesSrc, buttons: buttonsSrc} = gamepad;
        const axes = [
          axesSrc[0] || 0,
          axesSrc[1] || 0,
          axesSrc[2] || 0,
          axesSrc[3] || 0,
        ];
        const buttons = [
          buttonsSrc[0] ? buttonsSrc[0].value : 0,
          buttonsSrc[1] ? buttonsSrc[1].value : 0,
          buttonsSrc[2] ? buttonsSrc[2].value : 0,
          buttonsSrc[3] ? buttonsSrc[3].value : 0,
          buttonsSrc[4] ? buttonsSrc[4].value : 0,
          buttonsSrc[5] ? buttonsSrc[4].value : 0,
        ];
        if (handedness === 'left') {
          const dx = axes[0] + axes[2];
          const dy = axes[1] + axes[3];
          if (Math.abs(dx) >= 0.01 || Math.abs(dx) >= 0.01) {
            localEuler.setFromQuaternion(xrCamera.quaternion, 'YXZ');
            localEuler.x = 0;
            localEuler.z = 0;
            localVector3.set(dx, 0, dy)
              .applyEuler(localEuler)
              .multiplyScalar(0.05);

            dolly.matrix
              // .premultiply(localMatrix2.makeTranslation(-xrCamera.position.x, -xrCamera.position.y, -xrCamera.position.z))
              .premultiply(localMatrix3.makeTranslation(localVector3.x, localVector3.y, localVector3.z))
              // .premultiply(localMatrix2.getInverse(localMatrix2))
              .decompose(dolly.position, dolly.quaternion, dolly.scale);
            walked = true;
          }
          
          currentWeaponGrabs[1] = buttons[1] > 0.5;
        } else if (handedness === 'right') {
          const _applyRotation = r => {
            dolly.matrix
              .premultiply(localMatrix2.makeTranslation(-xrCamera.position.x, -xrCamera.position.y, -xrCamera.position.z))
              .premultiply(localMatrix3.makeRotationFromQuaternion(localQuaternion2.setFromAxisAngle(localVector3.set(0, 1, 0), r)))
              .premultiply(localMatrix2.getInverse(localMatrix2))
              .decompose(dolly.position, dolly.quaternion, dolly.scale);
          };
          if (
            (axes[0] < -0.75 && !(lastAxes[index][0] < -0.75)) ||
            (axes[2] < -0.75 && !(lastAxes[index][2] < -0.75))
          ) {
            _applyRotation(Math.PI * 0.2);
          } else if (
            (axes[0] > 0.75 && !(lastAxes[index][0] > 0.75)) ||
            (axes[2] > 0.75 && !(lastAxes[index][2] > 0.75))
          ) {
            _applyRotation(-Math.PI * 0.2);
          }
          currentTeleport = (axes[1] < -0.75 || axes[3] < -0.75);
          currentMenuDown = (axes[1] > 0.75 || axes[3] > 0.75);

          currentWeaponDown = buttonsSrc[0].pressed;
          currentWeaponValue = buttons[0];
          currentWeaponGrabs[0] = buttonsSrc[1].pressed;

          if (
            buttons[2] >= 0.5 && lastButtons[index][2] < 0.5 &&
            !(Math.abs(axes[0]) > 0.5 || Math.abs(axes[1]) > 0.5 || Math.abs(axes[2]) > 0.5 || Math.abs(axes[3]) > 0.5) &&
            !jumpState
          ) {
            jump();
          }
        }

        lastAxes[index][0] = axes[0];
        lastAxes[index][1] = axes[1];
        lastAxes[index][2] = axes[2];
        lastAxes[index][3] = axes[3];
        
        lastButtons[index][0] = buttons[0];
        lastButtons[index][1] = buttons[1];
        lastButtons[index][2] = buttons[2];
        lastButtons[index][3] = buttons[3];
        lastButtons[index][4] = buttons[4];
      }
    }
    
    if (currentMenuDown) {
      const rightInputSource = inputSources.find(inputSource => inputSource.handedness === 'right');
      const pose = rightInputSource && frame.getPose(rightInputSource.targetRaySpace, renderer.xr.getReferenceSpace());
      if (pose) {
        localMatrix2.fromArray(pose.transform.matrix)
          .premultiply(dolly.matrix)
          .decompose(localVector, localQuaternion, localVector2);
        if (!lastSelector) {
          toolsMesh.position.copy(localVector);
          localEuler.setFromQuaternion(localQuaternion, 'YXZ');
          localEuler.x = 0;
          localEuler.z = 0;
          toolsMesh.quaternion.setFromEuler(localEuler);
        }
        toolsMesh.update(localVector);
        toolsMesh.visible = true;
      } else {
        toolsMesh.visible = false;
      }
    } else {
      toolsMesh.visible = false;
    } */

    _applyGravity(timeDiff);

    if (walked || jumpState) {
      localObject.matrix.copy(xrCamera.matrix)
        .premultiply(dolly.matrix)
        .decompose(localObject.position, localObject.quaternion, localObject.scale);
      const originalPosition = localObject.position.clone();

      _applyAvatarPhysics(localObject, null, false, false, false, timeDiff);

      dolly.position.add(
        localObject.position.clone().sub(originalPosition)
      );
    } else {
      velocity.y = 0;
      localMatrix.copy(xrCamera.matrix)
        .premultiply(dolly.matrix);
      _collideItems(localMatrix);
      _collideChunk(localMatrix);
      rigManager.setLocalRigMatrix(null);
    }
  } else if (document.pointerLockElement) {
    /* const speed = 100 * (keys.shift ? 3 : 1);
    const cameraEuler = camera.rotation.clone();
    cameraEuler.x = 0;
    cameraEuler.z = 0;
    localVector.set(0, 0, 0);
    if (keys.left) {
      localVector.add(new THREE.Vector3(-1, 0, 0).applyEuler(cameraEuler));
    }
    if (keys.right) {
      localVector.add(new THREE.Vector3(1, 0, 0).applyEuler(cameraEuler));
    }
    if (keys.up) {
      localVector.add(new THREE.Vector3(0, 0, -1).applyEuler(cameraEuler));
    }
    if (keys.down) {
      localVector.add(new THREE.Vector3(0, 0, 1).applyEuler(cameraEuler));
    }
    if (localVector.length() > 0) {
      localVector.normalize().multiplyScalar(speed);
    }
    localVector.multiplyScalar(timeDiff);
    velocity.add(localVector); */

    _applyGravity(timeDiff);

    if (selectedTool === 'firstperson') {
      _applyAvatarPhysics(camera, null, false, false, false, timeDiff);
    } else if (selectedTool === 'thirdperson') {
      _applyAvatarPhysics(camera, avatarCameraOffset, true, true, true, timeDiff);
    } else if (selectedTool === 'isometric') {
      _applyAvatarPhysics(camera, isometricCameraOffset, true, true, true, timeDiff);
    } else if (selectedTool === 'birdseye') {
      _applyAvatarPhysics(camera, new THREE.Vector3(0, -birdsEyeHeight + _getAvatarHeight(), 0), false, true, true, timeDiff);
    } else {
      _collideItems(camera.matrix);
      _collideChunk(camera.matrix);
      rigManager.setLocalRigMatrix(null);
    }
  } else {
    _collideItems(camera.matrix);
    _collideChunk(camera.matrix);
    rigManager.setLocalRigMatrix(null);
  }

  /* const _updateAnimals = () => {
    for (const animal of animals) {
      animal.update();
    }
  };
  _updateAnimals(); */
};
physicsManager.update = _updatePhysics;

export default physicsManager;