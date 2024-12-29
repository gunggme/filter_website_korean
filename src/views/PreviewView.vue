<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

// 스티커 이미지 import
import sticker1 from '@/assets/stickers/sticker1.png'
import sticker2 from '@/assets/stickers/sticker2.png'
import sticker3 from '@/assets/stickers/sticker3.png'
import sticker4 from '@/assets/stickers/sticker4.png'
import sticker5 from '@/assets/stickers/sticker5.png'
import sticker6 from '@/assets/stickers/sticker6.png'
import sticker7 from '@/assets/stickers/sticker7.png'
import sticker8 from '@/assets/stickers/sticker8.png'
import sticker9 from '@/assets/stickers/sticker9.png'
import sticker10 from '@/assets/stickers/sticker10.png'
import sticker11 from '@/assets/stickers/sticker11.png'
import sticker12 from '@/assets/stickers/sticker12.png'
import sticker13 from '@/assets/stickers/sticker13.png'
import sticker14 from '@/assets/stickers/sticker14.png'
import sticker15 from '@/assets/stickers/sticker15.png'
import sticker16 from '@/assets/stickers/sticker16.png'
import sticker17 from '@/assets/stickers/sticker17.png'

const router = useRouter()
const capturedImage = ref('')
const processedImage = ref('')
const isLoading = ref(false)

// 스티커 관련 상태
const showStickerPanel = ref(false)
const stickers = ref([
  { id: 1, url: sticker1 },
  { id: 2, url: sticker2 },
  { id: 3, url: sticker3 },
  { id: 4, url: sticker4 },
  { id: 5, url: sticker5 },
  { id: 6, url: sticker6 },
  { id: 7, url: sticker7 },
  { id: 8, url: sticker8 },
  { id: 9, url: sticker9 },
  { id: 10, url: sticker10 },
  { id: 11, url: sticker11 },
  { id: 12, url: sticker12 },
  { id: 13, url: sticker13 },
  { id: 14, url: sticker14 },
  { id: 15, url: sticker15 },
  { id: 16, url: sticker16 },
  { id: 17, url: sticker17 }
])

interface PlacedSticker {
  id: number
  url: string
  x: number
  y: number
  scale: number
  rotation: number
}

const placedStickers = ref<PlacedSticker[]>([])
const selectedSticker = ref<number | null>(null)
const isDragging = ref(false)
const startPos = ref({ x: 0, y: 0 })

// QR �����달 관련 상태
const showQRModal = ref(false)
const qrImageData = ref('')
const isUploading = ref(false)
const uploadError = ref('')

// 제스처 관련 상태 추가
const startDistance = ref(0)
const startAngle = ref(0)
const isGesturing = ref(false)

// 제스처 시작
const startGesture = (event: TouchEvent, index: number) => {
  if (event.touches.length === 2) {
    event.preventDefault()
    isGesturing.value = true
    selectedSticker.value = index

    // 두 손가락 사이의 거리 계산
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    startDistance.value = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    )

    // 회전 각도 계산
    startAngle.value = Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    )
  }
}

// 제스처 진행
const onGesture = (event: TouchEvent) => {
  if (!isGesturing.value || selectedSticker.value === null || event.touches.length !== 2) return
  
  event.preventDefault()
  const touch1 = event.touches[0]
  const touch2 = event.touches[1]

  // 현재 거리 계산
  const currentDistance = Math.hypot(
    touch2.clientX - touch1.clientX,
    touch2.clientY - touch1.clientY
  )

  // 현재 각도 계산
  const currentAngle = Math.atan2(
    touch2.clientY - touch1.clientY,
    touch2.clientX - touch1.clientX
  )

  // 크기 변경
  const scaleDelta = (currentDistance - startDistance.value) * 0.01
  adjustScale(selectedSticker.value, scaleDelta)
  startDistance.value = currentDistance

  // 회전 변경
  const rotationDelta = ((currentAngle - startAngle.value) * 180) / Math.PI
  rotateSticker(selectedSticker.value, rotationDelta)
  startAngle.value = currentAngle
}

// 제스처 종료
const endGesture = () => {
  isGesturing.value = false
}

// 이미지 로드
onMounted(() => {
  const imageData = sessionStorage.getItem('capturedImage')
  if (!imageData) {
    // 이미지가 없으면 카메라 화면으로 돌아감
    router.replace('/final')
    return
  }
  capturedImage.value = imageData
  processedImage.value = imageData

  // 전역 이벤트 리스너 추가
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('touchmove', onDrag)
  window.addEventListener('mouseup', endDrag)
  window.addEventListener('touchend', endDrag)
  window.addEventListener('touchmove', onGesture)
  window.addEventListener('touchend', endGesture)
})

// 컴포넌트 언마운트 시 이미지 데이터 정리
onUnmounted(() => {
  sessionStorage.removeItem('capturedImage')
  if (qrImageData.value) {
    URL.revokeObjectURL(qrImageData.value)
  }

  // 전역 이벤트 리스너 제거
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('mouseup', endDrag)
  window.removeEventListener('touchend', endDrag)
  window.removeEventListener('touchmove', onGesture)
  window.removeEventListener('touchend', endGesture)
})

