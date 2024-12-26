<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'

const router = useRouter()
const store = useFilterStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null

const isCountingDown = ref(false)
const countdown = ref(3)
const capturedImage = ref('')

// 테두리 선택 상태 관리
const selectedBorder = ref(store.selectedBorder)

// 테두리 이미지 URL 생성
const getBorderImageUrl = (id: number) => {
  return new URL(`../assets/borders/border${id}.png`, import.meta.url).href
}

// 테두리 선택 핸들러
const handleBorderSelect = (borderId: number) => {
  // 같은 버튼을 누르면 선택 해제
  if (selectedBorder.value === borderId) {
    selectedBorder.value = 0
    store.setBorder(0)
  } else {
    selectedBorder.value = borderId
    store.setBorder(borderId)
  }
}

// 안드로이드 체크 함수
const isAndroid = () => /Android/i.test(navigator.userAgent)

// 카메라 시작
const startCamera = async () => {
  try {
    if (!videoRef.value || !canvasRef.value || !store.selectedCamera) return

    // 이전 스트림이 있다면 정지
    if (videoRef.value.srcObject) {
      const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }

    let constraints: MediaStreamConstraints

    if (isAndroid()) {
      constraints = {
        video: {
          facingMode: store.selectedCamera.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 0.5625 }
        }
      }
    } else {
      constraints = {
        video: {
          deviceId: { exact: store.selectedCamera.deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 0.5625 }
        }
      }
    }

    console.log('카메라 시작 시도:', constraints)
    const stream = await navigator.mediaDevices.getUserMedia(constraints)

    if (videoRef.value) {
      videoRef.value.srcObject = stream

      // 비디오 메타데이터 로드 완료 대기
      await new Promise((resolve) => {
        videoRef.value!.onloadedmetadata = () => {
          const { videoWidth, videoHeight } = videoRef.value!
          
          // 캔버스 크기를 비디오 크기에 맞춤
          canvasRef.value!.width = videoWidth
          canvasRef.value!.height = videoHeight
          resolve(true)
        }
      })

      // 캔버스에 비디오 프레임 그리기
      const renderFrame = () => {
        if (videoRef.value && canvasRef.value) {
          const ctx = canvasRef.value.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoRef.value, 0, 0, canvasRef.value.width, canvasRef.value.height)
          }
          animationFrameId = requestAnimationFrame(renderFrame)
        }
      }
      renderFrame()
    }
  } catch (error) {
    console.error('카메라 시작 실패:', error)
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      alert('카메라 권한이 필요합니다. 설정해서 카메라 권한을 허용해주세요.')
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
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
}

// 카운트다운 후 사진 촬영
const startCapture = async () => {
  if (isCountingDown.value) return
  
  isCountingDown.value = true
  countdown.value = 3

  const countdownInterval = setInterval(() => {
    countdown.value--
    
    // 카운트다운이 1초일 때 카메라 사운드 재생
    if (countdown.value === 1) {
      const audio = new Audio(new URL('../assets/camerasound.mp3', import.meta.url).href)
      audio.play()
    }
    
    if (countdown.value === 0) {
      clearInterval(countdownInterval)
      setTimeout(() => {
        captureImage()
        isCountingDown.value = false
      }, 500) // 0이 잠깐 보이도록 지연
    }
  }, 1000)
}

