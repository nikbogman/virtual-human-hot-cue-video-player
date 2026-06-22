import { useEffect, useRef } from 'react';
import type { ChildToParentMessage, ParentToChildMessage } from './types';

type MessageHandler<T extends ParentToChildMessage['type']> = (
  message: Extract<ParentToChildMessage, { type: T }>
) => void;

export function useParentPageController() {
  const portRef = useRef<MessagePort | null>(null);
  const handlersRef = useRef<Partial<{ [T in ParentToChildMessage['type']]: MessageHandler<T> }>>({});

  const onMessage = <T extends ParentToChildMessage['type']>(type: T, handler: MessageHandler<T>) => {
    (handlersRef.current as any)[type] = handler;
  };

  useEffect(() => {
    const handleInitialHandshake = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data === 'PARENT_REFRESHED') {
        window.opener?.postMessage('CHILD_READY', window.location.origin);
        return;
      }

      if (event.data === 'INIT_PORT') {
        portRef.current = event.ports[0];

        portRef.current.onmessage = (e: MessageEvent<ParentToChildMessage>) => {
          const handler = (handlersRef.current as any)[e.data.type];
          handler?.(e.data);
        };

        portRef.current.postMessage({
          type: 'STATUS_UPDATE',
          payload: { status: 'Ready and Listening' },
        });
      }
    };

    window.addEventListener('message', handleInitialHandshake);

    // Signal to parent that React has mounted and the message listener is ready
    window.opener?.postMessage('CHILD_READY', window.location.origin);

    return () => {
      window.removeEventListener('message', handleInitialHandshake);
      portRef.current?.close();
    };
  }, []);

  const sendToParent = (message: ChildToParentMessage) => {
    portRef.current?.postMessage(message);
  };

  const reportStatus = (status: string) =>
    sendToParent({ type: 'STATUS_UPDATE', payload: { status } });

  return { reportStatus, sendToParent, onMessage };
}
