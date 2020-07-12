import { WebSocketCommand } from '.'

export interface Options {
  maxReconnectionDelay: number
  minReconnectionDelay: number
  connectionTimeout: number
}

const defaultOptions: Options = {
  maxReconnectionDelay: 10000,
  minReconnectionDelay: 1000,
  connectionTimeout: 4000
}

interface EventMap {
  message: CustomEvent<unknown>
  reconnect: Event
}
type TypedEventListener<T extends keyof EventMap> = (ev: EventMap[T]) => void

const wait = (ms: number) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

export default class AutoReconnectWebSocket {
  _ws?: WebSocket
  // SafariでEventTargetのコンストラクタ使えないのでDocumentFragmentで代用
  readonly eventTarget: EventTarget = document.createDocumentFragment()

  readonly url: string
  readonly protocols: string | string[] | undefined
  readonly options: Readonly<Options>

  sendQueue = new Map<WebSocketCommand, readonly string[]>()
  isInitialized = false
  reconnecting = false

  constructor(
    url: string,
    protocols: string | string[] | undefined,
    options: Readonly<Partial<Options>>
  ) {
    this.url = url
    this.protocols = protocols
    this.options = { ...options, ...defaultOptions }
  }

  get isOpen() {
    return this._ws?.readyState === WebSocket.OPEN
  }

  _sendCommand(commands: readonly [WebSocketCommand, ...string[]]) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this._ws!.send(commands.join(':'))
  }

  sendCommand(...commands: readonly [WebSocketCommand, ...string[]]) {
    this.sendQueue.set(commands[0], commands.slice(1))
    if (this.isOpen) {
      this._sendCommand(commands)
    }
  }

  _getDelay(count: number) {
    const { minReconnectionDelay, maxReconnectionDelay } = this.options
    return Math.min(minReconnectionDelay * 1.3 ** count, maxReconnectionDelay)
  }

  _setupWs() {
    return new Promise(resolve => {
      this._ws = new WebSocket(this.url, this.protocols)

      this._ws.addEventListener(
        'open',
        () => {
          resolve()
          if (this.isInitialized) {
            this.eventTarget.dispatchEvent(new Event('reconnect'))
          } else {
            this.isInitialized = true
          }

          this.sendQueue.forEach((args, command) => {
            this._sendCommand([command, ...args])
          })
        },
        { once: true }
      )
      this._ws.addEventListener(
        'error',
        () => {
          resolve()
        },
        { once: true }
      )

      this._ws.addEventListener('message', e => {
        this.eventTarget.dispatchEvent(
          new CustomEvent('message', { detail: e.data })
        )
      })

      this._ws.addEventListener(
        'close',
        () => {
          this.reconnect()
        },
        { once: true }
      )
    })
  }

  addEventListener<T extends keyof EventMap>(
    type: T,
    listener: TypedEventListener<T>,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.eventTarget.addEventListener(type, listener as EventListener, options)
  }
  removeEventListener<T extends keyof EventMap>(
    type: T,
    listener: TypedEventListener<T>,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.eventTarget.removeEventListener(
      type,
      listener as EventListener,
      options
    )
  }

  connect() {
    this._setupWs()
  }

  async reconnect() {
    if (this.reconnecting) return
    this.reconnecting = true

    let count = 1
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const delay = this._getDelay(count)
      await wait(delay)

      if (this.isOpen) break

      await this._setupWs()

      if (this.isOpen) break

      count++
    }

    this.reconnecting = false
  }
}