// 이미지 캡처 및 저장
const captureImage = () => {
  const cameraView = document.querySelector('.camera-view')
  if (!cameraView || !canvasRef.value) return

  try {
    // 원본 비디오/캔버스의 크기와 비율 계산
    const originalWidth = canvasRef.value.width
    const originalHeight = canvasRef.value.height
    const aspectRatio = originalWidth / originalHeight

    // 새 캔버스 생성
    const finalCanvas = document.createElement('canvas')
    const ctx = finalCanvas.getContext('2d')
    if (!ctx) return

    // 세로 모드 기준으로 캔버스 크기 설정 (9:16 비율)
    finalCanvas.width = 1080
    finalCanvas.height = 1920

    // 실제 그리기 영역 계산
    const drawWidth = finalCanvas.width
    const drawHeight = drawWidth / aspectRatio
    const yOffset = (finalCanvas.height - drawHeight) / 2

    // 1. 비디오/캔버스 내용 그리기
    ctx.save()
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)
    ctx.scale(-1, 1)  // 좌우 반전
    ctx.drawImage(
      canvasRef.value,
      -finalCanvas.width,
      yOffset,
      drawWidth,
      drawHeight
    )
    ctx.restore()

    // 2. 오버레이 이미지들을 순서대로 그리기
    const characterOverlay = cameraView.querySelector('.character-overlay')
    const clothesOverlay = cameraView.querySelector('.clothes-overlay')
    const hatOverlay = cameraView.querySelector('.hat-overlay')
    const borderOverlay = cameraView.querySelector('.border-overlay')

    const drawOverlay = (overlay: Element | null) => {
      if (overlay && overlay instanceof HTMLImageElement && overlay.style.display !== 'none') {
        // 이미지의 원본 크기 가져오기
        const naturalWidth = overlay.naturalWidth
        const naturalHeight = overlay.naturalHeight
        const imageAspect = naturalWidth / naturalHeight

        let width, height
        if (overlay.classList.contains('character-overlay')) {
          // 캐릭터는 화면 높이의 90%로 설정
          height = finalCanvas.height * 0.9
          width = height * imageAspect
        } else if (overlay.classList.contains('clothes-overlay')) {
          // 옷은 화면 높이의 42%로 설정 (60% * 0.7 = 42%)
          height = finalCanvas.height * 0.8
          width = height * imageAspect
        } else if (overlay.classList.contains('hat-overlay')) {
          // 모자는 화면 높이의 28%로 설정 (40% * 0.7 = 28%)
          height = finalCanvas.height * 0.28
          width = height * imageAspect
        } else {
          // 테두리는 전체 화면 크기로
          width = finalCanvas.width
          height = finalCanvas.height
        }

        // 중앙 위치 계산
        const x = (finalCanvas.width - width) / 2
        let y
        if (overlay.classList.contains('character-overlay')) {
          y = (finalCanvas.height - height) / 2
        } else if (overlay.classList.contains('clothes-overlay')) {
          y = finalCanvas.height * 0.6 - height / 2  // 0.55에서 0.65로 수정하여 더 아래로 이동
        } else if (overlay.classList.contains('hat-overlay')) {
          y = finalCanvas.height * 0.25 - height / 2  // 위쪽에 배치
        } else {
          y = 0  // 테두리는 최상단부터
        }

        ctx.drawImage(overlay, x, y, width, height)
      }
    }

    // 렌더링 순서: 캐릭터 -> 옷 -> 모자 -> 테두리
    if (selectedCharacter.value !== 0) {
      drawOverlay(characterOverlay)
    } else {
      // 캐릭터가 선택되지 않은 경우에만 옷과 모자 그리기
      drawOverlay(clothesOverlay)
      drawOverlay(hatOverlay)
    }
    drawOverlay(borderOverlay)

    // 최종 이미지를 base64 문자열로 변환
    const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.8)
    
    // 상태 초기화
    isCountingDown.value = false
    
    // 카메라 정지
    stopCamera()
    
    // sessionStorage를 사용하여 이미지 데이터 전달
    sessionStorage.setItem('capturedImage', dataUrl)
    
    // 프리뷰 페이지로 이동
    router.push('/preview')
  } catch (error) {
    console.error('이미지 저장 오류:', error)
    isCountingDown.value = false
  }
}

// 이미지 URL 생성 함수들
const getClothesImageUrl = (id: number) => {
  return new URL(`../assets/clothes/traditional.png`, import.meta.url).href
}

const getHatImageUrl = (id: number) => {
  return new URL(`../assets/hats/traditional.png`, import.meta.url).href
}

const getCharacterImageUrl = (id: number) => {
  return new URL(`../assets/characters/character${id}.png`, import.meta.url).href
}

// 선택 상태 관리
const selectedClothes = ref(store.selectedClothes)
const selectedHat = ref(store.selectedHat)
const selectedCharacter = ref(store.selectedCharacter)

// 선택 핸들러들
const handleClothesSelect = (id: number) => {
  selectedClothes.value = selectedClothes.value === id ? 0 : id
  store.setClothes(selectedClothes.value)
  if (selectedClothes.value !== 0) {
    // 한복이 선택되면 캐릭터 비활성화
    selectedCharacter.value = 0
    store.setCharacter(0)
  }
}

const handleHatSelect = (id: number) => {
  selectedHat.value = selectedHat.value === id ? 0 : id
  store.setHat(selectedHat.value)
  if (selectedHat.value !== 0) {
    // 모자가 선택되면 캐릭터 비활성화
    selectedCharacter.value = 0
    store.setCharacter(0)
  }
}

const handleCharacterSelect = (id: number) => {
  selectedCharacter.value = selectedCharacter.value === id ? 0 : id
  store.setCharacter(selectedCharacter.value)
  if (selectedCharacter.value !== 0) {
    // 캐릭터가 선택되면 한복과 모자 비활성화
    selectedClothes.value = 0
    selectedHat.value = 0
    store.setClothes(0)
    store.setHat(0)
  }
}

onMounted(async () => {
  await startCamera()
})

