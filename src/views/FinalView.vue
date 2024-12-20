<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'

// MediaPipe 전역 변수 선언
declare const Camera: any;
declare const FaceMesh: any;

const router = useRouter()
const store = useFilterStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const clothesImageRef = ref<HTMLImageElement | null>(null)
const hatImageRef = ref<HTMLImageElement | null>(null)
const borderImageRef = ref<HTMLImageElement | null>(null)
const characterImageRef = ref<HTMLImageElement | null>(null)
let faceMesh: any = null
let faces: any[] = []
let previousFace: any = null
const smoothingFactor = 0.2
let lastProcessTime = 0
const processInterval = 1000 / 30

// 옷 이미지 매핑
const clothesImages: Record<number, () => Promise<typeof import('*.png')>> = {
  1: () => import('@/assets/clothes/traditional.png')
}

// 모자 이미지 매핑
const hatImages: Record<number, () => Promise<typeof import('*.png')>> = {
  1: () => import('@/assets/hats/traditional.png')
}

// 테두리 이미지 매핑
const borderImages: Record<number, () => Promise<typeof import('*.png')>> = {
  1: () => import('@/assets/borders/border1.png'),
  2: () => import('@/assets/borders/border2.png'),
  3: () => import('@/assets/borders/border3.png'),
  4: () => import('@/assets/borders/border4.png')
}

// 캐릭터 이미지 매핑
const characterImages: Record<number, () => Promise<typeof import('*.png')>> = {
  1: () => import('@/assets/characters/character1.png')
}

// Face Mesh 초기화
const initializeFaceMesh = async () => {
  try {
    faceMesh = new FaceMesh({
      locateFile: (file: string) => {
        console.log('Loading MediaPipe file:', file);
        if (file.endsWith('wasm')) {
          return `/mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.wasm`;
        }
        return `/mediapipe/face_mesh/${file}`;
      }
    });

    console.log('FaceMesh instance created');

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
      selfieMode: false
    });

    console.log('FaceMesh options set');

    faceMesh.onResults((results: any) => {
      const now = Date.now()
      if (now - lastProcessTime < processInterval) return
      lastProcessTime = now

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0]
        
        // 얼굴 바운딩 박스 계산
        let minX = 1, minY = 1, maxX = 0, maxY = 0
        landmarks.forEach((landmark: any) => {
          minX = Math.min(minX, landmark.x)
          minY = Math.min(minY, landmark.y)
          maxX = Math.max(maxX, landmark.x)
          maxY = Math.max(maxY, landmark.y)
        })

        const currentFace = {
          boundingBox: {
            xCenter: (minX + maxX) / 2,
            yCenter: (minY + maxY) / 2,
            width: maxX - minX,
            height: maxY - minY
          }
        }

        if (previousFace) {
          currentFace.boundingBox.xCenter = 
            previousFace.boundingBox.xCenter * (1 - smoothingFactor) + 
            currentFace.boundingBox.xCenter * smoothingFactor
          
          currentFace.boundingBox.yCenter = 
            previousFace.boundingBox.yCenter * (1 - smoothingFactor) + 
            currentFace.boundingBox.yCenter * smoothingFactor
          
          currentFace.boundingBox.width = 
            previousFace.boundingBox.width * (1 - smoothingFactor) + 
            currentFace.boundingBox.width * smoothingFactor
          
          currentFace.boundingBox.height = 
            previousFace.boundingBox.height * (1 - smoothingFactor) + 
            currentFace.boundingBox.height * smoothingFactor
        }
        
        faces = [currentFace]
        previousFace = {...currentFace}
      } else if (previousFace) {
        faces = [previousFace]
      } else {
        faces = []
      }
    });

    console.log('Starting FaceMesh initialization');
    await faceMesh.initialize();
    console.log('FaceMesh initialization complete');
  } catch (error) {
    console.error('FaceMesh initialization error:', error);
    throw error;
  }
}

