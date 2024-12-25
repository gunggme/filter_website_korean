<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'

const router = useRouter()
const store = useFilterStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const cameras = ref<MediaDeviceInfo[]>([])
const selectedCamera = ref<string>('')
const isStreamActive = ref(false)

// 안드로이드 체크 함수
const isAndroid = () => /Android/i.test(navigator.userAgent)

// 카메라 권한 요청과 초기화를 한 번에 처리
const initializeCamera = async () => {
  try {
    console.log('카메라 초기화 시작')
    
    // 이전 스트림이 있다면 정지
    if (videoRef.value?.srcObject) {
      const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }

    // 안드로이드 환경 확인
    const isAndroidEnv = isAndroid()
    console.log('환경:', isAndroidEnv ? '안드로이드' : 'PC')

    // 초기 권한 요청
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    
    if (isAndroidEnv) {
      // 안드로이드의 경우 단순화된 카메라 목록
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoCameras = devices.filter(device => device.kind === 'videoinput')
      cameras.value = [
        { deviceId: 'environment', label: '후면 카메라', kind: 'videoinput' },
        { deviceId: 'user', label: '전면 카메라', kind: 'videoinput' }
      ] as MediaDeviceInfo[]
      
      cameras.value.push(...videoCameras)

      // 기본값으로 후면 카메라 선택
      selectedCamera.value = 'environment'
    } else {
      // PC의 경우 실제 디바이스 목록 사용
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoCameras = devices.filter(device => device.kind === 'videoinput')
      cameras.value = videoCameras
      
      if (videoCameras.length > 0) {
        selectedCamera.value = videoCameras[0].deviceId
      }
    }

    // 초기 스트림 정지
    stream.getTracks().forEach(track => track.stop())

    // 선택된 카메라로 스트림 시작
    await startCamera()
    
  } catch (error) {
    console.error('카메라 초기화 실패:', error)
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          alert('카메라 권한이 거부되었습니다.')
          break
        case 'NotFoundError':
          alert('카메라를 찾을 수 없습니다.')
          break
        default:
          alert('카메라 초기화 중 오류가 발생했습니다: ' + error.name)
      }
    }
  }
}

// 카메라 시작
const startCamera = async () => {
  try {
    if (!selectedCamera.value) return
    
    // 이전 스트림이 있다면 정지
    if (videoRef.value?.srcObject) {
      const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }

    const isAndroidEnv = isAndroid()
    let constraints: MediaStreamConstraints

    if (isAndroidEnv) {
      // 안드로이드용 제약 조건
      constraints = {
        video: {
          facingMode: selectedCamera.value === 'environment' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }
    } else {
      // PC용 제약 조건
      constraints = {
        video: {
          deviceId: { exact: selectedCamera.value },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }
    }

    console.log('카메라 시작 시도:', constraints)
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    console.log('카메라 스트림 획득 성공')

    if (videoRef.value) {
      videoRef.value.srcObject = stream
      
      // 비디오 로드 완료 대기
      await new Promise((resolve) => {
        videoRef.value!.onloadedmetadata = () => {
          console.log('비디오 메타데이터 로드됨')
          resolve(true)
        }
      })

      isStreamActive.value = true
    }
  } catch (error) {
    console.error('카메라 시작 실패:', error)
    isStreamActive.value = false
    alert('카메라를 시작할 수 없습니다.')
  }
}

const handleCameraChange = () => {
  if (selectedCamera.value) {
    startCamera()
  }
}

// 카메라 정지
const stopCamera = () => {
  if (videoRef.value?.srcObject) {
    const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
    tracks.forEach(track => track.stop())
    videoRef.value.srcObject = null
  }
  isStreamActive.value = false
}

const handleNext = () => {
  if (selectedCamera.value && isStreamActive.value) {
    const isAndroidEnv = isAndroid()
    // 카메라 정보 저장
    store.setCamera({
      deviceId: selectedCamera.value,
      facingMode: selectedCamera.value,
      width: videoRef.value?.videoWidth || 1280,
      height: videoRef.value?.videoHeight || 720
    })
    stopCamera()
    router.push('/final')
  }
}

// 화면 방향 변경 감지
const handleOrientationChange = () => {
  if (isStreamActive.value) {
    startCamera()
  }
}

onMounted(async () => {
  try {
    await initializeCamera()
    
    // 화면 방향 변경 이벤트 리스너 등록 (안드로이드인 경우에만)
    if (isAndroid()) {
      window.addEventListener('orientationchange', handleOrientationChange)
      window.addEventListener('resize', handleOrientationChange)
    }
  } catch (error) {
    console.error('초기화 중 오류 발생:', error)
  }
})

onUnmounted(() => {
  // 이벤트 리스너 제거
  window.removeEventListener('orientationchange', handleOrientationChange)
  window.removeEventListener('resize', handleOrientationChange)
  stopCamera() // 컴포넌트 언마운트 시 카메라 정지
})
</script>

<template>
  <div class="camera-setup android-screen">
    <div class="toolbar">
      <h1>카메라 설정</h1>
    </div>
    
    <div class="content">
      <div class="preview-container">
        <video 
          ref="videoRef" 
          autoplay 
          playsinline
          muted
          :style="{ transform: isAndroid() && selectedCamera === 'environment' ? 'scaleX(1)' : 'scaleX(-1)' }"
        ></video>
      </div>

      <div class="camera-controls">
        <select 
          v-model="selectedCamera" 
          class="android-select"
          @change="handleCameraChange"
        >
          <option value="">카메라 선택</option>
          <option 
            v-for="camera in cameras" 
            :key="camera.deviceId" 
            :value="camera.deviceId"
          >
            {{ camera.label }}
          </option>
        </select>

        <button 
          class="android-button"
          @click="handleNext"
          :disabled="!selectedCamera"
        >
          다음
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.android-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #000000;
}

.toolbar {
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top));
  background-color: #6200EE;
  color: white;
}

.toolbar h1 {
  font-size: 20px;
  font-weight: 500;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.preview-container {
  flex: 1;
  position: relative;
  width: 100%;
  background-color: #000000;
  overflow: hidden;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}

.camera-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  z-index: 10;
}

.android-select {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  font-size: 16px;
  color: white;
  height: 48px;
}

.android-button {
  width: 100%;
  min-height: 48px;
  background-color: #6200EE;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
}

.android-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 가로 모드 방지 */
@media screen and (orientation: landscape) {
  .android-screen {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    transform-origin: center center;
    width: 100vh;
    height: 100vw;
    background: #000;
  }
}
</style> 