// 다시 찍기
const handleRetake = () => {
  sessionStorage.removeItem('capturedImage')
  router.push('/final')
}

// 스티커 추가
const addSticker = (sticker: { id: number, url: string }) => {
  const containerRect = document.querySelector('.image-container')?.getBoundingClientRect()
  if (!containerRect) return

  placedStickers.value.push({
    id: sticker.id,
    url: sticker.url,
    x: containerRect.width / 2,
    y: containerRect.height / 2,
    scale: 1,
    rotation: 0
  })
  selectedSticker.value = placedStickers.value.length - 1
}

// 스티커 선택
const selectSticker = (index: number) => {
  selectedSticker.value = index
}

// 스티커 드래그 시작
const startDrag = (event: MouseEvent | TouchEvent, index: number) => {
  event.preventDefault()
  event.stopPropagation()
  isDragging.value = true
  selectedSticker.value = index
  
  const pos = 'touches' in event ? event.touches[0] : event
  const sticker = placedStickers.value[index]
  
  startPos.value = {
    x: pos.clientX - sticker.x,
    y: pos.clientY - sticker.y
  }
}

// 스티커 드래그 중
const onDrag = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value || selectedSticker.value === null) return
  
  event.preventDefault()
  const pos = 'touches' in event ? event.touches[0] : event
  
  // 현재 스티커 위치 업데이트
  placedStickers.value[selectedSticker.value].x = pos.clientX - startPos.value.x
  placedStickers.value[selectedSticker.value].y = pos.clientY - startPos.value.y

  // 화면 하단 중앙 영역에 들어왔는지 확인
  const deleteZoneY = window.innerHeight - 100  // 하단에서 100px 위
  if (pos.clientY > deleteZoneY && 
      pos.clientX > window.innerWidth * 0.4 && 
      pos.clientX < window.innerWidth * 0.6) {
    // 삭제 영역 표시
    document.body.style.setProperty('--delete-zone-opacity', '1')
  } else {
    document.body.style.setProperty('--delete-zone-opacity', '0')
  }
}

// 스티커 드래그 종료
const endDrag = () => {
  if (isDragging.value && selectedSticker.value !== null) {
    const sticker = placedStickers.value[selectedSticker.value]
    const deleteZoneY = window.innerHeight - 100

    // 스티커가 삭제 영역에 있는지 확인
    if (sticker.y > deleteZoneY && 
        sticker.x > window.innerWidth * 0.4 && 
        sticker.x < window.innerWidth * 0.6) {
      // 스티커 삭제
      placedStickers.value.splice(selectedSticker.value, 1)
      selectedSticker.value = null
    }
  }
  
  isDragging.value = false
  document.body.style.setProperty('--delete-zone-opacity', '0')
}

// 스티커 크기 조절
const adjustScale = (index: number, delta: number) => {
  if (index >= 0 && index < placedStickers.value.length) {
    placedStickers.value[index].scale = Math.max(0.5, Math.min(2, placedStickers.value[index].scale + delta))
  }
}

// 스티커 회전
const rotateSticker = (index: number, delta: number) => {
  if (index >= 0 && index < placedStickers.value.length) {
    placedStickers.value[index].rotation += delta
  }
}

// 스티커 삭제
const deleteSticker = (index: number) => {
  placedStickers.value.splice(index, 1)
  selectedSticker.value = null
}

// 이미지 저장 전 스티커 합성
const compositeImage = async () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return processedImage.value

  // 원본 이미지 로드
  const img = new Image()
  img.src = processedImage.value
  await new Promise((resolve) => { img.onload = resolve })

  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0)

  // 스티커 합성
  for (const sticker of placedStickers.value) {
    const stickerImg = new Image()
    stickerImg.src = sticker.url
    await new Promise((resolve) => { stickerImg.onload = resolve })

    ctx.save()
    // X 위치는 그대로, Y 위치는 0.8로 나눔
    ctx.translate(
      sticker.x * (img.width / window.innerWidth), 
      (sticker.y * (img.height / window.innerHeight)) / 0.8
    )
    ctx.rotate(sticker.rotation * Math.PI / 180)
    // 크기를 2.5로 나눔
    ctx.scale(sticker.scale / 2.5, sticker.scale / 2.5)
    ctx.drawImage(stickerImg, -stickerImg.width/2, -stickerImg.height/2)
    ctx.restore()
  }

  return canvas.toDataURL('image/jpeg', 0.8)
}