// 이미지 압축
const compressImage = (canvas: HTMLCanvasElement, quality = 0.8, maxWidth = 1920) => {
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return null

  let width = canvas.width
  let height = canvas.height

  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  tempCanvas.width = width
  tempCanvas.height = height

  tempCtx.imageSmoothingEnabled = true
  tempCtx.imageSmoothingQuality = 'high'
  tempCtx.drawImage(canvas, 0, 0, width, height)

  return tempCanvas.toDataURL('image/jpeg', quality)
}

// 이미지 저장
const saveImage = () => {
  if (!canvasRef.value) return

  try {
    const compressedImage = compressImage(canvasRef.value, 0.8)
    if (!compressedImage) return

    const link = document.createElement('a')
    link.download = 'photo.jpg'
    link.href = compressedImage
    link.click()
  } catch (error) {
    console.error('이미지 저장 오류:', error)
  }
}

// 세멘테이션 결과 처리
const onResults = (results: any) => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  try {
    ctx.clearRect(0, 0, width, height)
    
    // 카메라 화면 그리기 (반전 없이)
    ctx.drawImage(videoRef.value!, 0, 0, width, height)

    // 테두리 그리기
    if (borderImageRef.value && store.selectedBorder) {
      ctx.drawImage(
        borderImageRef.value,
        0,
        0,
        width,
        height
      )
    }

    // 옷릭터가 선택된 경우 캐릭터만 그리기
    if (characterImageRef.value && store.selectedCharacter) {
      const characterWidth = width * 0.8
      const characterHeight = (characterWidth / characterImageRef.value.width) * characterImageRef.value.height
      const characterX = (width - characterWidth) / 2
      const characterY = height * 0.3

      ctx.drawImage(
        characterImageRef.value,
        characterX,
        characterY,
        characterWidth,
        characterHeight
      )
    } else {
      // 캐릭터가 선택되지 않은 경우 옷과 모자 그리기
      // 옷 그리기
      if (clothesImageRef.value && store.selectedClothes) {
        const clothesWidth = width * 0.4
        const clothesHeight = (clothesWidth / clothesImageRef.value.width) * clothesImageRef.value.height
        const clothesX = (width - clothesWidth) / 2
        const clothesY = height * 0.4

        ctx.drawImage(
          clothesImageRef.value,
          clothesX,
          clothesY,
          clothesWidth,
          clothesHeight
        )
      }

      // 모자 그리기
      if (hatImageRef.value && store.selectedHat) {
        const hatWidth = width * 0.3
        const hatHeight = (hatWidth / hatImageRef.value.width) * hatImageRef.value.height
        const hatX = (width - hatWidth) / 2
        const hatY = height * 0.1

        ctx.drawImage(
          hatImageRef.value,
          hatX,
          hatY,
          hatWidth,
          hatHeight
        )
      }
    }
  } catch (error) {
    console.error('처리 오류:', error)
  }
}

