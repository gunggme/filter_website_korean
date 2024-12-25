<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const capturedImage = ref('')
const processedImage = ref('')
const isLoading = ref(false)

// QR 모달 관련 상태
const showQRModal = ref(false)
const qrImageData = ref('')
const isUploading = ref(false)
const uploadError = ref('')

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
})

// 컴포넌트 언마운트 시 이미지 데이터 정리
onUnmounted(() => {
  sessionStorage.removeItem('capturedImage')
  if (qrImageData.value) {
    URL.revokeObjectURL(qrImageData.value)
  }
})

// 다시 찍기
const handleRetake = () => {
  sessionStorage.removeItem('capturedImage')
  router.push('/final')
}

// 저장하기 (QR 코드 생성)
const handleSave = async () => {
  if (!processedImage.value) return
  
  showQRModal.value = true  // 먼저 모달을 표시
  isUploading.value = true
  uploadError.value = ''
  
  try {
    // Base64 데이터를 Blob으로 변환
    const base64Data = processedImage.value.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/png' })
    
    // FormData 생성 및 파일 추가
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
    
    // 응답으로 받은 이미지 데이터를 QR 코드로 표시
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #000;
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
</style> 