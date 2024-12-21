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
  const selectedBorder = ref(1)  // 기본 테두리 선택

  // 옷 정보
  const clothes = ref([
    { id: 1, name: '한복', type: 'traditional' }
  ])

  // 모자 정보
  const hats = ref([
    { id: 1, name: '한복 모자', type: 'traditional' }
  ])

  // 테두리 정보
  const borders = ref([
    { id: 1, name: '테두리 1' },
    { id: 2, name: '테두리 2' },
    { id: 3, name: '테두리 3' },
    { id: 4, name: '테두리 4' }
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

  const setBorder = (borderId: number) => {
    selectedBorder.value = borderId
  }

  return {
    selectedCamera,
    selectedClothes,
    selectedHat,
    selectedBorder,
    clothes,
    hats,
    borders,
    setCamera,
    setClothes,
    setHat,
    setBorder
  }
}) 