// MediaPipe 초기화 - 세그멘테���션 제거
const startCamera = async () => {
  try {
    if (!videoRef.value || !canvasRef.value || !store.selectedCamera) return

    // 이전 스트림이 있다면 정지
    if (videoRef.value.srcObject) {
      const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }

    const isAndroid = /Android/i.test(navigator.userAgent)
    let constraints: MediaStreamConstraints

    if (isAndroid) {
      constraints = {
        video: {
          facingMode: store.selectedCamera.facingMode,
          width: { ideal: store.selectedCamera.width },
          height: { ideal: store.selectedCamera.height }
        }
      }
    } else {
      constraints = {
        video: {
          deviceId: { exact: store.selectedCamera.deviceId },
          width: { ideal: store.selectedCamera.width },
          height: { ideal: store.selectedCamera.height }
        }
      }
    }

    console.log('카메라 시작 시도:', constraints)
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    console.log('스트림 획득 성공')

    if (videoRef.value) {
      videoRef.value.srcObject = stream

      await new Promise((resolve) => {
        if (!videoRef.value) return
        videoRef.value.onloadedmetadata = () => {
          console.log('비��오 메타데이터 로드됨')
          const { videoWidth, videoHeight } = videoRef.value!
          
          if (window.innerHeight > window.innerWidth) {
            canvasRef.value!.width = videoHeight
            canvasRef.value!.height = videoWidth
          } else {
            canvasRef.value!.width = videoWidth
            canvasRef.value!.height = videoHeight
          }
          resolve(true)
        }
      })

      console.log('FaceMesh 초기화 시작')
      await initializeFaceMesh()
      console.log('FaceMesh 초기화 완료')

      const camera = new Camera(videoRef.value, {
        onFrame: async () => {
          if (videoRef.value) {
            try {
              await faceMesh.send({ image: videoRef.value })
              onResults({ image: videoRef.value })
            } catch (error) {
              console.error('프레임 처리 오류:', error)
            }
          }
        },
        width: canvasRef.value.width,
        height: canvasRef.value.height
      })

      console.log('카메라 시작')
      await camera.start()
      console.log('카메라 시작 완료')
    }
  } catch (error) {
    console.error('카메라 시작 실패:', error)
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      alert('카메라 권한이 필요합니다. ���정에서 카메라 권한을 허용해주세요.')
    } else {
      alert('카메라를 시작할 수 없습니다. 다시 시도해주세요.')
    }
  }
}

// 카메라 정지
const stopCamera = () => {
  if (videoRef.value?.srcObject) {
    const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
    tracks.forEach(track => track.stop())
    videoRef.value.srcObject = null
  }
}

// 이미지 로드
const loadImages = async () => {
  try {
    // 테두리 이미지 로드
    if (store.selectedBorder) {
      const importedBorder = await borderImages[store.selectedBorder]()
      const borderImg = new Image()
      borderImg.src = importedBorder.default
      await new Promise((resolve, reject) => {
        borderImg.onload = resolve
        borderImg.onerror = reject
      })
      borderImageRef.value = borderImg
    }

    // 캐릭터 이미지 로드
    if (store.selectedCharacter) {
      const importedCharacter = await characterImages[store.selectedCharacter]()
      const characterImg = new Image()
      characterImg.src = importedCharacter.default
      await new Promise((resolve, reject) => {
        characterImg.onload = resolve
        characterImg.onerror = reject
      })
      characterImageRef.value = characterImg
    } else {
      characterImageRef.value = null
    }

    // 옷 이미지 로드
    if (store.selectedClothes) {
      const importedClothes = await clothesImages[store.selectedClothes]()
      const clothesImg = new Image()
      clothesImg.src = importedClothes.default
      await new Promise((resolve, reject) => {
        clothesImg.onload = resolve
        clothesImg.onerror = reject
      })
      clothesImageRef.value = clothesImg
    } else {
      clothesImageRef.value = null
    }

    // 모자 이미지 로드
    if (store.selectedHat) {
      const importedHat = await hatImages[store.selectedHat]()
      const hatImg = new Image()
      hatImg.src = importedHat.default
      await new Promise((resolve, reject) => {
        hatImg.onload = resolve
        hatImg.onerror = reject
      })
      hatImageRef.value = hatImg
    } else {
      hatImageRef.value = null
    }
  } catch (error) {
    console.error('이미지 로드 실패:', error)
  }
}

// 캐릭터 선택
const selectCharacter = (characterId: number) => {
  store.setCharacter(characterId)
  loadImages()
}

// 옷 선택
const selectClothes = (clothesId: number) => {
  store.setClothes(clothesId)
  loadImages()
}

// 모자 선택
const selectHat = (hatId: number) => {
  store.setHat(hatId)
  loadImages()
}

// 테두리 선택
const selectBorder = (borderId: number) => {
  store.setBorder(borderId)
  loadImages()
}

onMounted(async () => {
  await loadImages()
  await startCamera()
})

onUnmounted(() => {
  stopCamera()
  if (faceMesh) {
    faceMesh.close()
  }
})
</script>

