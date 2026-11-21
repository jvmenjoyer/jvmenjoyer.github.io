import { Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Exercise } from '@/db/types'
import { cn } from '@/lib/cn'

interface ExerciseImageProps {
  exercise?: Exercise
  frame?: number
  autoPlay?: boolean
  className?: string
  alt?: string
}

export function ExerciseImage({
  exercise,
  frame = 0,
  autoPlay = false,
  className,
  alt,
}: ExerciseImageProps) {
  const images = exercise?.images?.length ? exercise.images : []
  const [index, setIndex] = useState(frame)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setIndex(frame)
    setFailed(false)
  }, [exercise?.id, frame])

  useEffect(() => {
    if (!autoPlay || images.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length)
    }, 1400)
    return () => window.clearInterval(timer)
  }, [autoPlay, images.length])

  if (!images.length || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-surface-3 to-surface-2 text-faint',
          className,
        )}
        aria-hidden="true"
      >
        <Dumbbell size={28} />
      </div>
    )
  }

  return (
    <img
      src={images[Math.min(index, images.length - 1)]}
      alt={alt ?? exercise?.nameRu ?? ''}
      className={cn('object-cover', className)}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