// 저장하기 함수 수정
const handleSave = async () => {
  if (!processedImage.value) return
  
  showQRModal.value = true
  isUploading.value = true
  uploadError.value = ''
  
  try {
    // 스티커가 합성된 최종 이미지 생성
    const finalImage = await compositeImage()
    
    // Base64 데이터를 Blob으로 변환
    const base64Data = finalImage.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/png' })
    
    // FormData 성 및 파일 가
    const formData = new FormData()
    formData.append('file', blob, 'photo.png')
    
    // 이미지 업로드 요청
    const response = await fetch('http://34.29.113.34:8000/proxy/img', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('이미지 업로드 실패')
    }
    
    const imageBlob = await response.blob()
    qrImageData.value = URL.createObjectURL(imageBlob)
    
  } catch (error) {
    console.error('업로드 중 오류:', error)
    uploadError.value = '이미지 업로드 중 오류가 발생했습니다.'
  } finally {
    isUploading.value = false
  }
}

// QR 모달 닫기
const closeQRModal = () => {
  showQRModal.value = false
  if (qrImageData.value) {
    URL.revokeObjectURL(qrImageData.value)
    qrImageData.value = ''
  }
}
</script>

<template>
  <div class="preview-container">
    <!-- 이미지 프리뷰 -->
    <div class="image-container">
      <img :src="processedImage" alt="captured" class="preview-image" />
      
      <!-- 스티커 레이어 -->
      <div 
        v-for="(sticker, index) in placedStickers" 
        :key="index"
        class="sticker"
        :class="{ 'selected': selectedSticker === index }"
        :style="{
          left: `${sticker.x}px`,
          top: `${sticker.y}px`,
          transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
          zIndex: selectedSticker === index ? 2 : 1
        }"
        @mousedown="startDrag($event, index)"
        @touchstart="(e) => {
          if (e.touches.length === 1) startDrag(e, index);
          else startGesture(e, index);
        }"
      >
        <img :src="sticker.url" alt="sticker" draggable="false" />
      </div>

      <!-- 삭제 영역 표시 -->
      <div class="delete-zone">
        여기로 드래그하여 삭제
      </div>
    </div>

    <!-- 스티커 패널 -->
    <div class="sticker-panel">
      <div class="sticker-grid">
        <div 
          v-for="sticker in stickers" 
          :key="sticker.id"
          class="sticker-item"
          @click="addSticker(sticker)"
        >
          <img :src="sticker.url" alt="sticker" />
        </div>
      </div>
    </div>

    <!-- 버튼 영역 -->
    <div class="button-container">
      <button class="action-button retake" @click="handleRetake">
        다시 찍기
      </button>
      <button class="action-button save" @click="handleSave">
        저장하기
      </button>
    </div>

    <!-- QR 코드 모달 -->
    <div v-if="showQRModal" class="qr-modal">
      <div class="qr-modal-content">
        <template v-if="isUploading">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">QR 코드 생성 중...</p>
          </div>
        </template>
        <template v-else>
          <h3>QR 코드</h3>
          <img v-if="qrImageData" :src="qrImageData" alt="QR Code" class="qr-image">
          <p v-if="uploadError" class="error-message">{{ uploadError }}</p>
          <button class="close-button" @click="closeQRModal">닫기</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  display: flex;
  flex-direction: column;
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: auto;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.button-container {
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  display: flex;
  gap: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  z-index: 10;
}

.action-button {
  flex: 1;
  height: 48px;
  border-radius: 24px;
  border: none;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:active {
  transform: scale(0.98);
}

.retake {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.save {
  background: #6200EE;
  color: white;
}

/* QR 코드 모달 */
.qr-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.qr-modal-content {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  max-width: 90%;
  width: 300px;
}

.qr-modal-content h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.qr-image {
  width: 200px;
  height: 200px;
  margin: 16px auto;
  display: block;
}

.error-message {
  color: red;
  margin: 8px 0;
}

.close-button {
  background: #6200EE;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 16px;
}

.close-button:hover {
  opacity: 0.9;
}

/* 로딩 컨테이너 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6200EE;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 1rem;
  color: #333;
  font-size: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 가로 모드 방지 */
@media screen and (orientation: landscape) {
  .preview-container {
    transform: rotate(-90deg);
    transform-origin: left top;
    width: 100vh;
    height: 100vw;
    position: absolute;
    top: 100%;
    left: 0;
  }
}

.sticker {
  position: absolute;
  cursor: move;
  user-select: none;
  z-index: 999;
  pointer-events: auto;
  transform-origin: center center;
  transform: translate(-50%, -50%);
}

.sticker.selected {
  outline: 2px solid #6200EE;
}

.sticker img {
  width: 100px;
  height: auto;
  pointer-events: none;
  transform-origin: center center;
}

.sticker-controls {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 1000;
}

.control-button.delete {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
}

.control-button.delete:active {
  background: rgba(255, 0, 0, 0.7);
}

.sticker-panel {
  position: absolute;
  bottom: 100px;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  padding: 16px;
}

.sticker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
}

.sticker-item {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.sticker-item:active {
  transform: scale(0.95);
}

.sticker-item img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.delete-zone {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: rgba(255, 0, 0, 0.7);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  opacity: var(--delete-zone-opacity, 0);
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 1000;
}

/* 삭제 관련 스타일 제거 */
.sticker-controls,
.control-button.delete {
  display: none;
}
</style> 