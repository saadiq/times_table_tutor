import { useEffect, useRef, useState, type RefObject } from 'react'
import p5 from 'p5'
import type { SketchParams, SceneElements } from './types'
import { generateScene, drawScene } from './scene'

type UseP5Result = {
  isReady: boolean
  error: Error | null
}

export function useP5(
  containerRef: RefObject<HTMLDivElement | null>,
  params: SketchParams
): UseP5Result {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const p5InstanceRef = useRef<p5 | null>(null)
  const paramsRef = useRef<SketchParams>(params)
  const elementsRef = useRef<SceneElements | null>(null)

  // Keep params ref updated
  useEffect(() => {
    paramsRef.current = params
  }, [params])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    try {
      const sketch = (p: p5) => {
        p.setup = () => {
          const { width, height } = paramsRef.current
          p.createCanvas(width, height)
          p.colorMode(p.HSB, 360, 100, 100, 1)
          p.noStroke()
          p.frameRate(30)

          elementsRef.current = generateScene(width, height)
          setIsReady(true)
        }

        p.draw = () => {
          if (!elementsRef.current) return
          drawScene(p, elementsRef.current, paramsRef.current)
        }
      }

      p5InstanceRef.current = new p5(sketch, container)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize p5'))
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove()
        p5InstanceRef.current = null
      }
    }
  }, [containerRef])

  // Handle resize
  useEffect(() => {
    const p5Instance = p5InstanceRef.current
    if (!p5Instance || !isReady) return

    const { width, height } = params
    if (p5Instance.width !== width || p5Instance.height !== height) {
      p5Instance.resizeCanvas(width, height)
      elementsRef.current = generateScene(width, height)
    }
  }, [params.width, params.height, isReady])

  return { isReady, error }
}
