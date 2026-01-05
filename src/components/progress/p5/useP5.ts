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

    let mounted = true

    const sketch = (p: p5) => {
      p.setup = () => {
        const { width, height } = paramsRef.current
        p.createCanvas(width, height)
        p.colorMode(p.HSB, 360, 100, 100, 1)
        p.noStroke()
        p.frameRate(30)

        elementsRef.current = generateScene(width, height)
        if (mounted) setIsReady(true)
      }

      p.draw = () => {
        if (!elementsRef.current) return
        drawScene(p, elementsRef.current, paramsRef.current)
      }
    }

    // Defer p5 instantiation to next tick to avoid setState in effect body
    const timeoutId = setTimeout(() => {
      if (!mounted) return
      try {
        p5InstanceRef.current = new p5(sketch, container)
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize p5'))
        }
      }
    }, 0)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove()
        p5InstanceRef.current = null
      }
    }
  }, [containerRef])

  // Handle resize - we intentionally depend only on width/height, not the entire params object
  useEffect(() => {
    const p5Instance = p5InstanceRef.current
    if (!p5Instance || !isReady) return

    const { width, height } = params
    if (p5Instance.width !== width || p5Instance.height !== height) {
      p5Instance.resizeCanvas(width, height)
      elementsRef.current = generateScene(width, height)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.width, params.height, isReady])

  return { isReady, error }
}
