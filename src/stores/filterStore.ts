import { ref } from 'vue'
import { defineStore } from 'pinia'

// CameraInfo 인터페이스 정의
interface CameraInfo {
  deviceId: string
  facingMode: string
  width: number
  height: number
}

export const useFilterStore = defineStore('filter', () => {
  const selectedCamera = ref<CameraInfo | null>(null)
  const selectedClothes = ref(0)
  const selectedHat = ref(0)

  // 옷 정보
  const clothes = ref([
    { id: 1, name: '한복', type: 'traditional' }
  ])

  // 모자 정보
  const hats = ref([
    { id: 1, name: '한복 모자', type: 'traditional' }
  ])

  const setCamera = (camera: CameraInfo) => {
    selectedCamera.value = camera
  }

  const setClothes = (clothesId: number) => {
    selectedClothes.value = clothesId
  }

  const setHat = (hatId: number) => {
    selectedHat.value = hatId
  }

  return {
    selectedCamera,
    selectedClothes,
    selectedHat,
    clothes,
    hats,
    setCamera,
    setClothes,
    setHat
  }
}) 