<template>
  <div class="camera-app">
    <div class="top-controls">
      <button 
        class="back-button"
        @click="$router.push('/camera-setup')"
      >
        <span class="material-icons">arrow_back</span>
      </button>
    </div>

    <div class="camera-view">
      <video 
        ref="videoRef" 
        autoplay 
        playsinline
        muted
        :style="{ transform: 'scaleX(-1)' }"
      ></video>
      <canvas 
        ref="canvasRef"
      ></canvas>
    </div>

    <div class="bottom-controls">
      <div class="filter-controls">
        <div class="filter-section">
          <h3>테두리</h3>
          <div class="filter-options">
            <button
              v-for="item in store.borders"
              :key="item.id"
              :class="{ active: store.selectedBorder === item.id }"
              @click="selectBorder(item.id)"
            >
              {{ item.name }}
            </button>
          </div>
        </div>

        <div class="filter-section">
          <h3>옷릭터</h3>
          <div class="filter-options">
            <button
              v-for="item in store.characters"
              :key="item.id"
              :class="{ active: store.selectedCharacter === item.id }"
              @click="selectCharacter(store.selectedCharacter === item.id ? 0 : item.id)"
            >
              {{ item.name }}
            </button>
          </div>
        </div>

        <div class="filter-section">
          <h3>옷</h3>
          <div class="filter-options">
            <button
              v-for="item in store.clothes"
              :key="item.id"
              :class="{ 
                active: store.selectedClothes === item.id,
                disabled: store.selectedCharacter !== 0 
              }"
              @click="selectClothes(store.selectedClothes === item.id ? 0 : item.id)"
              :disabled="store.selectedCharacter !== 0"
            >
              {{ item.name }}
            </button>
          </div>
        </div>

        <div class="filter-section">
          <h3>모자</h3>
          <div class="filter-options">
            <button
              v-for="item in store.hats"
              :key="item.id"
              :class="{ 
                active: store.selectedHat === item.id,
                disabled: store.selectedCharacter !== 0 
              }"
              @click="selectHat(store.selectedHat === item.id ? 0 : item.id)"
              :disabled="store.selectedCharacter !== 0"
            >
              {{ item.name }}
            </button>
          </div>
        </div>
      </div>

      <div class="capture-button" @click="saveImage">
        <div class="inner-circle"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-app {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  display: flex;
  flex-direction: column;
}

.top-controls {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  padding: 16px;
  display: flex;
  align-items: center;
  z-index: 100;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
}

.back-button {
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.back-button:active {
  background: rgba(255,255,255,0.2);
}

.camera-view {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}

video, canvas {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

video {
  opacity: 0;
  transform: scaleX(-1);
}

.bottom-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
}

.filter-controls {
  margin-bottom: 20px;
}

.filter-section {
  margin-bottom: 16px;
}

.filter-section h3 {
  color: white;
  margin-bottom: 8px;
}

.filter-options {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.filter-options button {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: rgba(255,255,255,0.2);
  color: white;
  white-space: nowrap;
  cursor: pointer;
}

.filter-options button.active {
  background: #6200EE;
}

.capture-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  padding: 3px;
  cursor: pointer;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inner-circle {
  width: 90%;
  height: 90%;
  border-radius: 50%;
  background: white;
  transition: all 0.2s ease;
}

.capture-button:active .inner-circle {
  width: 85%;
  height: 85%;
}

@media screen and (orientation: landscape) {
  .bottom-controls {
    right: 120px;
    height: 100%;
    width: 300px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: linear-gradient(to left, rgba(0,0,0,0.8), transparent);
  }

  .filter-options {
    flex-direction: column;
    height: auto;
  }

  .capture-button {
    margin-top: auto;
  }
}

@supports (padding-top: env(safe-area-inset-top)) {
  .top-controls {
    padding-top: calc(16px + env(safe-area-inset-top));
    height: calc(60px + env(safe-area-inset-top));
  }

  .bottom-controls {
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
  }
}

.filter-options button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 