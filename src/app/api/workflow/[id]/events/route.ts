import { auth } from '@clerk/nextjs/server'
import { sseSubscribe } from '@/lib/sse-broadcast'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const { id: workflowId } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // stream already closed
        }
      }

      send(': connected\n\n')

      const unsub = sseSubscribe(workflowId, (event, data) => {
        send(`event: ${event}\ndata: ${data}\n\n`)
      })

      const ping = setInterval(() => send(': ping\n\n'), 25_000)

      req.signal.addEventListener('abort', () => {
        clearInterval(ping)
        unsub()
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}
