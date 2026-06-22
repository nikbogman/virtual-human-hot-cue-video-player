import { useEffect, useRef, useState } from 'react';
import type { ChildToParentMessage, ParentToChildMessage } from './types';

type MessageHandler<T extends ChildToParentMessage['type']> = (
  message: Extract<ChildToParentMessage, { type: T }>
) => void;

const childPath = 'monitor'

export function useChildPageController() {
  const [popupStatus, setPopupStatus] = useState<string>('Closed');
  const portRef = useRef<MessagePort | null>(null);
  const popupRef = useRef<Window | null>(null);
  const handlersRef = useRef<Partial<{ [T in ChildToParentMessage['type']]: MessageHandler<T> }>>({});
  const onConnectedRef = useRef<(() => void) | null>(null);

  const onMessage = <T extends ChildToParentMessage['type']>(type: T, handler: MessageHandler<T>) => {
    (handlersRef.current as any)[type] = handler;
  };

  const onConnected = (fn: () => void) => {
    onConnectedRef.current = fn;
  };

  const openChildPage = () => {
    const channel = new MessageChannel();
    portRef.current = channel.port1;

    const popup = window.open(childPath, 'monitor', 'popup');
    popupRef.current = popup;
    setPopupStatus('Opening...');

    portRef.current.onmessage = (event: MessageEvent<ChildToParentMessage>) => {
      const message = event.data;
      if (message.type === 'STATUS_UPDATE') {
        setPopupStatus(`Child says: ${message.payload.status}`);
      }
      const handler = (handlersRef.current as any)[message.type];
      handler?.(message);
    };
  };

  const sendCommandToChild = (message: ParentToChildMessage) => {
    portRef.current?.postMessage(message);
  };

  const connectPort = (popup: Window) => {
    const channel = new MessageChannel();
    portRef.current = channel.port1;

    portRef.current.onmessage = (e: MessageEvent<ChildToParentMessage>) => {
      const message = e.data;
      if (message.type === 'STATUS_UPDATE') {
        setPopupStatus(`Child says: ${message.payload.status}`);
      }
      const handler = (handlersRef.current as any)[message.type];
      handler?.(message);
    };

    popup.postMessage('INIT_PORT', window.location.origin, [channel.port2]);
    setPopupStatus('Connected');
    onConnectedRef.current?.();
  };

  useEffect(() => {
    const handleChildReady = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data !== 'CHILD_READY') return;
      if (event.source !== popupRef.current || !popupRef.current) return;
      connectPort(popupRef.current);
    };

    window.addEventListener('message', handleChildReady);

    // On parent refresh, reconnect to the existing named popup without navigating it
    const existing = window.open('', 'monitor');
    if (existing && !existing.closed) {
      try {
        if (existing.location.href !== 'about:blank') {
          popupRef.current = existing;
          setPopupStatus('Opening...');
          existing.postMessage('PARENT_REFRESHED', window.location.origin);
        } else {
          existing.close();
        }
      } catch {
        existing.close();
      }
    }

    return () => {
      window.removeEventListener('message', handleChildReady);
      portRef.current?.close();
    };
  }, []);

  return { popupStatus, openChildPage, sendCommandToChild, onMessage, onConnected };
}
