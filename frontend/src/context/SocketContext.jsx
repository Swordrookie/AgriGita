import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

// Detect if running inside a Capacitor native APK
const isNative = () => !!(window.Capacitor?.isNativePlatform?.())

let notifId = 1

const sendNotification = async (title, body) => {
  if (isNative()) {
    // ✅ NATIVE ANDROID: Real system notification via Capacitor
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.requestPermissions()
      await LocalNotifications.schedule({
        notifications: [{
          id: notifId++,
          title,
          body,
          smallIcon: 'ic_launcher',
          sound: 'default',
        }]
      })
    } catch (e) { console.warn('LocalNotification error:', e) }
  } else {
    // Fallback: browser Notification API for desktop testing
    if ('Notification' in window) {
      if (Notification.permission === 'default') await Notification.requestPermission()
      if (Notification.permission === 'granted') {
        const n = new Notification(title, { body, icon: '/logo.png' })
        n.onclick = () => { window.focus(); n.close() }
      }
    }
  }
}


const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setConnected(false)
      }
      return
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || '/'
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    s.on('connect', () => {
      setConnected(true)
      s.emit('join', { user_id: user.id })
    })

    s.on('new_alert', (data) => {
      const { alert } = data;
      if (!alert) return;

      const title = alert.severity === 'critical' ? '🚨 AgriGita Critical Alert'
                  : alert.severity === 'warning'  ? '⚠️ AgriGita Warning'
                  : 'ℹ️ AgriGita Notification'
      // Fire native Android OR browser notification
      sendNotification(title, alert.message)

      if (alert.severity === 'critical') {
        toast.error(alert.message || 'Critical system failure!', { duration: 6000 });
      } else if (alert.severity === 'warning') {
        toast.error(alert.message, {
          icon: '⚠️',
          duration: 5000,
          style: { border: '1px solid orange', color: 'orange' }
        });
      } else {
        toast.success(alert.message, { icon: 'ℹ️', duration: 4000 });
      }
    })

    s.on('disconnect', () => setConnected(false))

    setSocket(s)
    return () => {
      s.disconnect()
    }
  }, [user?.id])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
