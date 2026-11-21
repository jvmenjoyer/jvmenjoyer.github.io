import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { addCustomExercise } from '@/db/repo'
import type { Exercise } from '@/db/types'
import {
  EQUIPMENT_LABELS,
  GROUP_ORDER,
  LEVEL_LABELS,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from '@/lib/labels'
import { toast } from '@/store/toast'

interface CreateExerciseModalProps {
  open: boolean
  onClose: () => void
  onCreated: (exercise: Exercise) => void
  initialName?: string
}

export function CreateExerciseModal({
  open,
  onClose,
  onCreated,
  initialName = '',
}: CreateExerciseModalProps) {
  const [name, setName] = useState(initialName)
  const [group, setGroup] = useState<MuscleGroup>('chest')
  const [equipment, setEquipment] = useState('body only')
  const [level, setLevel] = useState('beginner')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast('Введите название упражнения', 'error')
      return
    }

    setSaving(true)
    try {
      const exercise = await addCustomExercise({
        nameRu: trimmed,
        group,
        equipment,
        level,
        category: 'strength',
        instructionsRu: instructions
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      })
      toast('Упражнение добавлено', 'success')
      setName('')
      setInstructions('')
      onCreated(exercise)
    } catch (error) {
      console.error(error)
      toast('Не удалось добавить упражнение', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Своё упражнение"
      description="Появится в базе с пометкой «своё». Картинка не обязательна."
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохраняем…' : 'Добавить'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Название">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Тяга к поясу"
            autoFocus
          />
        </Field>

        <Field label="Группа мышц">
          <Select value={group} onChange={(event) => setGroup(event.target.value as MuscleGroup)}>
            {GROUP_ORDER.map((key) => (
              <option key={key} value={key}>
                {MUSCLE_GROUPS[key]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Инвентарь">
            <Select value={equipment} onChange={(event) => setEquipment(event.target.value)}>
              {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Уровень">
            <Select value={level} onChange={(event) => setLevel(event.target.value)}>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Техника" hint="Каждый шаг с новой строки, необязательно">
          <Textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder={'Исходное положение…\nВыполните…'}
            rows={4}
          />
        </Field>
      </div>
    </Modal>
  )
}