onUnmounted(() => {
  stopCamera()
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

    <div class="camera-container">
      <div class="camera-view">
        <video 
          ref="videoRef" 
          autoplay 
          playsinline
          muted
        ></video>
        <canvas 
          ref="canvasRef"
        ></canvas>
        
        <!-- 선택된 테두리 표시 -->
        <img 
          v-if="selectedBorder"
          :src="getBorderImageUrl(selectedBorder)"
          class="border-overlay"
          alt="border"
        />
        
        <!-- 선택된 캐릭터 표시 -->
        <img
          v-if="selectedCharacter"
          :src="getCharacterImageUrl(selectedCharacter)"
          class="character-overlay"
          alt="character"
        />
        
        <!-- 선택된 옷 표시 -->
        <img
          v-if="selectedClothes > 0 && !selectedCharacter"
          :src="getClothesImageUrl(selectedClothes)"
          class="clothes-overlay"
          alt="clothes"
        />
        
        <!-- 선택된 모자 표시 -->
        <img
          v-if="selectedHat > 0 && !selectedCharacter"
          :src="getHatImageUrl(selectedHat)"
          class="hat-overlay"
          alt="hat"
        />
        
        <!-- 카운트다운 오버레이 -->
        <div 
          v-if="isCountingDown" 
          class="countdown-overlay"
        >
          <div class="countdown-number">{{ countdown }}</div>
        </div>
      </div>
    </div>

    <!-- 아이템 선택 UI -->
    <div class="item-selector">
      <!-- 테두리 선택 -->
      <div class="selector-section">
        <button 
          v-for="border in store.borders" 
          :key="border.id"
          class="item-button"
          :class="{ 'selected': selectedBorder === border.id }"
          @click="handleBorderSelect(border.id)"
        >
          {{ border.name }}
        </button>
      </div>

      <!-- 캐릭터 선택 -->
      <div class="selector-section">
        <button 
          v-for="character in store.characters" 
          :key="character.id"
          class="item-button"
          :class="{ 'selected': selectedCharacter === character.id }"
          @click="handleCharacterSelect(character.id)"
        >
          {{ character.name }}
        </button>
      </div>

      <!-- 옷과 모자 선택 -->
      <div class="selector-section">
        <button 
          v-for="cloth in store.clothes" 
          :key="cloth.id"
          class="item-button"
          :class="{ 'selected': selectedClothes === cloth.id }"
          @click="handleClothesSelect(cloth.id)"
        >
          {{ cloth.name }}
        </button>
      </div>

      <div class="selector-section">
        <button 
          v-for="hat in store.hats" 
          :key="hat.id"
          class="item-button"
          :class="{ 'selected': selectedHat === hat.id }"
          @click="handleHatSelect(hat.id)"
        >
          {{ hat.name }}
        </button>
      </div>
    </div>

    <div class="bottom-controls">
      <div 
        class="capture-button" 
        @click="startCapture"
        :class="{ 'disabled': isCountingDown }"
      >
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
  top: env(safe-area-inset-top, 0);
  left: 0;
  right: 0;
  height: 60px;
  padding: 16px;
  display: flex;
  align-items: center;
  z-index: 100;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
}

.camera-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.camera-view {
  width: 100%;
  height: 0;
  padding-bottom: 177.78%; /* 세로 모드에서 16:9 비율 유지 */
  position: relative;
  background: #000;
  overflow: hidden;
}

video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.bottom-controls {
  position: absolute;
  bottom: env(safe-area-inset-bottom, 0);
  left: 0;
  right: 0;
  height: 120px;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
  z-index: 100;
  padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
}

.capture-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  padding: 3px;
  cursor: pointer;
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

/* 가로 모드 방지 스타일 제거 */
@media screen and (orientation: landscape) {
  .camera-app {
    /* 가로 모드 강제 변환 스타일 제거 */
  }
}

.countdown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.countdown-number {
  font-size: 120px;
  color: white;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  animation: countdownPulse 1s ease-in-out infinite;
}

.capture-button.disabled {
  opacity: 0.5;
  pointer-events: none;
}

@keyframes countdownPulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.border-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}

.item-selector {
  position: absolute;
  bottom: 140px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.5);
  z-index: 101;
}

.selector-section {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 5px;
}

.item-button {
  padding: 0 20px;
  height: 36px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  z-index: 102;
}

.item-button.selected {
  background: #6200EE;
}

.item-button:active {
  transform: scale(0.95);
}

.character-overlay,
.clothes-overlay,
.hat-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  object-fit: contain;
}

.character-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  height: 130%;
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
  object-fit: contain;
}

.clothes-overlay {
  position: absolute;
  top: 60%;
  left: 50%;
  width: 80%;
  height: 80%;
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
  object-fit: contain;
}

.hat-overlay {
  position: absolute;
  top: 30%;
  left: 50%;
  width: 45%;
  height: 45%;
  transform: translate(-50%, -50%);
  z-index: 2;
  pointer-events: none;
  object-fit: contain;
}

.border-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}

.item-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selector-section.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style> 