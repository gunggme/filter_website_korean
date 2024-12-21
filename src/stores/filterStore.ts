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
  const selectedBorder = ref(1)
  const selectedCharacter = ref(0)  // 캐릭터 선택 상태 추가

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

  // 캐릭터 정보
  const characters = ref([
    { id: 1, name: '캐릭터', type: 'basic' }
  ])

  const setCamera = (camera: CameraInfo) => {
    selectedCamera.value = camera
  }

  const setClothes = (clothesId: number) => {
    // 캐릭터가 선택되어 있으면 옷 선택 불가
    if (selectedCharacter.value !== 0) return
    selectedClothes.value = clothesId
  }

  const setHat = (hatId: number) => {
    // 캐릭터가 선택되어 있으면 모자 선택 불가
    if (selectedCharacter.value !== 0) return
    selectedHat.value = hatId
  }

  const setBorder = (borderId: number) => {
    selectedBorder.value = borderId
  }

  const setCharacter = (characterId: number) => {
    selectedCharacter.value = characterId
    // 캐릭터 선택 시 옷과 모자 선택 해제
    if (characterId !== 0) {
      selectedClothes.value = 0
      selectedHat.value = 0
    }
  }

  return {
    selectedCamera,
    selectedClothes,
    selectedHat,
    selectedBorder,
    selectedCharacter,
    clothes,
    hats,
    borders,
    characters,
    setCamera,
    setClothes,
    setHat,
    setBorder,
    setCharacter
  }
}) 